import { z } from 'zod';
export const CreateBookingSchema = z.object({
  doctorId: z.string().cuid(),
  scheduledAt: z.coerce.date(),
  type: z.enum(['ONLINE', 'OFFLINE']),
  durationMinutes: z.number().int().min(15).max(120).default(30),
});

export type CreateBookingDto = z.infer<typeof CreateBookingSchema>;
