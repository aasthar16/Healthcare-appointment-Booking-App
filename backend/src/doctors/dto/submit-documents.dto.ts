import { z } from 'zod';

// ✅ Updated: Now expects file uploads instead of URLs
export const SubmitDocumentsSchema = z.object({
  // No fields needed - files will be uploaded via multer
});

export type SubmitDocumentsDto = z.infer<typeof SubmitDocumentsSchema>;