import { z } from 'zod';

const cuid = () =>
  z.string().regex(/^c[a-z0-9]{24}$/, 'Invalid ID format');

export const SendMessageSchema = z.object({
  appointmentId: cuid(),
  content: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message cannot exceed 2000 characters')
    .transform((s) => s.trim()),
});

export const JoinRoomSchema = z.object({
  appointmentId: cuid(),
});

export type SendMessageDto = z.infer<typeof SendMessageSchema>;
export type JoinRoomDto = z.infer<typeof JoinRoomSchema>;