import { z } from 'zod';

const cuid = () =>
  z.string().regex(/^c[a-z0-9]{24}$/, 'Invalid ID format');

export const CreateRatingSchema = z.object({
  appointmentId: cuid(),
  score: z
    .number()
    .int()
    .min(1, 'Score must be at least 1')
    .max(5, 'Score must not exceed 5'),
  comment: z.string().max(500).optional(),
});

export type CreateRatingDto = z.infer<typeof CreateRatingSchema>;