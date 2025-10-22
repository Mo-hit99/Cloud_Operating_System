import { Router } from 'express';
import Docker from 'dockerode';
import { pool } from '../config/database';
import { authMiddleware } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM containers WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user!.id]
    );

    // Get real-time status from Docker for each container
    const containersWithStatus = await Promise.all(
      result.rows.map(async (containerRecord) => {
        try {
          const container = docker.getContainer(containerRecord.container_id);
          const containerInfo = await container.inspect();
          
          const realStatus = containerInfo.State.Running ? 'running' : 'stopped';
          
          // Update database if status differs
          if (realStatus !== containerRecord.status) {
            await pool.query(
              'UPDATE containers SET status = $1 WHERE id = $2',
              [realStatus, containerRecord.id]
            );
            containerRecord.status = realStatus;
          }

          return {
            ...containerRecord,
            docker_status: containerInfo.State.Status,
            docker_info: {
              created: containerInfo.Created,
              started_at: containerInfo.State.StartedAt,
              finished_at: containerInfo.State.FinishedAt,
              ports: containerInfo.NetworkSettings.Ports
            }
          };
        } catch (error: any) {
          // Container doesn't exist in Docker anymore
          if (error.statusCode === 404) {
            await pool.query(
              'UPDATE containers SET status = $1 WHERE id = $2',
              ['deleted', containerRecord.id]
            );
            return {
              ...containerRecord,
              status: 'deleted',
              docker_status: 'not_found'
            };
          }
          return containerRecord;
        }
      })
    );

    res.json(containersWithStatus);
  } catch (error) {
    console.error('Failed to fetch containers:', error);
    res.status(500).json({ error: 'Failed to fetch containers' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { name, osType, image, ports = {}, volumes = {} } = req.body;

    if (!name || !image) {
      return res.status(400).json({ error: 'Name and image are required' });
    }

    const containerName = `${req.user!.username}_${name}_${Date.now()}`;

    console.log(`Creating container: ${containerName} with image: ${image}`);

    // First, try to pull the image if it doesn't exist
    try {
      await docker.pull(image);
      console.log(`Successfully pulled image: ${image}`);
    } catch (pullError) {
      console.log(`Image ${image} might already exist locally, continuing...`);
    }

    // Prepare port bindings
    const exposedPorts: any = {};
    const portBindings: any = {};

    Object.entries(ports).forEach(([containerPort, hostPort]) => {
      const portKey = `${containerPort}/tcp`;
      exposedPorts[portKey] = {};
      portBindings[portKey] = [{ HostPort: hostPort as string }];
    });

    // Prepare volume bindings
    const binds = Object.entries(volumes).map(([hostPath, containerPath]) => 
      `${hostPath}:${containerPath}`
    );

    // Create Docker container with proper configuration
    const containerConfig = {
      Image: image,
      name: containerName,
      ExposedPorts: exposedPorts,
      Env: ['DEBIAN_FRONTEND=noninteractive'],
      Cmd: osType === 'ubuntu' || osType === 'debian' ? ['/bin/bash', '-c', 'while true; do sleep 30; done'] : 
           osType === 'alpine' ? ['/bin/sh', '-c', 'while true; do sleep 30; done'] : 
           undefined,
      HostConfig: {
        PortBindings: portBindings,
        Binds: binds,
        RestartPolicy: { Name: 'unless-stopped' },
        NetworkMode: 'bridge'
      },
      NetworkingConfig: {
        EndpointsConfig: {}
      }
    };

    console.log('Container config:', JSON.stringify(containerConfig, null, 2));

    const container = await docker.createContainer(containerConfig);
    console.log(`Container created with ID: ${container.id}`);

    // Save to database
    const result = await pool.query(
      `INSERT INTO containers (user_id, container_id, name, os_type, image, status, ports, volumes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.user!.id, container.id, name, osType, image, 'created', JSON.stringify(ports), JSON.stringify(volumes)]
    );

    // Emit real-time update
    if (global.io) {
      global.io.emit('container-created', {
        container: result.rows[0],
        message: `Container ${name} created successfully`
      });
    }

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Container creation failed:', error);
    res.status(500).json({ 
      error: 'Failed to create container',
      details: error.message || 'Unknown error'
    });
  }
});

router.post('/:id/start', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT container_id, name FROM containers WHERE id = $1 AND user_id = $2',
      [id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Container not found' });
    }

    const containerData = result.rows[0];
    const container = docker.getContainer(containerData.container_id);
    
    // Check if container exists
    try {
      await container.inspect();
    } catch (error: any) {
      if (error.statusCode === 404) {
        return res.status(404).json({ error: 'Container no longer exists in Docker' });
      }
      throw error;
    }

    await container.start();
    console.log(`Container ${containerData.name} started successfully`);

    await pool.query(
      'UPDATE containers SET status = $1, last_accessed = CURRENT_TIMESTAMP WHERE id = $2',
      ['running', id]
    );

    // Emit real-time update
    if (global.io) {
      global.io.emit('container-status-changed', {
        containerId: id,
        status: 'running',
        message: `Container ${containerData.name} started successfully`
      });
    }

    res.json({ message: 'Container started successfully' });
  } catch (error: any) {
    console.error('Failed to start container:', error);
    res.status(500).json({ 
      error: 'Failed to start container',
      details: error.message || 'Unknown error'
    });
  }
});

router.post('/:id/stop', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT container_id, name FROM containers WHERE id = $1 AND user_id = $2',
      [id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Container not found' });
    }

    const containerData = result.rows[0];
    const container = docker.getContainer(containerData.container_id);
    
    try {
      await container.stop();
      console.log(`Container ${containerData.name} stopped successfully`);
    } catch (error: any) {
      if (error.statusCode === 304) {
        // Container already stopped
        console.log(`Container ${containerData.name} was already stopped`);
      } else {
        throw error;
      }
    }

    await pool.query(
      'UPDATE containers SET status = $1 WHERE id = $2',
      ['stopped', id]
    );

    // Emit real-time update
    if (global.io) {
      global.io.emit('container-status-changed', {
        containerId: id,
        status: 'stopped',
        message: `Container ${containerData.name} stopped successfully`
      });
    }

    res.json({ message: 'Container stopped successfully' });
  } catch (error: any) {
    console.error('Failed to stop container:', error);
    res.status(500).json({ 
      error: 'Failed to stop container',
      details: error.message || 'Unknown error'
    });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT container_id, name FROM containers WHERE id = $1 AND user_id = $2',
      [id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Container not found' });
    }

    const containerData = result.rows[0];
    const container = docker.getContainer(containerData.container_id);
    
    try {
      await container.remove({ force: true });
      console.log(`Container ${containerData.name} removed successfully`);
    } catch (error: any) {
      if (error.statusCode === 404) {
        console.log(`Container ${containerData.name} was already removed from Docker`);
      } else {
        throw error;
      }
    }

    await pool.query('DELETE FROM containers WHERE id = $1', [id]);

    // Emit real-time update
    if (global.io) {
      global.io.emit('container-deleted', {
        containerId: id,
        message: `Container ${containerData.name} deleted successfully`
      });
    }

    res.json({ message: 'Container deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete container:', error);
    res.status(500).json({ 
      error: 'Failed to delete container',
      details: error.message || 'Unknown error'
    });
  }
});

// Get available images
router.get('/images', async (req: AuthRequest, res) => {
  try {
    const images = await docker.listImages();
    
    const availableImages = images
      .filter(image => image.RepoTags && image.RepoTags.length > 0)
      .map(image => ({
        id: image.Id,
        tags: image.RepoTags,
        created: image.Created,
        size: image.Size,
        virtual_size: image.VirtualSize
      }))
      .sort((a, b) => b.created - a.created);

    res.json(availableImages);
  } catch (error) {
    console.error('Failed to fetch images:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// Get container logs
router.get('/:id/logs', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { lines = 100 } = req.query;
    
    const result = await pool.query(
      'SELECT container_id, name FROM containers WHERE id = $1 AND user_id = $2',
      [id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Container not found' });
    }

    const container = docker.getContainer(result.rows[0].container_id);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail: parseInt(lines as string),
      timestamps: true
    });

    res.json({ logs: logs.toString() });
  } catch (error: any) {
    console.error('Failed to get container logs:', error);
    res.status(500).json({ 
      error: 'Failed to get container logs',
      details: error.message || 'Unknown error'
    });
  }
});

// Get container stats
router.get('/:id/stats', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT container_id, name FROM containers WHERE id = $1 AND user_id = $2',
      [id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Container not found' });
    }

    const container = docker.getContainer(result.rows[0].container_id);
    const stats = await container.stats({ stream: false });

    res.json({
      cpu_percent: calculateCPUPercent(stats),
      memory_usage: calculateMemoryUsage(stats),
      network_io: stats.networks,
      block_io: stats.blkio_stats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Failed to get container stats:', error);
    res.status(500).json({ 
      error: 'Failed to get container stats',
      details: error.message || 'Unknown error'
    });
  }
});

function calculateCPUPercent(stats: any): number {
  const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
  const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
  const numberCpus = stats.cpu_stats.online_cpus || 1;
  
  if (systemDelta > 0 && cpuDelta > 0) {
    return (cpuDelta / systemDelta) * numberCpus * 100;
  }
  return 0;
}

function calculateMemoryUsage(stats: any): { used: number; limit: number; percent: number } {
  const used = stats.memory_stats.usage || 0;
  const limit = stats.memory_stats.limit || 0;
  const percent = limit > 0 ? (used / limit) * 100 : 0;
  
  return { used, limit, percent };
}

export { router as containerRoutes };