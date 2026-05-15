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

ARG DATABASE_URL
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

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile --production

# Copy Prisma schema (for migrations)
COPY --from=build /app/prisma ./prisma

# Copy built application
COPY --from=build /app/dist ./dist

# Create temp directory with proper permissions
RUN mkdir -p /app/tmp && chmod 777 /app/tmp

RUN chown -R bun:bun /app

EXPOSE 8000

USER bun

CMD ["bun", "run", "dist/main"]
