import { z } from 'zod';

const cuid = () =>
  z.string().regex(/^c[a-z0-9]{24}$/, 'Invalid ID format');

export const CreateBookingSchema = z.object({
  doctorId: cuid(),
  scheduledAt: z.coerce
    .date()
    .refine((d) => d > new Date(), {
      message: 'Appointment must be scheduled in the future',
    }),
  type: z.enum(['ONLINE', 'OFFLINE'], {
    error: 'Type must be ONLINE or OFFLINE',
  }),
  durationMinutes: z
    .number()
    .int()
    .min(15, 'Minimum duration is 15 minutes')
    .max(120, 'Maximum duration is 120 minutes')
    .default(30),
  notes: z.string().optional(),
  reason: z.string().optional(),
});

export const SearchDoctorsSchema = z.object({
  specialty: z.string().optional(),
  name: z.string().optional(),
  minFee: z.coerce.number().optional(),
  maxFee: z.coerce.number().optional(),
  minRating: z.coerce.number().optional(),
  availability: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const SetAvailabilitySchema = z.object({
  slots: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z
          .string()
          .regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
        endTime: z
          .string()
          .regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
        slotMinutes: z.number().int().min(15).max(120).default(30),
      }),
    )
    .min(1)
    .max(30),
});

export type CreateBookingDto = z.infer<typeof CreateBookingSchema>;
export type SearchDoctorsDto = z.infer<typeof SearchDoctorsSchema>;
export type SetAvailabilityDto = z.infer<typeof SetAvailabilitySchema>;