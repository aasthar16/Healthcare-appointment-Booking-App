import { z } from 'zod';

export const CreateOrderSchema = z.object({
  appointmentId: z.string(),
  amount: z.number().min(1, 'Amount must be greater than 0'),
  currency: z.string().default('INR'),
});

export const VerifyPaymentSchema = z.object({
  orderId: z.string(),
  paymentId: z.string(),
  signature: z.string(),
  appointmentId: z.string(),
});

export type CreateOrderDto = z.infer<typeof CreateOrderSchema>;
export type VerifyPaymentDto = z.infer<typeof VerifyPaymentSchema>;