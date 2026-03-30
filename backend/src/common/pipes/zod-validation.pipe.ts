import { PipeTransform, BadRequestException } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const formatted = (result.error as ZodError).flatten();
      throw new BadRequestException({
        message: 'Validation failed',
        errors: formatted.fieldErrors,
        formErrors: formatted.formErrors,
      });
    }
    return result.data;
  }
}