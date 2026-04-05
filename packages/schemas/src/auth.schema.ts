import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must not exceed 72 characters'),
  role: z.enum(['DOCTOR', 'PATIENT'], {
    error: 'Role must be DOCTOR or PATIENT',
  }),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters'),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const UpdatePatientProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  dateOfBirth: z.coerce.date().optional(),
  allergies: z.array(z.string().max(100)).max(50).optional(),
  currentMedications: z.array(z.string().max(100)).max(50).optional(),
  bloodGroup: z
    .enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .optional(),
  emergencyContact: z.string().max(20).optional(),
});

export const UpdateDoctorProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  specialty: z.string().min(2).max(100).optional(),
  bio: z.string().max(1000).optional(),
  consultationFee: z.number().int().min(0).optional(),
  avatarUrl: z.string().url().optional(),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type UpdatePatientProfileDto = z.infer<typeof UpdatePatientProfileSchema>;
export type UpdateDoctorProfileDto = z.infer<typeof UpdateDoctorProfileSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;