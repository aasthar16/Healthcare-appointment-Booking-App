import { z } from 'zod';

export const NotificationTypeValues = [
  'APPOINTMENT_CONFIRMED',
  'APPOINTMENT_CANCELLED',
  'APPOINTMENT_REMINDER',
  'APPOINTMENT_RESCHEDULED',
  'MESSAGE_RECEIVED',
  'RATING_REQUEST',
  'PAYMENT_RECEIVED',
  'PAYMENT_FAILED',
  'DOCTOR_RESPONSE',
  'SYSTEM_ALERT',
] as const;

export const CreateNotificationSchema = z.object({
  userId: z.string(),
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  type: z.enum(NotificationTypeValues),
  metadata: z.any().optional(),
});

export type CreateNotificationDto = z.infer<typeof CreateNotificationSchema>;
