
import { z } from 'zod';


export const createDoctorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  specialty: z.string().min(2, "Specialty must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(10, "Invalid phone number"),
});

export type CreateDoctorDto = z.infer<typeof createDoctorSchema>;