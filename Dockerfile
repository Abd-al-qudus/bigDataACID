FROM node:18-alpine

WORKDIR /app

# Install dependencies first (caching layer)
COPY package.json package-lock.json* ./
RUN npm install

# Copy source code
COPY . .
RUN mkdir -p data
RUN node src/generateData.js

# Start the server
CMD ["node", "src/server.js"]