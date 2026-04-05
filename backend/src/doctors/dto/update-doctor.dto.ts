import { z } from 'zod';
import { CreateDoctorProfileSchema } from './create-doctor.dto';

export const UpdateDoctorProfileSchema = CreateDoctorProfileSchema.partial();

export type UpdateDoctorProfileDto = z.infer<typeof UpdateDoctorProfileSchema>;