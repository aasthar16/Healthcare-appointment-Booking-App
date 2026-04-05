import { z } from 'zod';

export const CreateDoctorProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  specialty: z.string().min(2, 'Specialty must be at least 2 characters'),
  bio: z.string().optional(),
  consultationFee: z.number().min(0).optional(),
});

export type CreateDoctorProfileDto = z.infer<typeof CreateDoctorProfileSchema>;