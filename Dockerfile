# Build stage
FROM oven/bun:1.2-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Production stage
FROM oven/bun:1.2-alpine AS production

# Install minimal runtime dependencies for voice
RUN apk add --no-cache \
    libsodium \
    ca-certificates \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy source code
COPY package.json ./
COPY src ./src
COPY data ./data

# Create non-root user for security
RUN chown -R bun:bun /app

USER bun

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD bun --version || exit 1

# Start the bot
CMD ["bun", "run", "src/index.ts"]
