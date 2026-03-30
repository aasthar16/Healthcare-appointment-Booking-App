import { z } from 'zod';
export const AppointmentStatusSchema = z.enum([
  'SCHEDULED',
  'CHECKED_IN',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
]);


export const VALID_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED:   ['CHECKED_IN', 'CANCELLED'],
  CHECKED_IN:  ['IN_PROGRESS', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED:   [],
  CANCELLED:   [],
  NO_SHOW:     [],
};