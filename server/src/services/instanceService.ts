import Docker from 'dockerode';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/database';

interface OSTemplate {
  id: string;
  name: string;
  image: string;
  ports: number[];
  environment: Record<string, string>;
  volumes: string[];
  accessUrl?: string;
}

interface Instance {
  id: string;
  userId: string;
  name: string;
  templateId: string;
  status: 'pending' | 'running' | 'stopped' | 'terminated';
  containerId?: string;
  containerName: string;
  createdAt: string;
  lastStarted?: string;
  accessUrl?: string;
  ports: number[];
  specs: {
    cpu: string;
    memory: string;
    storage: string;
  };
}

const OS_TEMPLATES: Record<string, OSTemplate> = {
  'ubuntu-desktop': {
    id: 'ubuntu-desktop',
    name: 'Ubuntu Desktop',
    image: 'dorowu/ubuntu-desktop-lxde-vnc:latest',
    ports: [3002],
    environment: {
      VNC_PASSWORD: 'osmanager',
      RESOLUTION: '1920x1080'
    },
    volumes: ['ubuntu_config:/home/ubuntu'],
    accessUrl: 'http://localhost:3002'
  },
  'alpine-desktop': {
    id: 'alpine-desktop',
    name: 'Alpine Linux',
    image: 'danielguerra/alpine-vnc:latest',
    ports: [3001],
    environment: {
      VNC_PASSWORD: 'osmanager',
      RESOLUTION: '1920x1080'
    },
    volumes: ['alpine_config:/home/alpine'],
    accessUrl: 'http://localhost:3001'
  },
  'debian-desktop': {
    id: 'debian-desktop',
    name: 'Debian Desktop',
    image: 'accetto/debian-vnc-xfce-g3:latest',
    ports: [3003],
    environment: {
      VNC_PW: 'osmanager',
      VNC_RESOLUTION: '1920x1080'
    },
    volumes: ['debian_config:/home/headless'],
    accessUrl: 'http://localhost:3003/vnc.html'
  },
  'tor-service': {
    id: 'tor-service',
    name: 'Tor Service',
    image: 'alpine:latest',
    ports: [9050, 9051],
    environment: {},
    volumes: []
  }
};

export class InstanceService {
  private docker: Docker;

  constructor() {
    this.docker = new Docker();
  }

  async createInstance(params: {
    userId: string;
    templateId: string;
    name: string;
    specs?: any;
    environment?: Record<string, string>;
  }): Promise<Instance> {
    const template = OS_TEMPLATES[params.templateId];
    if (!template) {
      throw new Error('Invalid template ID');
    }

    const instanceId = uuidv4();
    const containerName = `${params.templateId}-${instanceId.slice(0, 8)}`;
    
    const instance: Instance = {
      id: instanceId,
      userId: params.userId,
      name: params.name,
      templateId: params.templateId,
      status: 'pending',
      containerName,
      createdAt: new Date().toISOString(),
      accessUrl: template.accessUrl,
      ports: template.ports,
      specs: params.specs || {
        cpu: '2 vCPU',
        memory: '2 GB RAM',
        storage: '10 GB SSD'
      }
    };

    // Save to database
    await pool.query(
      `INSERT INTO instances (id, user_id, name, template_id, status, container_name, created_at, access_url, ports, specs)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        instance.id,
        instance.userId,
        instance.name,
        instance.templateId,
        instance.status,
        instance.containerName,
        instance.createdAt,
        instance.accessUrl,
        JSON.stringify(instance.ports),
        JSON.stringify(instance.specs)
      ]
    );

    // Start the container creation process
    this.createContainer(instance, template).catch(console.error);

    return instance;
  }

  private async findAvailablePorts(templatePorts: number[]): Promise<number[]> {
    const availablePorts: number[] = [];
    
    // Get all currently used ports
    const containers = await this.docker.listContainers({ all: true });
    const usedPorts = new Set<number>();
    
    containers.forEach(container => {
      container.Ports?.forEach(port => {
        if (port.PublicPort) {
          usedPorts.add(port.PublicPort);
        }
      });
    });
    
    for (const templatePort of templatePorts) {
      let port = templatePort;
      let isAvailable = false;
      
      // Try the original port first, then increment if needed
      while (!isAvailable && port < templatePort + 1000) {
        if (!usedPorts.has(port) && !availablePorts.includes(port)) {
          isAvailable = true;
          availablePorts.push(port);
          usedPorts.add(port); // Mark as used for next iteration
        } else {
          port++;
        }
      }
      
      if (!isAvailable) {
        throw new Error(`No available ports found starting from ${templatePort}`);
      }
    }
    
    return availablePorts;
  }

  private async checkExistingContainer(templateId: string): Promise<{ id: string; ports: number[] } | null> {
    try {
      // Check if there's already a container with the exact template name (from docker-compose)
      const containers = await this.docker.listContainers({ all: true });
      const existingContainer = containers.find(container => 
        container.Names?.some(name => {
          const cleanName = name.replace('/', ''); // Remove leading slash
          return cleanName === templateId || cleanName === `${templateId.replace('-desktop', '')}-desktop`;
        })
      );
      
      if (existingContainer) {
        console.log(`Found existing container for ${templateId}:`, existingContainer.Names);
        // Extract the actual ports being used
        const ports = existingContainer.Ports?.map(p => p.PublicPort).filter(p => p !== undefined) || [];
        return {
          id: existingContainer.Id,
          ports: ports as number[]
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error checking existing containers:', error);
      return null;
    }
  }

  private async createContainer(instance: Instance, template: OSTemplate): Promise<void> {
    try {
      // Update status to pending
      await this.updateInstanceStatus(instance.id, 'pending');

      // Check if there's already an existing container for this template
      const existingContainer = await this.checkExistingContainer(template.id);
      
      if (existingContainer) {
        console.log(`Using existing container for ${template.id}: ${existingContainer.id}`);
        
        // Check the actual status of the existing container
        let actualStatus = 'stopped';
        try {
          const container = this.docker.getContainer(existingContainer.id);
          const containerInfo = await container.inspect();
          actualStatus = containerInfo.State.Running ? 'running' : 'stopped';
        } catch (error) {
          console.error('Failed to inspect existing container:', error);
        }
        
        // Create access URL with actual ports
        let accessUrl = template.accessUrl;
        if (accessUrl && existingContainer.ports.length > 0) {
          accessUrl = accessUrl.replace(`:${template.ports[0]}`, `:${existingContainer.ports[0]}`);
        }
        
        // Update instance with existing container ID and actual status
        await pool.query(
          'UPDATE instances SET container_id = $1, status = $2, access_url = $3, ports = $4 WHERE id = $5',
          [existingContainer.id, actualStatus, accessUrl, JSON.stringify(existingContainer.ports), instance.id]
        );

        // Emit status change event
        if (global.io) {
          global.io.emit('instance-status-changed', { instanceId: instance.id, status: actualStatus });
        }
        
        return;
      }

      // Find available ports
      const availablePorts = await this.findAvailablePorts(template.ports);
      
      // Create port bindings with available ports
      const portBindings: Record<string, any> = {};
      const exposedPorts: Record<string, any> = {};

      template.ports.forEach((originalPort, index) => {
        const availablePort = availablePorts[index];
        const containerPort = `${originalPort}/tcp`;
        exposedPorts[containerPort] = {};
        portBindings[containerPort] = [{ HostPort: availablePort.toString() }];
      });

      // Update access URL with new port
      let accessUrl = template.accessUrl;
      if (accessUrl && availablePorts[0] !== template.ports[0]) {
        accessUrl = accessUrl.replace(`:${template.ports[0]}`, `:${availablePorts[0]}`);
      }

      // Create container
      const container = await this.docker.createContainer({
        Image: template.image,
        name: instance.containerName,
        Env: Object.entries(template.environment).map(([key, value]) => `${key}=${value}`),
        ExposedPorts: exposedPorts,
        HostConfig: {
          PortBindings: portBindings,
          Binds: template.volumes,
          RestartPolicy: { Name: 'unless-stopped' }
        },
        Tty: true,
        OpenStdin: true
      });

      // Update instance with container ID and actual ports used
      await pool.query(
        'UPDATE instances SET container_id = $1, status = $2, access_url = $3, ports = $4 WHERE id = $5',
        [container.id, 'stopped', accessUrl, JSON.stringify(availablePorts), instance.id]
      );

      // Emit status change event
      if (global.io) {
        global.io.emit('instance-status-changed', { instanceId: instance.id, status: 'stopped' });
      }

    } catch (error) {
      console.error('Failed to create container:', error);
      await this.updateInstanceStatus(instance.id, 'terminated');
      
      if (global.io) {
        global.io.emit('instance-status-changed', { instanceId: instance.id, status: 'terminated' });
      }
    }
  }

  async getUserInstances(userId: string): Promise<Instance[]> {
    const result = await pool.query(
      'SELECT * FROM instances WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      templateId: row.template_id,
      status: row.status,
      containerId: row.container_id,
      containerName: row.container_name,
      createdAt: row.created_at,
      lastStarted: row.last_started,
      accessUrl: row.access_url,
      ports: row.ports ? (typeof row.ports === 'string' ? JSON.parse(row.ports) : row.ports) : [],
      specs: row.specs ? (typeof row.specs === 'string' ? JSON.parse(row.specs) : row.specs) : { cpu: '2 vCPU', memory: '2 GB RAM', storage: '10 GB SSD' }
    }));
  }

  async getInstance(instanceId: string, userId: string): Promise<Instance | null> {
    const result = await pool.query(
      'SELECT * FROM instances WHERE id = $1 AND user_id = $2',
      [instanceId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      templateId: row.template_id,
      status: row.status,
      containerId: row.container_id,
      containerName: row.container_name,
      createdAt: row.created_at,
      lastStarted: row.last_started,
      accessUrl: row.access_url,
      ports: row.ports ? (typeof row.ports === 'string' ? JSON.parse(row.ports) : row.ports) : [],
      specs: row.specs ? (typeof row.specs === 'string' ? JSON.parse(row.specs) : row.specs) : { cpu: '2 vCPU', memory: '2 GB RAM', storage: '10 GB SSD' }
    };
  }

  async startInstance(instanceId: string, userId: string): Promise<void> {
    const instance = await this.getInstance(instanceId, userId);
    if (!instance || !instance.containerId) {
      throw new Error('Instance not found or not ready');
    }

    try {
      const container = this.docker.getContainer(instance.containerId);
      
      // Check current container state
      const containerInfo = await container.inspect();
      
      if (containerInfo.State.Running) {
        console.log(`Container ${instance.containerId} is already running`);
        // Update database status to match actual state
        await pool.query(
          'UPDATE instances SET status = $1, last_started = $2 WHERE id = $3',
          ['running', new Date().toISOString(), instanceId]
        );
      } else {
        // Container is not running, start it
        await container.start();
        await pool.query(
          'UPDATE instances SET status = $1, last_started = $2 WHERE id = $3',
          ['running', new Date().toISOString(), instanceId]
        );
        console.log(`Started container ${instance.containerId}`);
      }

      if (global.io) {
        global.io.emit('instance-status-changed', { instanceId, status: 'running' });
      }
    } catch (error: any) {
      console.error('Failed to start instance:', error);
      
      // Handle specific Docker errors
      if (error.statusCode === 304) {
        // Container already started - this is not really an error
        console.log(`Container ${instance.containerId} was already running`);
        await pool.query(
          'UPDATE instances SET status = $1, last_started = $2 WHERE id = $3',
          ['running', new Date().toISOString(), instanceId]
        );
        
        if (global.io) {
          global.io.emit('instance-status-changed', { instanceId, status: 'running' });
        }
      } else if (error.statusCode === 404) {
        // Container not found
        await this.updateInstanceStatus(instanceId, 'terminated');
        throw new Error('Container no longer exists');
      } else {
        throw error;
      }
    }
  }

  async stopInstance(instanceId: string, userId: string): Promise<void> {
    const instance = await this.getInstance(instanceId, userId);
    if (!instance || !instance.containerId) {
      throw new Error('Instance not found or not ready');
    }

    try {
      const container = this.docker.getContainer(instance.containerId);
      
      // Check current container state
      const containerInfo = await container.inspect();
      
      if (!containerInfo.State.Running) {
        console.log(`Container ${instance.containerId} is already stopped`);
        // Update database status to match actual state
        await this.updateInstanceStatus(instanceId, 'stopped');
      } else {
        // Container is running, stop it
        await container.stop();
        await this.updateInstanceStatus(instanceId, 'stopped');
        console.log(`Stopped container ${instance.containerId}`);
      }

      if (global.io) {
        global.io.emit('instance-status-changed', { instanceId, status: 'stopped' });
      }
    } catch (error: any) {
      console.error('Failed to stop instance:', error);
      
      // Handle specific Docker errors
      if (error.statusCode === 304) {
        // Container already stopped
        console.log(`Container ${instance.containerId} was already stopped`);
        await this.updateInstanceStatus(instanceId, 'stopped');
        
        if (global.io) {
          global.io.emit('instance-status-changed', { instanceId, status: 'stopped' });
        }
      } else if (error.statusCode === 404) {
        // Container not found
        await this.updateInstanceStatus(instanceId, 'terminated');
        throw new Error('Container no longer exists');
      } else {
        throw error;
      }
    }
  }

  async restartInstance(instanceId: string, userId: string): Promise<void> {
    const instance = await this.getInstance(instanceId, userId);
    if (!instance || !instance.containerId) {
      throw new Error('Instance not found or not ready');
    }

    try {
      const container = this.docker.getContainer(instance.containerId);
      
      // Check if container exists first
      await container.inspect();
      
      // Restart the container
      await container.restart();
      
      await pool.query(
        'UPDATE instances SET status = $1, last_started = $2 WHERE id = $3',
        ['running', new Date().toISOString(), instanceId]
      );

      console.log(`Restarted container ${instance.containerId}`);

      if (global.io) {
        global.io.emit('instance-status-changed', { instanceId, status: 'running' });
      }
    } catch (error: any) {
      console.error('Failed to restart instance:', error);
      
      if (error.statusCode === 404) {
        // Container not found
        await this.updateInstanceStatus(instanceId, 'terminated');
        throw new Error('Container no longer exists');
      } else {
        throw error;
      }
    }
  }

  async terminateInstance(instanceId: string, userId: string): Promise<void> {
    const instance = await this.getInstance(instanceId, userId);
    if (!instance) {
      throw new Error('Instance not found');
    }

    if (instance.containerId) {
      try {
        const container = this.docker.getContainer(instance.containerId);
        
        // Check if container exists first
        try {
          await container.inspect();
          // Container exists, remove it
          await container.remove({ force: true });
          console.log(`Removed container ${instance.containerId}`);
        } catch (inspectError: any) {
          if (inspectError.statusCode === 404) {
            console.log(`Container ${instance.containerId} already removed or doesn't exist`);
          } else {
            throw inspectError;
          }
        }
      } catch (error: any) {
        console.error('Failed to remove container:', error);
        
        // Don't throw error if container doesn't exist
        if (error.statusCode !== 404) {
          throw error;
        }
      }
    }
    
    await this.updateInstanceStatus(instanceId, 'terminated');

    if (global.io) {
      global.io.emit('instance-status-changed', { instanceId, status: 'terminated' });
    }
  }

  private async updateInstanceStatus(instanceId: string, status: string): Promise<void> {
    await pool.query(
      'UPDATE instances SET status = $1 WHERE id = $2',
      [status, instanceId]
    );
  }

  async syncInstanceStatus(instanceId: string): Promise<void> {
    try {
      const result = await pool.query(
        'SELECT container_id FROM instances WHERE id = $1',
        [instanceId]
      );

      if (result.rows.length === 0 || !result.rows[0].container_id) {
        return;
      }

      const containerId = result.rows[0].container_id;
      const container = this.docker.getContainer(containerId);

      try {
        const containerInfo = await container.inspect();
        const actualStatus = containerInfo.State.Running ? 'running' : 'stopped';
        
        await pool.query(
          'UPDATE instances SET status = $1 WHERE id = $2',
          [actualStatus, instanceId]
        );

        console.log(`Synced instance ${instanceId} status to ${actualStatus}`);
      } catch (error: any) {
        if (error.statusCode === 404) {
          // Container doesn't exist, mark as terminated
          await pool.query(
            'UPDATE instances SET status = $1 WHERE id = $2',
            ['terminated', instanceId]
          );
          console.log(`Marked instance ${instanceId} as terminated (container not found)`);
        }
      }
    } catch (error) {
      console.error('Failed to sync instance status:', error);
    }
  }

  async createDefaultInstances(userId: string): Promise<Instance[]> {
    const instances: Instance[] = [];
    
    for (const [templateId, template] of Object.entries(OS_TEMPLATES)) {
      try {
        // Check if user already has an instance of this template
        const existingResult = await pool.query(
          'SELECT id FROM instances WHERE user_id = $1 AND template_id = $2 LIMIT 1',
          [userId, templateId]
        );

        if (existingResult.rows.length === 0) {
          console.log(`Creating instance for ${templateId}...`);
          
          // Create instance for this template
          const instance = await this.createInstance({
            userId,
            templateId,
            name: `${template.name} Instance`,
            specs: {
              cpu: templateId === 'alpine-desktop' ? '1 vCPU' : templateId === 'tor-service' ? '1 vCPU' : '2 vCPU',
              memory: templateId === 'alpine-desktop' ? '512 MB RAM' : templateId === 'tor-service' ? '256 MB RAM' : '2 GB RAM',
              storage: templateId === 'alpine-desktop' ? '2 GB SSD' : templateId === 'tor-service' ? '1 GB SSD' : '10 GB SSD'
            }
          });
          instances.push(instance);
          
          console.log(`✅ Created instance for ${templateId}: ${instance.id}`);
        } else {
          console.log(`Instance for ${templateId} already exists for user ${userId}`);
        }
      } catch (error) {
        console.error(`❌ Failed to create default instance for ${templateId}:`, error);
      }
    }

    console.log(`Created ${instances.length} new instances for user ${userId}`);
    return instances;
  }
}