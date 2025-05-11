FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Make sure the output exists and is accessible
RUN ls -la dist/ && \
    if [ ! -f dist/main.js ]; then \
        if [ -f dist/src/main.js ]; then \
            mkdir -p /app/dist-temp && \
            cp -r dist/src/* /app/dist-temp/ && \
            rm -rf dist && \
            mv /app/dist-temp dist; \
        else \
            echo "main.js not found in expected locations"; \
            exit 1; \
        fi \
    fi

EXPOSE 3001

# Start the application
CMD ["node", "dist/main.js"] 