// backend/src/doctors/dto/verification-decision.dto.ts
import { z } from 'zod';

export const VerificationDecisionSchema = z.object({
  doctorId: z.string(),
  decision: z.enum(['VERIFIED', 'REJECTED']),
  notes: z.string().max(500).optional(),
});

export type VerificationDecisionDto = z.infer<typeof VerificationDecisionSchema>;