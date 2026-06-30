import { z } from 'zod';

export const addContactSchema = z.object({
  body: z.object({
    username: z.string().min(5, 'Username must be at least 5 characters').max(20, 'Username cannot exceed 20 characters'),
    customName: z.string().optional(),
  }),
});

export const updateContactSchema = z.object({
  body: z.object({
    customName: z.string().optional(),
    isBlocked: z.boolean().optional(),
  }),
});