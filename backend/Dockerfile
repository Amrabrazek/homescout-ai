FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/db ./db
EXPOSE 3001
# Migrate + seed (if empty), index search (if empty; a search outage must not block the API), start
CMD ["sh", "-c", "node dist/scripts/seed.js && (node dist/scripts/populate-typesense.js --if-empty || echo 'Typesense indexing skipped') && node dist/main.js"]
