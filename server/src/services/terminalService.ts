import { Server, Socket } from 'socket.io';
import Docker from 'dockerode';

interface TerminalSession {
  id: string;
  containerId: string;
  exec: Docker.Exec;
  stream: NodeJS.ReadWriteStream;
  socket: Socket;
}

export class TerminalService {
  private docker: Docker;
  private sessions: Map<string, TerminalSession> = new Map();

  constructor() {
    this.docker = new Docker();
  }

  async createTerminalSession(
    socket: Socket,
    containerId: string,
    sessionId: string
  ): Promise<void> {
    try {
      console.log(`🔍 Creating terminal session ${sessionId} for container ${containerId.substring(0, 12)}...`);
      
      // Check if container exists and is running
      const container = this.docker.getContainer(containerId);
      const containerInfo = await container.inspect();
      
      console.log(`📊 Container ${containerId.substring(0, 12)} status: ${containerInfo.State.Status}, running: ${containerInfo.State.Running}`);
      
      if (!containerInfo.State.Running) {
        console.log(`❌ Container ${containerId.substring(0, 12)} is not running`);
        socket.emit('terminal-error', { 
          sessionId, 
          error: 'Container is not running' 
        });
        return;
      }

      // Create exec instance for the container
      console.log(`🔧 Creating exec instance for container ${containerId.substring(0, 12)}...`);
      
      // Try different shells based on container type
      let shell = '/bin/bash';
      try {
        // Test if bash exists
        const testExec = await container.exec({
          Cmd: ['which', 'bash'],
          AttachStdout: true,
          AttachStderr: true
        });
        const testStream = await testExec.start({ hijack: false });
        let testOutput = '';
        testStream.on('data', (data: Buffer) => {
          testOutput += data.toString();
        });
        
        await new Promise((resolve) => {
          testStream.on('end', resolve);
        });
        
        if (!testOutput.includes('/bin/bash')) {
          console.log(`📝 Bash not found, using /bin/sh for container ${containerId.substring(0, 12)}`);
          shell = '/bin/sh';
        }
      } catch (error) {
        console.log(`📝 Using /bin/sh as fallback for container ${containerId.substring(0, 12)}`);
        shell = '/bin/sh';
      }
      
      const exec = await container.exec({
        Cmd: [shell],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
        Env: ['TERM=xterm-256color', 'COLUMNS=80', 'LINES=24']
      });

      console.log(`▶️ Starting exec instance...`);
      // Start the exec instance
      const stream = await exec.start({
        hijack: true,
        stdin: true,
        Tty: true
      }) as NodeJS.ReadWriteStream;

      // Store the session
      const session: TerminalSession = {
        id: sessionId,
        containerId,
        exec,
        stream,
        socket
      };

      this.sessions.set(sessionId, session);

      // Handle data from container
      stream.on('data', (data: Buffer) => {
        socket.emit('terminal-output', {
          sessionId,
          data: data.toString()
        });
      });

      // Handle stream end
      stream.on('end', () => {
        this.closeSession(sessionId);
        socket.emit('terminal-closed', { sessionId });
      });

      // Handle errors
      stream.on('error', (error: Error) => {
        socket.emit('terminal-error', {
          sessionId,
          error: error.message
        });
        this.closeSession(sessionId);
      });

      // Send ready signal
      console.log(`✅ Terminal session ${sessionId} ready for container ${containerId.substring(0, 12)}`);
      socket.emit('terminal-ready', { sessionId });

    } catch (error) {
      console.error(`❌ Failed to create terminal session ${sessionId}:`, error);
      socket.emit('terminal-error', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  writeToTerminal(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);
    if (session && session.stream) {
      session.stream.write(data);
    }
  }

  resizeTerminal(sessionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(sessionId);
    if (session && session.exec) {
      try {
        session.exec.resize({ h: rows, w: cols });
      } catch (error) {
        console.error('Error resizing terminal:', error);
      }
    }
  }

  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      try {
        if (session.stream) {
          session.stream.end();
          if ('destroy' in session.stream && typeof session.stream.destroy === 'function') {
            (session.stream as any).destroy();
          }
        }
      } catch (error) {
        console.error('Error closing terminal session:', error);
      }
      this.sessions.delete(sessionId);
    }
  }

  closeAllSessionsForSocket(socket: Socket): void {
    const sessionsToClose: string[] = [];
    
    this.sessions.forEach((session, sessionId) => {
      if (session.socket.id === socket.id) {
        sessionsToClose.push(sessionId);
      }
    });

    sessionsToClose.forEach(sessionId => {
      this.closeSession(sessionId);
    });
  }

  getActiveSessions(): string[] {
    return Array.from(this.sessions.keys());
  }
}