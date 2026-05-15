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

# Copy Prisma schema and generated client
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy built application
COPY --from=build /app/dist ./dist

# Create temp directory with proper permissions
RUN mkdir -p /app/tmp && chmod 777 /app/tmp

RUN chown -R node:node /app

EXPOSE 8000

USER node

CMD ["node", "dist/main"]
