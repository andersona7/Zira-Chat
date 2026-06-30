import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    displayName: z.string().min(2, 'Name must be at least 2 characters').optional(),
    about: z.string().max(140, 'About cannot exceed 140 characters').optional(),
    avatarUrl: z.string().url('Invalid URL format').optional().or(z.literal('')),
  }),
});

export const searchUserSchema = z.object({
  query: z.object({
    q: z.string().min(3, 'Search query must be at least 3 characters'),
  }),
});