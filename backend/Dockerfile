FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Build the application (outputs to /app/dist)
RUN npm run build

EXPOSE 3001

# Start the application (using dist/main.js, not dist/backend/src/main.js)
CMD ["node", "dist/main.js"] 