# Build stage
FROM node:22-alpine AS builder

RUN apk add --no-cache python3 make g++

RUN corepack enable && corepack prepare pnpm@10.15.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build && pnpm prune --prod

# Production stage
FROM node:22-alpine AS production

RUN apk add --no-cache dumb-init

RUN corepack enable && corepack prepare pnpm@10.15.0 --activate

WORKDIR /app

ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml .npmrc ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

USER node

EXPOSE 3000

CMD ["dumb-init", "node", "dist/main.js"]
