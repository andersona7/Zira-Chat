# Technical Architecture

## Monorepo Strategy (Turborepo)
Zira Chat utilizes Turborepo to manage dependencies, share configurations, and optimize build times across the frontend and backend applications.

### Applications
* `apps/web`: The React Vite frontend.
* `apps/server`: The Node.js Express & Socket.IO backend.

### Packages
* `packages/types`: Shared TypeScript interfaces and DTOs.
* `packages/ui`: Shared React components (Tailwind + Headless UI).
* `packages/utils`: Shared formatting, validation (Zod), and date utilities.
* `packages/eslint-config`: Centralized linting rules.
* `packages/tsconfig`: Centralized TypeScript configurations.

## System Design
The architecture is designed for 1000+ concurrent users with minimal latency.

1. Client Layer: React PWA communicating via REST (HTTPS) for static/CRUD operations and WebSockets (WSS) for real-time events.
2. Load Balancer / API Gateway: Handles rate limiting, SSL termination, and routes traffic to backend nodes.
3. App Servers: Stateless Node.js instances. Session data and Socket maps are offloaded to Redis.
4. Real-time Engine: Socket.IO with Redis Adapter to broadcast events across multiple Node.js instances.
5. Cache Layer: Redis handles active user sessions, presence data, and rate-limiting counters.
6. Database Layer: MongoDB Atlas with replica sets.
7. Storage Layer: Cloudinary for media processing, thumbnail generation, and CDN delivery.

## Security Posture
* Authentication: Short-lived JWT Access Tokens (memory only) and HttpOnly, Secure, SameSite Refresh Tokens.
* Data Sanitization: Zod schema validation on all inputs.
* Header Protection: Helmet.js integration.
* Rate Limiting: Strict IP and User-ID based rate limiting via Redis to prevent brute force and DDoS.