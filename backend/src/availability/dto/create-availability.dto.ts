import { z } from 'zod';

export const SetAvailabilitySchema = z.object({
  date: z.string().date(),
  slots: z.array(z.object({
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    isAvailable: z.boolean(),
  })),
});

export const GetAvailabilitySchema = z.object({
  doctorId: z.string(),
  startDate: z.string().date(),
  endDate: z.string().date(),
});

export type SetAvailabilityDto = z.infer<typeof SetAvailabilitySchema>;
export type GetAvailabilityDto = z.infer<typeof GetAvailabilitySchema>;