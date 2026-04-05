import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorators';
import { Role } from '@prisma/client';

@Controller('availability')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get('doctor/:doctorId')
  @Public()
  async getDoctorAvailability(
    @Param('doctorId') doctorId: string,
    @Query('date') date: string,
  ) {
    return this.availabilityService.getDoctorAvailability(doctorId, new Date(date));
  }

  @Post('unavailable')
  @Roles(Role.DOCTOR)
  async setUnavailable(
    @Request() req: any,
    @Body() body: { date: string; slots: string[] },
  ) {
    const doctor = await this.availabilityService.getDoctorByUserId(req.user.sub);
    return this.availabilityService.setUnavailable(doctor.id, new Date(body.date), body.slots);
  }

  @Patch('toggle/:slotId')
  @Roles(Role.DOCTOR)
  async toggleSlot(
    @Param('slotId') slotId: string,
    @Body() body: { isAvailable: boolean },
    @Request() req: any,
  ) {
    const doctor = await this.availabilityService.getDoctorByUserId(req.user.sub);
    return this.availabilityService.toggleSlot(doctor.id, slotId, body.isAvailable);
  }
}
