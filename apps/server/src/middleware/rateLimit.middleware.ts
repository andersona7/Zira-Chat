import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis';

interface RateLimiterOptions {
  windowMs: number;
  max: number;
  message: string;
  keyPrefix?: string;
}

/**
 * Enterprise-grade Redis-backed progressive rate limiter.
 * Protects against brute-force attacks by increasing lock duration on repeated failures.
 */
export const rateLimiter = (options: RateLimiterOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Determine unique rate limit key based on request parameters
    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown-ip';
    const prefix = options.keyPrefix || 'rl';
    
    // Check key types (e.g. rate limiting by username or email if present in body)
    const identifier = req.body.username || req.body.email || ip;
    const redisKey = `${prefix}:${identifier}`;

    try {
      if (!redisClient.isOpen) {
        // Fallback to next middleware if Redis is down (high availability principle)
        console.warn('⚠️ Rate limiter: Redis client not open. Bypassing check.');
        return next();
      }

      // Check current hits
      const hits = await redisClient.incr(redisKey);
      
      if (hits === 1) {
        // Set expiry on new key
        await redisClient.expire(redisKey, Math.ceil(options.windowMs / 1000));
      }

      if (hits > options.max) {
        // Implement progressive lock duration extension (progressive cooling off)
        const progressiveWindowMultiplier = Math.min(Math.floor(hits / options.max), 5); // caps multiplier to 5x window time
        await redisClient.expire(redisKey, Math.ceil((options.windowMs * progressiveWindowMultiplier) / 1000));

        return res.status(429).json({
          success: false,
          error: options.message,
          retryAfterMs: options.windowMs * progressiveWindowMultiplier,
        });
      }

      next();
    } catch (error) {
      console.error('Rate limiter execution error:', error);
      next(); // Fail-open approach so legitimate users aren't blocked on infrastructure bugs
    }
  };
};
