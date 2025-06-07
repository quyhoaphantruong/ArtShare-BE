# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy prisma schema first
COPY prisma ./prisma

# Generate Prisma client
RUN yarn prisma generate

# Copy the rest of the code
COPY . .

# Build
RUN yarn build

# Stage 2: Production dependencies only
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production
COPY prisma ./prisma
RUN yarn prisma generate

# Stage 3: Runtime
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package.json .

ENV NODE_ENV=production
CMD ["node", "dist/src/main.js"]