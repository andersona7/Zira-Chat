import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// Define a robust Redis client connection
export const redisClient = createClient({
  url: process.env.REDIS_URI || 'redis://localhost:6379',
});

export const pubClient = redisClient;
export const subClient = redisClient.duplicate();

redisClient.on('error', (err) => console.error('❌ Redis Client Error', err));
redisClient.on('connect', () => console.log('✅ Redis Client Connected'));
subClient.on('error', (err) => console.error('❌ Redis subClient Error', err));
subClient.on('connect', () => console.log('✅ Redis subClient Connected'));

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
  if (!subClient.isOpen) {
    await subClient.connect();
  }
};