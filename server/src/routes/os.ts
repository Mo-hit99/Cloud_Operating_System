import { Router } from 'express';
import { OSImage } from '../types';

const router = Router();

const osImages: OSImage[] = [
  {
    id: 'ubuntu-22',
    name: 'Ubuntu 22.04 LTS',
    image: 'ubuntu:22.04',
    description: 'Ubuntu 22.04 LTS with basic tools',
    category: 'Linux',
    ports: [22, 80],
    defaultVolumes: ['/home/ubuntu', '/data']
  },
  {
    id: 'ubuntu-20',
    name: 'Ubuntu 20.04 LTS',
    image: 'ubuntu:20.04',
    description: 'Ubuntu 20.04 LTS stable release',
    category: 'Linux',
    ports: [22, 80],
    defaultVolumes: ['/home/ubuntu', '/data']
  },
  {
    id: 'alpine',
    name: 'Alpine Linux',
    image: 'alpine:latest',
    description: 'Lightweight Linux distribution (5MB)',
    category: 'Linux',
    ports: [22],
    defaultVolumes: ['/data']
  },
  {
    id: 'debian-12',
    name: 'Debian 12 (Bookworm)',
    image: 'debian:bookworm',
    description: 'Debian 12 stable release',
    category: 'Linux',
    ports: [22, 80],
    defaultVolumes: ['/home/debian', '/data']
  },
  {
    id: 'debian-11',
    name: 'Debian 11 (Bullseye)',
    image: 'debian:bullseye',
    description: 'Debian 11 stable release',
    category: 'Linux',
    ports: [22, 80],
    defaultVolumes: ['/home/debian', '/data']
  },
  {
    id: 'centos',
    name: 'CentOS Stream 9',
    image: 'quay.io/centos/centos:stream9',
    description: 'CentOS Stream 9 rolling release',
    category: 'Linux',
    ports: [22, 80],
    defaultVolumes: ['/home/centos', '/data']
  },
  {
    id: 'amazonlinux',
    name: 'Amazon Linux 2023',
    image: 'amazonlinux:2023',
    description: 'AWS optimized Linux distribution',
    category: 'Linux',
    ports: [22, 80],
    defaultVolumes: ['/home/ec2-user', '/data']
  },
  {
    id: 'fedora',
    name: 'Fedora 39',
    image: 'fedora:39',
    description: 'Latest Fedora release',
    category: 'Linux',
    ports: [22, 80],
    defaultVolumes: ['/home/fedora', '/data']
  },
  {
    id: 'nginx',
    name: 'Nginx Web Server',
    image: 'nginx:alpine',
    description: 'Lightweight Nginx web server',
    category: 'Web Services',
    ports: [80, 443],
    defaultVolumes: ['/usr/share/nginx/html', '/etc/nginx']
  },
  {
    id: 'node',
    name: 'Node.js Runtime',
    image: 'node:18-alpine',
    description: 'Node.js 18 runtime environment',
    category: 'Development',
    ports: [3000, 8000],
    defaultVolumes: ['/app', '/data']
  },
  {
    id: 'python',
    name: 'Python 3.11',
    image: 'python:3.11-alpine',
    description: 'Python 3.11 runtime environment',
    category: 'Development',
    ports: [8000, 5000],
    defaultVolumes: ['/app', '/data']
  },
  {
    id: 'postgres',
    name: 'PostgreSQL 15',
    image: 'postgres:15-alpine',
    description: 'PostgreSQL 15 database server',
    category: 'Databases',
    ports: [5432],
    defaultVolumes: ['/var/lib/postgresql/data']
  },
  {
    id: 'mysql',
    name: 'MySQL 8.0',
    image: 'mysql:8.0',
    description: 'MySQL 8.0 database server',
    category: 'Databases',
    ports: [3306],
    defaultVolumes: ['/var/lib/mysql']
  },
  {
    id: 'redis',
    name: 'Redis Cache',
    image: 'redis:7-alpine',
    description: 'Redis in-memory data store',
    category: 'Databases',
    ports: [6379],
    defaultVolumes: ['/data']
  }
];

router.get('/', (req, res) => {
  res.json(osImages);
});

router.get('/categories', (req, res) => {
  const categories = [...new Set(osImages.map(os => os.category))];
  res.json(categories);
});

router.get('/:id', (req, res) => {
  const { id } = req.params;
  const osImage = osImages.find(os => os.id === id);
  
  if (!osImage) {
    return res.status(404).json({ error: 'OS image not found' });
  }
  
  res.json(osImage);
});

export { router as osRoutes };