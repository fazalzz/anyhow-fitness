# Multi-stage build to ensure proper compilation of native modules
FROM node:18-alpine AS builder

# Install build dependencies for native modules
RUN apk add --no-cache make gcc g++ python3

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

# Build the backend
RUN npm run build:backend

# Production stage
FROM node:18-alpine

# Install runtime dependencies for native modules
RUN apk add --no-cache make gcc g++ python3

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies and ensure they're compiled for Alpine Linux
RUN npm ci --only=production && npm rebuild bcrypt --build-from-source

# Copy built application from builder stage
COPY --from=builder /app/src/dist ./src/dist

# Copy other necessary files
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/src/config ./src/config

# Clean up build tools to reduce image size
RUN apk del make gcc g++ python3

# Expose port
EXPOSE 4000

# Start the application
CMD ["npm", "start"]