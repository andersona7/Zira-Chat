import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import { connectRedis } from './config/redis';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import contactRoutes from './routes/contact.routes';
import chatRoutes from './routes/chat.routes';
import mediaRoutes from './routes/media.routes';
import statusRoutes from './routes/status.routes';
import callRoutes from './routes/call.routes';
import gifRoutes from './routes/gif.routes';
import { setupSocketHandlers } from './socket';
import { startMediaCleanupJob } from './utils/mediaCleanup';
import { startSessionCleanupJob } from './utils/sessionCleanup';

import { createAdapter } from '@socket.io/redis-adapter';
import { pubClient, subClient } from './config/redis';

dotenv.config();

const app = express();
const httpServer = createServer(app);

startSessionCleanupJob();

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.adapter(createAdapter(pubClient, subClient));

setupSocketHandlers(io);
startMediaCleanupJob(io);
app.set('io', io);

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(compression()); // Compress all HTTP responses to reduce bandwidth
app.use(express.json());
app.use(cookieParser());

// Initialize Connections
connectDB();
connectRedis();

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/contacts', contactRoutes);
app.use('/api/v1/chats', chatRoutes);
app.use('/api/v1/media', mediaRoutes);
app.use('/api/v1/statuses', statusRoutes);
app.use('/api/v1/calls', callRoutes);
app.use('/api/v1/gifs', gifRoutes);

app.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'Zira Chat API running optimized' } });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Optimized API & WebSocket Server ready at http://localhost:${PORT}`);
});