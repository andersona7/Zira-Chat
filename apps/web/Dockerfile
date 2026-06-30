FROM node:20-alpine AS base

# Stage 1: Prune the workspace to only include the web app
FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune web --docker

# Stage 2: Install and Build the web app
FROM base AS installer
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json
RUN npm ci

COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json

# Accept API URL at build time so Vite can embed it
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

RUN npx turbo run build --filter=web...

# Stage 3: Serve the built PWA using Nginx
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html

# Remove default nginx static assets
RUN rm -rf ./*

# Copy built assets from the installer stage
COPY --from=installer /app/apps/web/dist .

# Copy custom Nginx configuration
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]