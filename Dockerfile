# ─── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy monorepo config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./

# Copy libs
COPY lib/api-zod ./lib/api-zod/
COPY lib/api-client-react ./lib/api-client-react/
COPY lib/api-spec ./lib/api-spec/

# Copy artifacts
COPY artifacts/api-server ./artifacts/api-server/
COPY artifacts/media-converter ./artifacts/media-converter/

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Build shared libs
RUN pnpm --filter @workspace/api-zod run build
RUN pnpm --filter @workspace/api-client-react run build

# Build server
RUN pnpm --filter @workspace/api-server run build

# Build frontend
RUN pnpm --filter @workspace/media-converter run build

# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine

RUN apk add --no-cache ffmpeg python3 py3-pip
RUN pip3 install --break-system-packages yt-dlp

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy production artifacts
COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=builder /app/artifacts/api-server/package.json ./artifacts/api-server/package.json
COPY --from=builder /app/artifacts/media-converter/dist ./artifacts/media-converter/dist

# Copy libs
COPY --from=builder /app/lib/api-zod/dist ./lib/api-zod/dist
COPY --from=builder /app/lib/api-zod/package.json ./lib/api-zod/package.json
COPY --from=builder /app/lib/api-client-react/dist ./lib/api-client-react/dist
COPY --from=builder /app/lib/api-client-react/package.json ./lib/api-client-react/package.json

# Copy root config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install production dependencies only
RUN pnpm install --prod --no-frozen-lockfile

# Create tmp directory
RUN mkdir -p /app/tmp

ENV NODE_ENV=production
ENV PORT=3000
ENV TMP_DIR=/app/tmp

EXPOSE 3000

CMD ["node", "artifacts/api-server/dist/index.js"]
