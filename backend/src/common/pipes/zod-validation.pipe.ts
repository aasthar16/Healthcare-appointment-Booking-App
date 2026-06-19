import { PipeTransform, BadRequestException } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    // ✅ If value is already an object, use it directly
    // ✅ If value is a string, try to parse it
    
    
  // ✅ DEBUG: Log what's coming in
  console.log('🔍 ZodValidationPipe received:', {
    type: typeof value,
    isString: typeof value === 'string',
    isObject: typeof value === 'object' && value !== null,
    value: value,
  });

    let parsedValue = value;
    
    if (typeof value === 'string') {
      try {
        parsedValue = JSON.parse(value);
      } catch (e) {
        // If parsing fails, treat as invalid
        throw new BadRequestException({
          message: 'Validation failed',
          formErrors: ['Invalid JSON format in request body'],
        });
      }
    }

    // ✅ Ensure value is an object
    if (typeof parsedValue !== 'object' || parsedValue === null) {
      throw new BadRequestException({
        message: 'Validation failed',
        formErrors: ['Request body must be a valid object'],
      });
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