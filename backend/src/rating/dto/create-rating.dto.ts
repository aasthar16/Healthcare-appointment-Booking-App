import { z } from 'zod';

export const CreateRatingSchema = z.object({
  doctorId: z.string(),
  appointmentId: z.string(),
  score: z.number().min(1).max(5),
  comment: z.string().min(1).max(500).optional(),
});

export type CreateRatingDto = z.infer<typeof CreateRatingSchema>;