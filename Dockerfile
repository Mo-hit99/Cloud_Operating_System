FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install root dependencies
RUN npm install

# Copy source code
COPY . .

# Install server dependencies and build
RUN cd server && npm install && npm run build

# Install client dependencies and build
RUN cd client && npm install && npm run build

# Remove development dependencies to reduce image size
RUN npm prune --production
RUN cd server && npm prune --production

EXPOSE 5000

# Start the server in production mode
CMD ["npm", "start"]