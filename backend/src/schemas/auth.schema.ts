import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  role: z.enum(['DOCTOR', 'PATIENT']),
  name: z.string().min(2).max(100),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
export type LoginDto = z.infer<typeof LoginSchema>