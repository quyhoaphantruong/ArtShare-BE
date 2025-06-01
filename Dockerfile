# ──────────────────────────────────────────────────────────────────────────────
# 1) Builder Stage: Build the Nest app (Debian-based for native modules)
# ──────────────────────────────────────────────────────────────────────────────
FROM node:18-slim AS builder

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    libvips-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy lockfiles first for better caching
COPY package.json yarn.lock ./

# Install all dependencies (including dev)
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client for Debian‐glibc
RUN npx prisma generate

# Generate any metadata (e.g. swagger)
RUN yarn generate:metadata

# Build the Nest app
RUN yarn build

# ──────────────────────────────────────────────────────────────────────────────
# 2) Production Stage: runtime image (Debian-slim)
# ──────────────────────────────────────────────────────────────────────────────
FROM node:18-slim AS production

# Install runtime dependencies: libvips (for sharp) and ca-certificates
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    libvips42 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root “appgroup” and “appuser”
RUN groupadd --system appgroup \
    && useradd  --system --gid appgroup --no-create-home --shell /usr/sbin/nologin appuser

WORKDIR /usr/src/app

# Copy over only what’s needed from builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist         ./dist
COPY --from=builder /usr/src/app/prisma       ./prisma

# Switch to the unprivileged user
USER appuser

# Expose Nest’s default port
EXPOSE 3000

# Launch the compiled Nest application
CMD ["node", "dist/src/main.js"]