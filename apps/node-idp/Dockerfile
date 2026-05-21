# syntax=docker/dockerfile:1.7

FROM node:lts-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci

FROM node:lts-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY tsconfig.json ./
COPY src ./src
COPY drizzle ./drizzle
USER app
EXPOSE 8080
CMD ["node", "--import", "tsx/esm", "src/index.ts"]