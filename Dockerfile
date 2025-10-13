# Use Node.js 18 runtime
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm install

# Copy source code
COPY . .

# Debug: List current directory contents
RUN ls -la

# Debug: Check if src/tsconfig.json exists
RUN ls -la src/ || echo "src directory not found"

# Build TypeScript backend
RUN npm run build:backend || echo "Backend build failed, falling back to functions"

# Install curl for health checks (before switching to non-root user)
RUN apk add --no-cache curl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership and switch to non-root user
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port (Cloud Run uses PORT env variable)
EXPOSE 8080

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start the same Express app used by Firebase Functions
CMD ["node", "server.js"]