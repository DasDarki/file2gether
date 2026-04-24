# syntax=docker/dockerfile:1.7

FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock* bun.lockb* ./
RUN bun install --frozen-lockfile

FROM oven/bun:1 AS build
WORKDIR /app
# vue-tsc (#!/usr/bin/env node) ist nicht 100% kompatibel mit Bun's Node-Wrapper
# und scheitert beim Auflösen von .vue-Modulen. Echtes Node nachinstallieren.
RUN apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM caddy:2-alpine AS runtime
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 80
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
