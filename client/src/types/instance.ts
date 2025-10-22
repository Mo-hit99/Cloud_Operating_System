export interface OSTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Linux Desktop' | 'Network Service';
  icon: string;
  image: string;
  ports: number[];
  specs: {
    cpu: string;
    memory: string;
    storage: string;
    network: string;
  };
  features: string[];
  color: string;
  accessUrl?: string;
  defaultConfig: {
    environment: Record<string, string>;
    volumes: string[];
  };
}

export interface Instance {
  id: string;
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

export interface InstanceCreationRequest {
  templateId: string;
  name: string;
  specs?: {
    cpu?: string;
    memory?: string;
    storage?: string;
  };
  environment?: Record<string, string>;
}