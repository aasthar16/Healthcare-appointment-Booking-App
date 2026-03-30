import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RegisterSchema, LoginSchema } from '@health/schemas';
import type { RegisterDto, LoginDto } from '@health/schemas';
import { Public } from '../common/decorators/public.decorators';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(
    @Body(new ZodValidationPipe(RegisterSchema)) dto: RegisterDto,
  ) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(
    @Body(new ZodValidationPipe(LoginSchema)) dto: LoginDto,
  ) {
    return this.authService.login(dto);
  }
}