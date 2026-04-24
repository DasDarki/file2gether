# syntax=docker/dockerfile:1.7

FROM oven/bun:latest as build

WORKDIR /app

COPY package.json ./
COPY bun.lock ./
COPY . .
RUN bun install

RUN bun run build-only

FROM caddy:2-alpine AS runtime
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 80
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
