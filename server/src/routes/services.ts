import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { authMiddleware } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();
const execAsync = promisify(exec);

router.use(authMiddleware);

interface PrebuiltService {
  id: string;
  name: string;
  description: string;
  category: string;
  ports: number[];
  accessUrl?: string;
  containerName: string;
}

const prebuiltServices: PrebuiltService[] = [
  {
    id: 'ubuntu-desktop',
    name: 'Ubuntu Linux',
    description: 'Ubuntu Desktop with LXDE via browser',
    category: 'Linux OS',
    ports: [3002],
    accessUrl: 'http://localhost:3002',
    containerName: 'ubuntu-desktop'
  },
  {
    id: 'alpine-desktop',
    name: 'Alpine Linux',
    description: 'Lightweight Alpine Linux Desktop',
    category: 'Linux OS',
    ports: [3001],
    accessUrl: 'http://localhost:3001',
    containerName: 'alpine-desktop'
  },
  {
    id: 'debian-desktop',
    name: 'Debian Linux',
    description: 'Debian Desktop with XFCE',
    category: 'Linux OS',
    ports: [3003],
    accessUrl: 'http://localhost:3003/vnc.html',
    containerName: 'debian-desktop'
  },
  {
    id: 'tor-service',
    name: 'Tor Service',
    description: 'Anonymous browsing proxy service',
    category: 'Network Service',
    ports: [9050, 9051],
    containerName: 'tor-service'
  }
];

// Get all prebuilt services
router.get('/', async (req: AuthRequest, res) => {
  try {
    // Check status of each service
    const servicesWithStatus = await Promise.all(
      prebuiltServices.map(async (service) => {
        try {
          const { stdout } = await execAsync(`docker ps --filter "name=${service.containerName}" --format "{{.Status}}"`);
          const isRunning = stdout.trim().includes('Up');
          return {
            ...service,
            status: isRunning ? 'running' : 'stopped'
          };
        } catch (error) {
          return {
            ...service,
            status: 'stopped'
          };
        }
      })
    );

    res.json(servicesWithStatus);
  } catch (error) {
    console.error('Failed to get services:', error);
    res.status(500).json({ error: 'Failed to get services' });
  }
});

// Start a prebuilt service
router.post('/:serviceId/start', async (req: AuthRequest, res) => {
  try {
    const { serviceId } = req.params;
    const service = prebuiltServices.find(s => s.id === serviceId);

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Start the service using docker-compose
    await execAsync(`docker-compose up -d ${serviceId}`);

    // Emit real-time update
    if (global.io) {
      global.io.emit('service-status-changed', {
        serviceId,
        status: 'starting',
        message: `${service.name} is starting...`
      });
    }

    res.json({ message: `${service.name} started successfully` });
  } catch (error) {
    console.error('Failed to start service:', error);
    res.status(500).json({ error: 'Failed to start service' });
  }
});

// Stop a prebuilt service
router.post('/:serviceId/stop', async (req: AuthRequest, res) => {
  try {
    const { serviceId } = req.params;
    const service = prebuiltServices.find(s => s.id === serviceId);

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Stop the service using docker-compose
    await execAsync(`docker-compose stop ${serviceId}`);

    // Emit real-time update
    if (global.io) {
      global.io.emit('service-status-changed', {
        serviceId,
        status: 'stopped',
        message: `${service.name} stopped successfully`
      });
    }

    res.json({ message: `${service.name} stopped successfully` });
  } catch (error) {
    console.error('Failed to stop service:', error);
    res.status(500).json({ error: 'Failed to stop service' });
  }
});

// Restart a prebuilt service
router.post('/:serviceId/restart', async (req: AuthRequest, res) => {
  try {
    const { serviceId } = req.params;
    const service = prebuiltServices.find(s => s.id === serviceId);

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Restart the service using docker-compose
    await execAsync(`docker-compose restart ${serviceId}`);

    res.json({ message: `${service.name} restarted successfully` });
  } catch (error) {
    console.error('Failed to restart service:', error);
    res.status(500).json({ error: 'Failed to restart service' });
  }
});

export { router as serviceRoutes };