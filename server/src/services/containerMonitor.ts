import Docker from 'dockerode';
import { exec } from 'child_process';
import { promisify } from 'util';

const docker = new Docker();
const execAsync = promisify(exec);

interface ContainerStatus {
  id: string;
  name: string;
  status: string;
  state: string;
  ports: any[];
  created: string;
}

export class ContainerMonitor {
  private intervalId: NodeJS.Timeout | null = null;
  private io: any;
  private lastContainerStatuses: ContainerStatus[] = [];
  private lastServiceStatuses: Record<string, string> = {};

  constructor(io: any) {
    this.io = io;
  }

  start() {
    // Monitor every 10 seconds (reduced frequency)
    this.intervalId = setInterval(async () => {
      await this.checkContainerStatus();
    }, 10000);
    
    console.log('Container monitor started (10s interval)');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('Container monitor stopped');
  }

  private async checkContainerStatus() {
    try {
      const containers = await docker.listContainers({ all: true });
      
      const containerStatuses: ContainerStatus[] = containers.map(container => ({
        id: container.Id,
        name: container.Names[0]?.replace('/', '') || 'unknown',
        status: container.Status,
        state: container.State,
        ports: container.Ports,
        created: container.Created.toString()
      }));

      // Only emit if there are changes
      if (this.hasContainerStatusChanged(containerStatuses)) {
        console.log('📊 Container status changed, emitting update');
        this.io.emit('container-status-update', containerStatuses);
        this.lastContainerStatuses = containerStatuses;
      }

      // Check for specific services
      await this.checkServiceStatus();
    } catch (error) {
      console.error('Error monitoring containers:', error);
    }
  }

  private async checkServiceStatus() {
    const services = ['alpine-desktop', 'ubuntu-desktop', 'debian-desktop', 'tor-service'];
    
    for (const service of services) {
      try {
        const { stdout } = await execAsync(`docker ps --filter "name=${service}" --format "{{.Status}}"`);
        const isRunning = stdout.trim().includes('Up');
        const currentStatus = isRunning ? 'running' : 'stopped';
        
        // Only emit if status changed
        if (this.lastServiceStatuses[service] !== currentStatus) {
          console.log(`🔄 Service ${service} status changed: ${this.lastServiceStatuses[service]} -> ${currentStatus}`);
          this.io.emit('service-status-changed', {
            serviceId: service,
            status: currentStatus,
            timestamp: new Date().toISOString()
          });
          this.lastServiceStatuses[service] = currentStatus;
        }
      } catch (error) {
        // Service not found or error
        const currentStatus = 'stopped';
        if (this.lastServiceStatuses[service] !== currentStatus) {
          console.log(`🔄 Service ${service} status changed: ${this.lastServiceStatuses[service]} -> ${currentStatus} (error)`);
          this.io.emit('service-status-changed', {
            serviceId: service,
            status: currentStatus,
            timestamp: new Date().toISOString()
          });
          this.lastServiceStatuses[service] = currentStatus;
        }
      }
    }
  }

  async getContainerLogs(containerId: string, lines: number = 100) {
    try {
      const container = docker.getContainer(containerId);
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail: lines,
        timestamps: true
      });
      
      return logs.toString();
    } catch (error) {
      console.error('Error getting container logs:', error);
      throw error;
    }
  }

  async getContainerStats(containerId: string) {
    try {
      const container = docker.getContainer(containerId);
      const stats = await container.stats({ stream: false });
      
      return {
        cpu: this.calculateCPUPercent(stats),
        memory: this.calculateMemoryUsage(stats),
        network: stats.networks,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting container stats:', error);
      throw error;
    }
  }

  private calculateCPUPercent(stats: any): number {
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const numberCpus = stats.cpu_stats.online_cpus || 1;
    
    if (systemDelta > 0 && cpuDelta > 0) {
      return (cpuDelta / systemDelta) * numberCpus * 100;
    }
    return 0;
  }

  private calculateMemoryUsage(stats: any): { used: number; limit: number; percent: number } {
    const used = stats.memory_stats.usage || 0;
    const limit = stats.memory_stats.limit || 0;
    const percent = limit > 0 ? (used / limit) * 100 : 0;
    
    return { used, limit, percent };
  }

  private hasContainerStatusChanged(newStatuses: ContainerStatus[]): boolean {
    if (this.lastContainerStatuses.length !== newStatuses.length) {
      return true;
    }

    for (let i = 0; i < newStatuses.length; i++) {
      const newStatus = newStatuses[i];
      const oldStatus = this.lastContainerStatuses.find(s => s.id === newStatus.id);
      
      if (!oldStatus || 
          oldStatus.status !== newStatus.status || 
          oldStatus.state !== newStatus.state) {
        return true;
      }
    }

    return false;
  }
}