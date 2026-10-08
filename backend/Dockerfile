# Debian (glibc), not Alpine: onnxruntime-node, used by the local embedding model, needs glibc
FROM node:24-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 3001
# Migrate + seed (if empty), enqueue embedding/indexing if out of sync, then start the API and its sync worker
CMD ["sh", "-c", "node dist/scripts/seed.js && node dist/scripts/reindex.js --if-needed && node dist/main.js"]
