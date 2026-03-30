import { z } from 'zod';

export const AppointmentStatusSchema = z.enum([
  'SCHEDULED',
  'CHECKED_IN',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
]);

export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>;

export const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  SCHEDULED: ['CHECKED_IN', 'CANCELLED'],
  CHECKED_IN: ['IN_PROGRESS', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export const UpdateAppointmentStatusSchema = z.object({
  status: AppointmentStatusSchema,
});

export const TRANSITION_ACTOR: Record<AppointmentStatus, 'PATIENT' | 'DOCTOR' | 'ANY'> = {
  SCHEDULED: 'ANY',
  CHECKED_IN: 'PATIENT',
  IN_PROGRESS: 'DOCTOR',
  COMPLETED: 'DOCTOR',
  CANCELLED: 'ANY',
  NO_SHOW: 'DOCTOR',
};

export type UpdateAppointmentStatusDto = z.infer<typeof UpdateAppointmentStatusSchema>;