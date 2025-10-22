export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  created_at: Date;
}

export interface Container {
  id: number;
  user_id: string;
  container_id: string;
  name: string;
  os_type: string;
  image: string;
  status: string;
  ports: Record<string, string>;
  volumes: Record<string, string>;
  created_at: Date;
  last_accessed: Date;
}

export interface OSImage {
  id: string;
  name: string;
  image: string;
  description: string;
  category: string;
  ports: number[];
  defaultVolumes: string[];
}

import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: User;
}