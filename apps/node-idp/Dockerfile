# syntax=docker/dockerfile:1.7

FROM node:lts-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm install --no-save esbuild@0.24 \
 && npx esbuild src/index.ts \
      --bundle \
      --platform=node \
      --format=esm \
      --target=node22 \
      --outfile=dist/server.js \
      --packages=external

FROM node:lts-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:lts-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./
COPY drizzle ./drizzle
USER app
EXPOSE 8080
CMD ["node", "dist/server.js"]