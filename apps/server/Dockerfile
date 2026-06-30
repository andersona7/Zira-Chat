FROM node:20-alpine AS base

# Stage 1: Prune the workspace to only include the server and its dependencies
FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune server --docker

# Stage 2: Install dependencies and build the server
FROM base AS installer
RUN apk add --no-cache libc6-compat
WORKDIR /app

# First install the dependencies (as they change less often)
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json
RUN npm ci

# Then build the project
COPY --from=builder /app/out/full/ .
RUN npx turbo run build --filter=server...

# Stage 3: Setup the production environment
FROM base AS runner
WORKDIR /app

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs
USER expressjs

# Copy the entire workspace with built files
COPY --from=installer --chown=expressjs:nodejs /app .

# Set the working directory to the server app
WORKDIR /app/apps/server

# Expose port and start
EXPOSE 4000
CMD ["npm", "run", "start"]