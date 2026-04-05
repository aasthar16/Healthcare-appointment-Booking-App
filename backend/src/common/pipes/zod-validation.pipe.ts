import { PipeTransform, BadRequestException } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    // If value is a string, try to parse it as JSON
    let parsedValue = value;
    if (typeof value === 'string') {
      try {
        parsedValue = JSON.parse(value);
      } catch (e) {
        // If parsing fails, keep original value
        parsedValue = value;
      }
    }
    
    const result = this.schema.safeParse(parsedValue);
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