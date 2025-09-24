# Use Node.js 18 Alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for building)
RUN npm ci

# Copy source code
COPY . .

# Build the backend
RUN npm run build:backend

# Remove dev dependencies after build
RUN npm prune --production

# Expose port
EXPOSE 4000

# Start the application
CMD ["npm", "start"]