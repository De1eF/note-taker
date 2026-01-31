# Use Node.js Alpine for small image
FROM node:24-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the app
COPY . .

# Build production assets
RUN npm run build

# Expose default Vite preview port
EXPOSE 4173

# Run Vite preview in production
CMD ["npx", "vite", "preview", "--port", "4173", "--host"]
