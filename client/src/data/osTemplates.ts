import { OSTemplate } from '../types/instance';

export const OS_TEMPLATES: OSTemplate[] = [
  {
    id: 'ubuntu-desktop',
    name: 'Ubuntu Desktop',
    description: 'Full-featured Ubuntu Desktop with LXDE environment. Perfect for development and general computing tasks.',
    category: 'Linux Desktop',
    icon: '🐧',
    image: 'dorowu/ubuntu-desktop-lxde-vnc:latest',
    ports: [3002],
    specs: {
      cpu: '2 vCPU',
      memory: '2 GB RAM',
      storage: '10 GB SSD',
      network: 'VNC + SSH'
    },
    features: [
      'Full Ubuntu Desktop Environment',
      'LXDE Window Manager',
      'Web-based VNC Access',
      'Package Management (apt)',
      'Development Tools',
      'Terminal Access'
    ],
    color: 'orange',
    accessUrl: 'http://localhost:3002',
    defaultConfig: {
      environment: {
        VNC_PASSWORD: 'osmanager',
        RESOLUTION: '1920x1080'
      },
      volumes: ['ubuntu_config:/home/ubuntu']
    }
  },
  {
    id: 'alpine-desktop',
    name: 'Alpine Linux',
    description: 'Ultra-lightweight Alpine Linux with minimal desktop environment. Security-focused and resource-efficient.',
    category: 'Linux Desktop',
    icon: '🏔️',
    image: 'danielguerra/alpine-vnc:latest',
    ports: [3001],
    specs: {
      cpu: '1 vCPU',
      memory: '512 MB RAM',
      storage: '2 GB SSD',
      network: 'VNC + SSH'
    },
    features: [
      'Ultra-lightweight Distribution',
      'Security-focused Design',
      'Minimal Resource Usage',
      'Package Management (apk)',
      'Fast Boot Time',
      'Terminal Access'
    ],
    color: 'blue',
    accessUrl: 'http://localhost:3001',
    defaultConfig: {
      environment: {
        VNC_PASSWORD: 'osmanager',
        RESOLUTION: '1920x1080'
      },
      volumes: ['alpine_config:/home/alpine']
    }
  },
  {
    id: 'debian-desktop',
    name: 'Debian Desktop',
    description: 'Rock-solid Debian system with XFCE desktop environment. Known for stability and reliability.',
    category: 'Linux Desktop',
    icon: '🌀',
    image: 'accetto/debian-vnc-xfce-g3:latest',
    ports: [3003],
    specs: {
      cpu: '2 vCPU',
      memory: '1.5 GB RAM',
      storage: '8 GB SSD',
      network: 'VNC + SSH'
    },
    features: [
      'Rock-solid Stability',
      'XFCE Desktop Environment',
      'Long-term Support',
      'Package Management (apt)',
      'Enterprise Ready',
      'Terminal Access'
    ],
    color: 'red',
    accessUrl: 'http://localhost:3003/vnc.html',
    defaultConfig: {
      environment: {
        VNC_PW: 'osmanager',
        VNC_RESOLUTION: '1920x1080'
      },
      volumes: ['debian_config:/home/headless']
    }
  },
  {
    id: 'tor-service',
    name: 'Tor Proxy Service',
    description: 'Anonymous browsing proxy service for privacy protection and secure internet access.',
    category: 'Network Service',
    icon: '🔒',
    image: 'tor:latest',
    ports: [9050, 9051],
    specs: {
      cpu: '1 vCPU',
      memory: '256 MB RAM',
      storage: '1 GB SSD',
      network: 'SOCKS5 Proxy'
    },
    features: [
      'SOCKS5 Proxy Server',
      'Anonymous Web Browsing',
      'Privacy Protection',
      'Tor Network Access',
      'Control Interface',
      'Low Resource Usage'
    ],
    color: 'purple',
    defaultConfig: {
      environment: {},
      volumes: []
    }
  }
];