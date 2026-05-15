# ================================
# Stage 1: Base - 기본 환경 설정
# ================================
FROM oven/bun:1.2-debian AS base

WORKDIR /app

RUN apt-get update -y && \
    apt-get install -y openssl ca-certificates libssl3 && \
    rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

# ================================
# Stage 2: Build - 빌드 단계
# ================================
FROM base AS build

# Default dummy value so `docker build .` works locally without --build-arg.
# prisma generate doesn't actually connect to the DB; the value just needs to exist for prisma.config.ts.
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DATABASE_URL=${DATABASE_URL}

COPY . .

# Reinstall to fix symlinks after copying source
RUN bun install --frozen-lockfile

# Generate Prisma Client
RUN bunx prisma generate

# Build application
RUN bun run build

# ================================
# Stage 3: Production - 최종 실행 이미지
# ================================
FROM oven/bun:1.2-debian AS production

WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update -y && \
    apt-get install -y openssl ca-certificates libssl3 && \
    rm -rf /var/lib/apt/lists/*

COPY --chown=bun:bun package.json bun.lock ./

RUN bun install --frozen-lockfile --production

# Copy Prisma schema (for migrations)
COPY --from=build --chown=bun:bun /app/prisma ./prisma

# Copy built application
COPY --from=build --chown=bun:bun /app/dist ./dist

# Create temp directory with proper permissions
RUN mkdir -p /app/tmp && chown -R bun:bun /app/tmp && chmod 777 /app/tmp

EXPOSE 8000

USER bun

CMD ["bun", "run", "dist/main"]
