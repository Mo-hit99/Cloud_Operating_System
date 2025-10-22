import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { InstanceService } from '../services/instanceService';

const router = Router();
const instanceService = new InstanceService();

// Get all instances for the authenticated user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const instances = await instanceService.getUserInstances(userId);
    res.json(instances);
  } catch (error) {
    console.error('Failed to get instances:', error);
    res.status(500).json({ error: 'Failed to get instances' });
  }
});

// Get a specific instance
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const instanceId = req.params.id;
    const instance = await instanceService.getInstance(instanceId, userId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }
    
    res.json(instance);
  } catch (error) {
    console.error('Failed to get instance:', error);
    res.status(500).json({ error: 'Failed to get instance' });
  }
});

// Create a new instance
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { templateId, name, specs, environment } = req.body;
    
    if (!templateId || !name) {
      return res.status(400).json({ error: 'Template ID and name are required' });
    }
    
    const instance = await instanceService.createInstance({
      userId,
      templateId,
      name,
      specs,
      environment
    });
    
    res.status(201).json(instance);
  } catch (error) {
    console.error('Failed to create instance:', error);
    res.status(500).json({ error: 'Failed to create instance' });
  }
});

// Start an instance
router.post('/:id/start', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const instanceId = req.params.id;
    
    await instanceService.startInstance(instanceId, userId);
    res.json({ message: 'Instance start initiated' });
  } catch (error) {
    console.error('Failed to start instance:', error);
    res.status(500).json({ error: 'Failed to start instance' });
  }
});

// Stop an instance
router.post('/:id/stop', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const instanceId = req.params.id;
    
    await instanceService.stopInstance(instanceId, userId);
    res.json({ message: 'Instance stop initiated' });
  } catch (error) {
    console.error('Failed to stop instance:', error);
    res.status(500).json({ error: 'Failed to stop instance' });
  }
});

// Restart an instance
router.post('/:id/restart', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const instanceId = req.params.id;
    
    await instanceService.restartInstance(instanceId, userId);
    res.json({ message: 'Instance restart initiated' });
  } catch (error) {
    console.error('Failed to restart instance:', error);
    res.status(500).json({ error: 'Failed to restart instance' });
  }
});

// Terminate an instance
router.post('/:id/terminate', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const instanceId = req.params.id;
    
    await instanceService.terminateInstance(instanceId, userId);
    res.json({ message: 'Instance termination initiated' });
  } catch (error) {
    console.error('Failed to terminate instance:', error);
    res.status(500).json({ error: 'Failed to terminate instance' });
  }
});

// Create default instances for all OS systems
router.post('/create-defaults', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const instances = await instanceService.createDefaultInstances(userId);
    res.json({ 
      message: `Created ${instances.length} default instances`,
      instances 
    });
  } catch (error) {
    console.error('Failed to create default instances:', error);
    res.status(500).json({ error: 'Failed to create default instances' });
  }
});

export { router as instanceRoutes };