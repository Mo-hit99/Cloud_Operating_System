FROM node:18-alpine

WORKDIR /app

# Install Docker CLI
RUN apk add --no-cache docker-cli

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install root dependencies
RUN npm install

# Copy source code
COPY . .

# Install server dependencies
RUN cd server && npm install

# Install client dependencies and build
RUN cd client && npm install
RUN cd client && npm run build
RUN ls -la /app/client/build || echo "Build directory not found"

EXPOSE 5000

# Start the server in development mode (which will serve both API and frontend)
CMD ["npm", "run", "server:dev"]