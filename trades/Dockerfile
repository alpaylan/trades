FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_MULTIPLAYER_WS_URL=ws://localhost:8787
ENV VITE_MULTIPLAYER_WS_URL=${VITE_MULTIPLAYER_WS_URL}
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
