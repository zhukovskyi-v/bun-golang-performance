# syntax=docker/dockerfile:1.7

FROM oven/bun:1.3-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.3-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p dist && bun build \
    --target=bun \
    --minify \
    --external @node-rs/argon2 \
    src/index.ts --outfile dist/server.js

FROM oven/bun:1.3-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/@node-rs ./node_modules/@node-rs
COPY drizzle ./drizzle
USER app
EXPOSE 8080
CMD ["bun", "run", "dist/server.js"]
