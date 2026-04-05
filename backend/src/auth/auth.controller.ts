// backend/src/auth/auth.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorators';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

 

@Public()
@Post('register')
async register(@Body() registerDto: {
  email: string;
  password: string;
  name: string;
  role: 'PATIENT' | 'DOCTOR';
  specialty?: string;
  bio?: string;
  consultationFee?: number;
}) {
  console.log("=== CONTROLLER: Register endpoint ===");
  return this.authService.register(registerDto);
}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: { email: string; password: string }) {
    return this.authService.login(loginDto);
  }
}