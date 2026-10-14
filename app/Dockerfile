# Use official Node.js 20 LTS Alpine image for minimal attack surface
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Set production environment
ENV NODE_ENV=production

# Copy package manifests first for efficient Docker layer caching
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy application source files
COPY . .

# Change ownership of application files to non-root node user
RUN chown -R node:node /usr/src/app

# Switch to non-root user
USER node

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "src/app.js"]
