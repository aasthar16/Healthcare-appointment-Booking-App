import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CreateOrderSchema, VerifyPaymentSchema } from './dto/create-payment.dto';
import { Role } from '@prisma/client';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-order')
  @Roles(Role.PATIENT)
  async createOrder(
    @Request() req: any,
    @Body(new ZodValidationPipe(CreateOrderSchema)) body: any,
  ) {
    return this.paymentService.createOrder(req.user.sub, body);
  }

  @Post('verify')
  @Roles(Role.PATIENT)
  async verifyPayment(
    @Request() req: any,
    @Body(new ZodValidationPipe(VerifyPaymentSchema)) body: any,
  ) {
    return this.paymentService.verifyPayment(req.user.sub, body);
  }

  @Get('status/:appointmentId')
  @Roles(Role.PATIENT, Role.DOCTOR)
  async getPaymentStatus(@Param('appointmentId') appointmentId: string, @Request() req: any) {
    return this.paymentService.getPaymentStatus(appointmentId, req.user.sub);
  }
}