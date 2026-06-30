# Zira Chat 💬

Zira Chat is an enterprise-grade, high-performance, real-time messaging platform built using the MERN (MongoDB, Express, React, Node.js) stack. It is structured as a robust **Turborepo monorepo** to maximize developer productivity, sharing TypeScript declarations, configurations, and core design elements across packages.

Designed not just as a clone but as a premium chat application, Zira Chat features **Aether**—a custom calming design system engineered to mitigate cognitive fatigue and provide an elegant, fluid user experience similar to premium productivity suites.

---

## 📖 Table of Contents
1. [Key Features](#-key-features)
2. [Monorepo Architecture](#-monorepo-structure)
3. [Deep Dive: Feature Implementations](#-deep-dive-feature-implementations)
4. [Technology Stack](#-technology-stack)
5. [The "Aether" Design System](#-the-aether-design-system)
6. [Getting Started & Configuration](#-getting-started--configuration)
7. [Docker Deployment](#-docker-deployment)
8. [Testing Strategy](#-testing-strategy)
9. [Security Posture & Performance Tuning](#-security-posture--performance-tuning)

---

## ✨ Key Features

- **Real-Time Communication**: Instant delivery using Socket.IO with optimistic UI state updates for sub-100ms feel.
- **WebRTC Audio & Video Calls**: Peer-to-peer real-time call rooms with connection states, canvas/video overlay controllers, and hardware-accelerated streams.
- **Voice Notes**: Browser-native recording using the Web Audio API with a dynamic visualizer, uploaded directly to Cloudinary.
- **Media & Document Sharing**: Secure direct-to-cloud file uploads (Cloudinary) to bypass heavy disk writes on application servers.
- **24-Hour Ephemeral Statuses**: Rich stories featuring image formats and caption overlays utilizing MongoDB TTL (Time to Live) indexes.
- **Group Chats**: Fully featured group messaging with custom avatar uploads, group descriptions, participant lists, and creator/admin privileges.
- **Progressive Web App (PWA)**: Desktop/mobile installable client featuring robust local caching (IndexedDB + Redux Persist), offline viewing, and outbox queues for automatic sync upon reconnection.
- **Granular Privacy & Security**: Complete control over read receipts, "Last Seen" timestamp visibility, profile photo privacy, and user blocking/unblocking.

---

## 🏗️ Monorepo Structure

Zira Chat utilizes a **Turborepo** configuration to organize its source code into separate workspaces, facilitating clean boundary separation and fast incremental builds.

```plaintext
zira-chat/
├── apps/
│   ├── server/           # Express & Socket.IO backend (port 4000)
│   └── web/              # React, Vite, & Tailwind CSS PWA client (port 5173 / 8080)
├── packages/
│   ├── eslint-config/    # Shared linting and styling configurations
│   ├── tsconfig/         # Reusable TypeScript configurations
│   ├── types/            # Shared interfaces, message types, and DTO definitions
│   ├── ui/               # Tailored React component library containing UI components
│   └── utils/            # Utility libraries and tailwind configuration helpers
├── docker-compose.yml    # Full local multi-container orchestration environment
├── package.json          # Workspace root script orchestration
└── turbo.json            # Turborepo task pipeline configuration
```

---

## 🛠️ Deep Dive: Feature Implementations

### 1. Real-Time Sync & Socket Architecture
The signaling and message distribution system is powered by `Socket.IO`. 
* **Session Validation**: Connection handshakes decode and verify JWTs. Socket authentication checks session records inside MongoDB for an active user status before establishing connections.
* **Typing & Online Presence**: Real-time events include:
  * `presence_update`: Informs contacts of online/offline status using a Redis-cached state layer.
  * `typing_status`: Emitted dynamically using debounced keyboard events.
  * `message_read`: Emitted to mark messages as read and updates ticks on the sender's client.
* **Optimistic Updates**: When a user sends a message, the Redux store instantly updates the active chat view with a temporary ID. If the server response returns success, the message ID is reconciled.

### 2. WebRTC Peer-to-Peer Calling
Voice and video calling bypasses server media routing by using Direct Peer-to-Peer WebRTC connections:
* **Signaling Channel**: Socket.IO acts as the signaling handler, routing ICE candidates, SDP offers, and answer messages.
* **Presence & State Management**: Call parameters are logged in MongoDB via call histories (Caller, Receiver, Start Time, End Time, Call Type: `AUDIO` / `VIDEO`).
* **Active Calls Map**: The server keeps an in-memory map of active calls to prevent parallel calling attempts and correctly clean up states on unexpected socket disconnects.

### 3. Progressive Web App (PWA) & Offline Mode
Zira Chat provides high reliability under unstable network conditions:
* **Service Worker**: Registered using `Vite PWA Plugin`, caching static assets (HTML, JS, CSS, Font files) for immediate rendering.
* **IndexedDB & Local Outbox**: Redux state is persisted via `redux-persist` and `idb-keyval` (IndexedDB). If a user sends a message while offline:
  * It is saved inside a local IndexedDB sync outbox queue.
  * The user interface displays a "Pending" clock icon.
  * Once the browser emits an `online` event, the outbox processor is triggered to drain the queue, pushing messages to the server.

### 4. Ephemeral Status Updates
* **TTL Indexes**: Statuses are stored in a designated collection in MongoDB with a TTL index set on the `createdAt` timestamp. MongoDB automatically deletes documents exactly 24 hours after their creation.
* **View Tracking**: Tracks individual viewer IDs. Users can see a list of contacts who viewed their stories.

---

## 💻 Technology Stack

### Frontend (Client)
- **Vite & React 18**: Quick builds and fast, component-based rendering.
- **Redux Toolkit & RTK Query**: Seamless global client-side caching, data query orchestration, and state synchronization.
- **Tailwind CSS & Headless UI**: Flexible, atomic styling combined with accessible UI controls.
- **Framer Motion**: Physical-based, fluid micro-interactions.
- **React Virtual (`@tanstack/react-virtual`)**: Handles rendering thousands of chat messages inside lists without DOM lag by rendering only the visible items.

### Backend (Server)
- **Express & Node.js**: Modular routes and lightweight request lifecycle management.
- **Socket.IO**: Real-time bi-directional transport client.
- **MongoDB & Mongoose**: Flexible, high-performance NoSQL document stores with schema modeling.
- **Redis**: Fast, in-memory key-value database used for caching user presence status, rate limiting, and temporary user sessions.
- **Cloudinary SDK**: Directly uploads files via memory streams to the Cloudinary CDN.

---

## 🎨 The "Aether" Design System

Zira Chat introduces **Aether** to avoid the bright, cluttered look of generic chatting tools:
- **Palette**: Deep Indigo backgrounds (`#0F0C20`) paired with subtle violet highlights, neon secondary tones, and deep slate elements.
- **Contrast**: Complies with AAA accessibility standards for high readability in low-light environments.
- **Typography**:
  - Headings: `Outfit` (soft curves, elegant modern spacing).
  - UI Labels & Message Text: `Inter` (high legibility at small sizes).
- **Physical Transitions**: Smooth easing transitions (`cubic-bezier(0.4, 0, 0.2, 1)`) for message bubbles, drawers, and modal transitions.

---

## 🚀 Getting Started & Configuration

### Prerequisites
Make sure you have installed:
- **Node.js** (v18 or v20 recommended)
- **PNPM** or **NPM** (Workspace support is built-in)
- **MongoDB** (Local instance or Atlas cloud cluster)
- **Redis** (Local instance or Upstash cluster)
- **Cloudinary** account credentials

### 1. Project Installation
Install all workspaces and dependencies concurrently from the root directory:
```bash
# Clone the repository
git clone https://github.com/yourusername/zira-chat.git
cd zira-chat

# Install dependencies using pnpm (or npm)
pnpm install
```

### 2. Environment Variables Configuration

Create a `.env` file in **`apps/server/`**:
```ini
PORT=4000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database & Cache URIs
MONGO_URI=mongodb://localhost:27017/zirachat
REDIS_URI=redis://localhost:6379

# JWT Secrets for Authentication
JWT_SECRET=your_jwt_secret_key_change_me_in_production
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_change_me_in_production

# Cloudinary Integration (Required for Media/Voice Uploads)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

Create a `.env` file in **`apps/web/`**:
```ini
VITE_API_URL=http://localhost:4000
```

### 3. Development Server
Start the development server for all projects concurrently:
```bash
pnpm dev
# or: npm run dev
```
* Frontend client runs on: `http://localhost:5173`
* Backend server runs on: `http://localhost:4000`

---

## 🐳 Docker Deployment

A multi-container Docker Compose file is provided to configure the server, database, client, and caching services.

1. Create a `.env` file in the root workspace folder with the following variables:
   ```ini
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```

2. Build and start the services:
   ```bash
   docker-compose up --build -d
   ```

This spins up four services:
- **`zira_web`**: Frontend client (Nginx container) exposed on `http://localhost:8080`
- **`zira_server`**: Express API & Socket.IO server on `http://localhost:4000`
- **`zira_mongo`**: Database container (persisted locally to custom volume mappings)
- **`zira_redis`**: Key-value presence store container

---

## 🧪 Testing Strategy

The workspace uses a multi-layered testing workflow:

### 1. Frontend UI Component Tests
Uses `Vitest` and `React Testing Library` to verify shared component render integrity and local user interactions.
```bash
pnpm test --filter=@zira/ui
```

### 2. Integration / Backend REST API Tests
Uses `Jest` and `Supertest` to verify authorization middlewares, endpoint integrity, and MongoDB model operations.
```bash
pnpm test --filter=server
```

### 3. End-to-End Tests
Uses `Playwright` to simulate client actions, socket connection flows, offline operations, and active messaging.
```bash
pnpm test:e2e --filter=web
```

---

## 🔒 Security Posture & Performance Tuning

- **Security Headers**: `Helmet` configured on the Express API server to shield the app from common attack vectors (XSS, Clickjacking, MIME types sniffing).
- **JWT Cookie Guards**: Authentication tokens are served using `HttpOnly`, `Secure` (in production), and `SameSite=Lax` cookies, preventing script-based theft.
- **Horizontal Scale-Out ready**: Uses Redis adapter bindings for Socket.IO, permitting multiple backend container nodes to forward messages to users seamlessly.
- **Rate-Limiting**: IP and User-based token bucket rate limiters can be toggled in Express endpoints via Redis middlewares.
- **Data Compression**: Employs `Brotli` and `Gzip` compression middleware to optimize asset size delivery.