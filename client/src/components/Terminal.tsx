import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { useSocket } from '../contexts/SocketContext';
import '@xterm/xterm/css/xterm.css';
import './Terminal.css';

interface TerminalProps {
  containerId: string;
  containerName: string;
  onClose: () => void;
}

export function Terminal({ containerId, containerName, onClose }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId] = useState(() => `terminal-${Date.now()}-${Math.random()}`);
  const { socket } = useSocket();

  useEffect(() => {
    if (!terminalRef.current || !socket) return;

    // Create terminal instance
    const terminal = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      theme: {
        background: '#1a1a1a',
        foreground: '#ffffff',
        cursor: '#ffffff',
        selectionBackground: '#3e3e3e',
        black: '#000000',
        red: '#e06c75',
        green: '#98c379',
        yellow: '#d19a66',
        blue: '#61afef',
        magenta: '#c678dd',
        cyan: '#56b6c2',
        white: '#abb2bf',
        brightBlack: '#5c6370',
        brightRed: '#e06c75',
        brightGreen: '#98c379',
        brightYellow: '#d19a66',
        brightBlue: '#61afef',
        brightMagenta: '#c678dd',
        brightCyan: '#56b6c2',
        brightWhite: '#ffffff'
      }
    });

    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    // Open terminal
    terminal.open(terminalRef.current);
    fitAddon.fit();

    // Store references
    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Handle terminal input
    terminal.onData((data) => {
      if (socket && isConnected) {
        socket.emit('terminal-input', { sessionId, input: data });
      }
    });

    // Handle resize
    terminal.onResize(({ cols, rows }) => {
      if (socket && isConnected) {
        socket.emit('terminal-resize', { sessionId, cols, rows });
      }
    });

    // Socket event listeners
    const handleTerminalReady = (data: { sessionId: string }) => {
      if (data.sessionId === sessionId) {
        setIsConnected(true);
        terminal.writeln('\x1b[32mTerminal connected to ' + containerName + '\x1b[0m');
        terminal.writeln('Type commands and press Enter...\r\n');
      }
    };

    const handleTerminalOutput = (data: { sessionId: string; data: string }) => {
      if (data.sessionId === sessionId) {
        terminal.write(data.data);
      }
    };

    const handleTerminalError = (data: { sessionId: string; error: string }) => {
      if (data.sessionId === sessionId) {
        terminal.writeln('\x1b[31mError: ' + data.error + '\x1b[0m');
        setIsConnected(false);
      }
    };

    const handleTerminalClosed = (data: { sessionId: string }) => {
      if (data.sessionId === sessionId) {
        terminal.writeln('\x1b[33mTerminal session closed\x1b[0m');
        setIsConnected(false);
      }
    };

    socket.on('terminal-ready', handleTerminalReady);
    socket.on('terminal-output', handleTerminalOutput);
    socket.on('terminal-error', handleTerminalError);
    socket.on('terminal-closed', handleTerminalClosed);

    // Create terminal session
    socket.emit('create-terminal', { containerId, sessionId });

    // Handle window resize
    const handleResize = () => {
      if (fitAddon) {
        fitAddon.fit();
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      socket.off('terminal-ready', handleTerminalReady);
      socket.off('terminal-output', handleTerminalOutput);
      socket.off('terminal-error', handleTerminalError);
      socket.off('terminal-closed', handleTerminalClosed);
      
      if (socket && isConnected) {
        socket.emit('close-terminal', { sessionId });
      }
      
      if (terminal) {
        terminal.dispose();
      }
    };
  }, [socket, containerId, containerName, sessionId, isConnected]);

  // Fit terminal when container size changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden shadow-2xl">
      <div className="bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <span className="text-gray-300 text-sm font-medium">
            Terminal - {containerName}
          </span>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div 
        ref={terminalRef} 
        className="h-96 p-2"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
}