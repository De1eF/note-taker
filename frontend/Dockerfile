# We use the alpine version for a small footprint
FROM node:24-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Clean install dependencies
RUN npm ci

# Copy the rest of the app
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]