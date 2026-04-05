// backend/src/doctors/dto/submit-documents.dto.ts
import { z } from 'zod';

export const SubmitDocumentsSchema = z.object({
  licenseDocUrl: z.string().url('Invalid license document URL'),
  degreeDocUrl: z.string().url('Invalid degree document URL'),
});

export type SubmitDocumentsDto = z.infer<typeof SubmitDocumentsSchema>;