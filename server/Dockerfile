FROM node:20-alpine AS base
WORKDIR /app

COPY server/package.json server/package-lock.json ./
RUN npm ci
RUN mkdir -p /trades && ln -s /app/node_modules /trades/node_modules

COPY server/src ./src
COPY trades/src/logic /trades/src/logic
COPY trades/src/multiplayer /trades/src/multiplayer

ENV NODE_ENV=production
EXPOSE 8787

CMD ["npx", "tsx", "src/index.ts"]
