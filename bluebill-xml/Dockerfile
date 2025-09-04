# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application source
COPY . .

# Create uploads directory (for XML uploads)
RUN mkdir -p /usr/src/app/uploads

# Expose API port
EXPOSE 3000

# Start the app
CMD ["node", "src/server.js"]
