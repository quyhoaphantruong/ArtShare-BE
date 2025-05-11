#############################################################################
# ⛏  Builder stage –– compile TS and generate the Prisma client
#############################################################################
FROM node:22-slim AS builder
WORKDIR /usr/src/app

# ---------- system deps ----------
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# ---------- install full deps & generate ----------
COPY package.json yarn.lock ./
# postinstall already runs "prisma generate" — keep it!
RUN yarn install --frozen-lockfile

# copy schema first (in case you decided not to commit migrations yet)
COPY prisma ./prisma
RUN yarn prisma generate

# ---------- copy source & compile ----------
COPY . .
RUN yarn build

#############################################################################
# 🚀  Runtime stage –– slim & self-contained image
#############################################################################
FROM node:22-slim
WORKDIR /usr/src/app

# ---------- system deps ----------
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# ---------- prod deps & prisma client ----------
# postinstall MUST run so the .prisma folder is created
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

# ---------- bring compiled code, generated client, and migrations ----------
COPY --from=builder /usr/src/app/dist    ./dist
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma
# COPY .env .env

EXPOSE 3000
# CMD ["node", "dist/src/main.js"]
CMD ["sh", "-c", "echo '--- Contents of /usr/src/app (WORKDIR) ---' && ls -lha /usr/src/app && echo '--- Contents of /usr/src/app/dist ---' && ls -R /usr/src/app/dist && echo '--- End of listing ---' && sleep 3600"]