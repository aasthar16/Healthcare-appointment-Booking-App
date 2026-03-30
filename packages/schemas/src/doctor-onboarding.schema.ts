import { z } from 'zod';

const cuid = () =>
  z.string().regex(/^c[a-z0-9]{24}$/, 'Invalid ID format');

export const SubmitDocumentsSchema = z.object({
  licenseDocUrl: z.string().url('Invalid license document URL'),
  degreeDocUrl: z.string().url('Invalid degree document URL'),
});

export const VerificationDecisionSchema = z.object({
  doctorId: cuid(),
  decision: z.enum(['VERIFIED', 'REJECTED']),
  notes: z.string().max(500).optional(),
});

export const DoctorVerificationStatusSchema = z.enum([
  'PENDING_DOCUMENTS',
  'PENDING_VERIFICATION',
  'VERIFIED',
  'REJECTED',
]);

export const ONBOARDING_TRANSITIONS: Record<string, string[]> = {
  PENDING_DOCUMENTS:    ['PENDING_VERIFICATION'],
  PENDING_VERIFICATION: ['VERIFIED', 'REJECTED'],
  VERIFIED:             [],
  REJECTED:             ['PENDING_DOCUMENTS'],
};

export type SubmitDocumentsDto = z.infer<typeof SubmitDocumentsSchema>;
export type VerificationDecisionDto = z.infer<typeof VerificationDecisionSchema>;
export type DoctorVerificationStatus = z.infer<typeof DoctorVerificationStatusSchema>;