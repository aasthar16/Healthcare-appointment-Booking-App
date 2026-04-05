import { Controller, Get, Post, Patch, Param, UseGuards, Req, Body } from '@nestjs/common';
import { QueueService } from './queue.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('queue')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get('doctor/:doctorId')
  async getDoctorQueue(@Param('doctorId') doctorId: string) {
    return this.queueService.getDoctorQueue(doctorId);
  }

  @Post('appointment/:appointmentId')
  @Roles(Role.PATIENT)
  async joinQueue(@Param('appointmentId') appointmentId: string, @Req() req: any) {
    return this.queueService.joinQueue(appointmentId, req.user.sub);
  }

  @Patch(':queueId/status')
  @Roles(Role.DOCTOR)
  async updateStatus(@Param('queueId') queueId: string, @Body('status') status: string) {
    return this.queueService.updateStatus(queueId, status);
  }
}