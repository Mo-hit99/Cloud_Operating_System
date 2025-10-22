# 🐧 Container OS Manager - AWS EC2-like Container Platform

A modern, AWS EC2-inspired web interface for managing Linux containers with integrated terminal access. Create, launch, and manage Ubuntu, Alpine, and Debian Linux instances with a beautiful, responsive UI and powerful management features.

## 📋 Prerequisites

Before setting up the project, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **Docker** - [Install Docker](https://docs.docker.com/get-docker/)
- **Docker Compose** - Usually included with Docker Desktop
- **Git** - [Install Git](https://git-scm.com/downloads)

### Verify Installation

```bash
node --version    # Should be v18+
npm --version     # Should be 8+
docker --version  # Should be 20+
docker-compose --version
```

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd container-os-manager
```

### 2. Install Dependencies

```bash
npm run install-all
```

This command installs dependencies for:

- Root project (concurrently for running multiple processes)
- Server (Express, TypeScript, Docker API, Socket.IO)
- Client (React, TypeScript, Tailwind CSS, xterm.js)

### 3. Environment Setup

Create environment file for the server:

```bash
# Create server/.env file
cd server
cp .env.example .env  # If example exists, or create manually
```

**Server Environment Variables** (`server/.env`):

```env
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=docker_os_manager
DB_USER=admin
DB_PASSWORD=password

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Client URL
CLIENT_URL=http://localhost:3000

# Node Environment
NODE_ENV=development
```

### 4. Start the Application

#### Option A: Development Mode (Recommended)

```bash
# Start the full application (client + server + databases)
npm run dev
```

#### Option B: Docker Mode

```bash
# Start with Docker Compose
docker-compose up -d
```

### 5. Access the Platform

- **Web Interface**: http://localhost:3000
- **API Server**: http://localhost:5000
- Register a new account or login
- Click "Launch Instance" to create your first container

### 6. Launch OS Containers (Optional)

```bash
# Start all OS services (Ubuntu, Alpine, Debian)
npm run os:start
```

## ✨ Key Features

### 🚀 AWS EC2-like Instance Management

- **Instance Creation Wizard**: Step-by-step container creation process
- **Template Selection**: Choose from pre-configured OS templates
- **Resource Configuration**: Specify CPU, memory, and storage requirements
- **Instance Dashboard**: Comprehensive overview of all your containers
- **Lifecycle Management**: Create, start, stop, restart, and terminate instances

### 💻 Integrated Terminal Access

- **Real-time Terminal**: Interactive bash terminal for each Linux container
- **Web-based Interface**: No SSH required - terminal runs in your browser
- **Full Command Access**: Install packages, edit files, run system commands
- **Modern UI**: Powered by xterm.js with syntax highlighting and themes

### 🎨 Modern User Interface

- **Responsive Design**: Beautiful, mobile-friendly interface
- **Gradient Themes**: Color-coded containers with modern styling
- **Dashboard Analytics**: Real-time statistics and instance overview
- **Intuitive Navigation**: Easy-to-use navigation with breadcrumbs

## 🖥️ Available Operating Systems

### Linux Desktop Systems

- **Ubuntu Linux** - Full desktop environment + Terminal (Port: 3002)
- **Alpine Linux** - Lightweight desktop + Terminal (Port: 3001)
- **Debian Linux** - XFCE desktop + Terminal (Port: 3003)

### Network Services

- **Tor Service** - Anonymous browsing proxy (Ports: 9050, 9051)

## 🐳 Docker Commands

**Start all OS services:**

```bash
npm run os:start
```

**Stop all OS services:**

```bash
npm run os:stop
```

**Start/stop individual services:**

```bash
docker-compose up -d ubuntu-desktop
docker-compose up -d alpine-desktop
docker-compose up -d debian-desktop
docker-compose up -d tor-service
```

## 🎯 How to Use

### 1. Create an Instance

1. Click "Launch Instance" from the dashboard
2. Select an operating system template:
   - **Ubuntu Desktop**: Full-featured development environment
   - **Alpine Linux**: Lightweight, security-focused container
   - **Debian Desktop**: Stable, enterprise-ready system
   - **Tor Service**: Anonymous browsing proxy
3. Configure instance name and specifications
4. Review and launch your container

### 2. Manage Instances

- **Dashboard**: View all instances with real-time status
- **Instance Detail**: Comprehensive management interface
- **Actions**: Start, stop, restart, or terminate instances
- **Monitoring**: Track resource usage and performance

### 3. Access Methods

#### Web Terminal

- Click "Open Terminal" on any running Linux container
- Full bash shell with root privileges
- Real-time command execution and output
- Package installation: `apt` (Ubuntu/Debian) or `apk` (Alpine)

#### Desktop GUI

- **Ubuntu:** http://localhost:3002 (VNC Desktop)
- **Alpine:** http://localhost:3001 (VNC Desktop)
- **Debian:** http://localhost:3003/vnc.html (VNC Desktop)
- **Default VNC Password:** `osmanager`

#### Network Services

- **Tor SOCKS5 Proxy:** localhost:9050
- **Tor Control Port:** localhost:9051

## 🏗️ Project Architecture

### Tech Stack

- **Frontend:** React 18 + TypeScript + Tailwind CSS + xterm.js
- **Backend:** Node.js + Express + TypeScript + Docker API
- **Database:** PostgreSQL 15 + Redis 7
- **Containers:** Docker + Docker Compose
- **Real-time:** Socket.IO (WebSocket connections)
- **Terminal:** Docker Exec API with TTY support

### Project Structure

```
container-os-manager/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API services
│   │   └── types/         # TypeScript type definitions
│   ├── public/            # Static assets
│   └── package.json       # Client dependencies
├── server/                # Node.js backend application
│   ├── src/
│   │   ├── controllers/   # Route controllers
│   │   ├── middleware/    # Express middleware
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic services
│   │   └── types/         # TypeScript type definitions
│   └── package.json       # Server dependencies
├── docker-compose.yml     # Docker services configuration
├── Dockerfile            # Application container build
└── package.json          # Root project scripts
```

## 🛠️ Development Setup

### Running in Development Mode

1. **Start databases and services:**

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis
```

2. **Start the application:**

```bash
# This runs both client and server with hot reload
npm run dev
```

The development setup includes:

- **Client**: React dev server with hot reload (http://localhost:3000)
- **Server**: TypeScript compilation with ts-node-dev (http://localhost:5000)
- **Database**: PostgreSQL with persistent data
- **Cache**: Redis for session management

### Available Scripts

**Root Level Scripts:**

```bash
npm run install-all    # Install all dependencies (root, server, client)
npm run dev           # Start both client and server in development
npm run build         # Build client for production
npm run start         # Start production server
npm run docker:up     # Start all services with Docker
npm run docker:down   # Stop all Docker services
npm run os:start      # Start OS containers (Ubuntu, Alpine, Debian)
npm run os:stop       # Stop OS containers
```

**Server Scripts:**

```bash
cd server
npm run dev          # Start server with hot reload
npm run build        # Compile TypeScript to JavaScript
npm run start        # Start compiled server
```

**Client Scripts:**

```bash
cd client
npm start           # Start React development server
npm run build       # Build for production
npm test           # Run tests
```

### Database Setup

The application uses PostgreSQL for data persistence. The database is automatically initialized when you start the services.

**Database Schema:**

- Users table (authentication)
- Containers table (container instances)
- Sessions table (user sessions)

**Database Access:**

```bash
# Connect to PostgreSQL container
docker exec -it <postgres-container-id> psql -U admin -d docker_os_manager

# View tables
\dt

# Example queries
SELECT * FROM users;
SELECT * FROM containers;
```

### Redis Setup

Redis is used for:

- Session storage
- Real-time data caching
- WebSocket connection management

**Redis Access:**

```bash
# Connect to Redis container
docker exec -it <redis-container-id> redis-cli

# View all keys
KEYS *

# View session data
GET sess:session-id
```

## � Trcoubleshooting

### Common Issues

**1. Port Already in Use**

```bash
# Check what's using the port
netstat -tulpn | grep :3000
# or
lsof -i :3000

# Kill the process
kill -9 <PID>
```

**2. Docker Permission Issues**

```bash
# Add user to docker group (Linux/Mac)
sudo usermod -aG docker $USER
# Then logout and login again

# Or run with sudo (not recommended for development)
sudo docker-compose up
```

**3. Database Connection Issues**

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# View database logs
docker logs <postgres-container-id>

# Reset database
docker-compose down -v  # This removes volumes!
docker-compose up -d postgres
```

**4. Node Modules Issues**

```bash
# Clean install
rm -rf node_modules package-lock.json
rm -rf client/node_modules client/package-lock.json
rm -rf server/node_modules server/package-lock.json
npm run install-all
```

**5. Docker Socket Permission (Linux)**

```bash
# Fix Docker socket permissions
sudo chmod 666 /var/run/docker.sock
```

### Development Tips

**Hot Reload Not Working:**

- Ensure you're running `npm run dev` from the root directory
- Check that both client (3000) and server (5000) ports are available
- Restart the development servers if needed

**TypeScript Errors:**

- Run `npm run build` in both client and server directories
- Check for missing type definitions
- Ensure TypeScript versions are compatible

**Container Issues:**

- Use `docker logs <container-name>` to debug container problems
- Check Docker daemon is running: `docker info`
- Verify Docker Compose version compatibility

## 🧪 Testing

### Running Tests

```bash
# Client tests
cd client
npm test

# Server tests (if implemented)
cd server
npm test
```

### Manual Testing Checklist

- [ ] User registration and login
- [ ] Container creation and management
- [ ] Terminal access to containers
- [ ] VNC desktop access
- [ ] Real-time status updates
- [ ] Container lifecycle (start/stop/restart/delete)

## 🚀 Production Deployment

### Environment Variables for Production

```env
NODE_ENV=production
JWT_SECRET=your-super-secure-production-secret
DB_PASSWORD=secure-database-password
CLIENT_URL=https://your-domain.com
```

### Docker Production Build

```bash
# Build production image
docker build -t container-os-manager .

# Run with production compose
docker-compose -f docker-compose.prod.yml up -d
```

### Security Considerations

- Change all default passwords
- Use strong JWT secrets
- Enable HTTPS in production
- Configure proper firewall rules
- Regular security updates for base images

## 🔒 Security Features

- JWT-based user authentication and authorization
- Rate limiting and security headers (Helmet.js)
- Isolated container environments
- Secure VNC connections with passwords
- CORS protection
- Input validation and sanitization

## 📊 Monitoring & Logging

- Real-time container status updates via WebSocket
- Automatic health checks for containers
- Container resource monitoring
- Live status indicators in UI
- Server-side logging for debugging
- Docker container logs accessible via UI

## 🤝 Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Test thoroughly
5. Commit with clear messages
6. Push and create a Pull Request

### Code Style

- Use TypeScript for type safety
- Follow ESLint configuration
- Use Prettier for code formatting
- Write meaningful commit messages
- Add comments for complex logic

### Pull Request Guidelines

- Describe your changes clearly
- Include screenshots for UI changes
- Ensure all tests pass
- Update documentation if needed
