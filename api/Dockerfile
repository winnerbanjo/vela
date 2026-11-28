# syntax=docker/dockerfile:1

# --- build -------------------------------------------------------------------
FROM node:22.9-slim AS build
WORKDIR /app

# Prisma's query engine needs OpenSSL; argon2 uses a prebuilt glibc binary.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates build-essential python3 \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npx prisma generate && npm run build

# Full node_modules (including the Prisma CLI) so migrations can run from the
# same image without a second dependency install.
FROM build AS migrate
CMD ["npx", "prisma", "migrate", "deploy"]

# Production dependencies only. `prisma generate` already produced the client.
FROM build AS production-deps
RUN npm prune --omit=dev

# --- runtime -----------------------------------------------------------------
FROM node:22.9-slim AS runtime
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates build-essential python3 \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system vela \
  && useradd --system --gid vela --create-home vela

ENV NODE_ENV=production \
    PORT=5050 \
    HOST=0.0.0.0

COPY package.json ./
COPY --from=production-deps /app/node_modules ./node_modules
# The generated client is not a package, so prune cannot be relied on to keep it.
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

USER vela
EXPOSE 5050

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5050)+'/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# The worker uses the same image with:
#   docker run ... <image> node dist/apps/worker/main.js
CMD ["node", "dist/apps/api/server.js"]
