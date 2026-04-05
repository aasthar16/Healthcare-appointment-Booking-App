import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { Public } from '../common/decorators/public.decorators';
import {
  CreateBookingSchema,
  SearchDoctorsSchema,
} from '@health/schemas';
import type { CreateBookingDto, SearchDoctorsDto } from '@health/schemas';
import { Role } from '@prisma/client';

@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  // Public - Search doctors
 @Get('doctors')
@Public()
async searchDoctors(@Query() query: any) {
  console.log('Search doctors called');
  return this.bookingService.searchDoctors(query);
}

  // Get my appointments
  @Get('mine')
  getMyAppointments(@Req() req: any) {
    return this.bookingService.getMyAppointments(req.user.sub, req.user.role);
  }

  // Patient requests appointment (PENDING)
  @Post('request')
  @Roles(Role.PATIENT)
  requestAppointment(
    @Req() req: any,
    @Body(new ZodValidationPipe(CreateBookingSchema)) dto: CreateBookingDto,
  ) {
    return this.bookingService.requestAppointment(req.user.sub, dto);
  }

  // Doctor accepts appointment
  @Patch(':id/accept')
  @Roles(Role.DOCTOR)
  acceptAppointment(@Param('id') id: string, @Req() req: any) {
    return this.bookingService.acceptAppointment(id, req.user.sub);
  }

  // Doctor rejects appointment
  @Patch(':id/reject')
  @Roles(Role.DOCTOR)
  rejectAppointment(@Param('id') id: string, @Req() req: any) {
    return this.bookingService.rejectAppointment(id, req.user.sub);
  }


  // Doctor proposes new time
  @Patch(':id/propose-time')
  @Roles(Role.DOCTOR)
  proposeNewTime(
    @Param('id') id: string,
    @Req() req: any,
    @Body('scheduledAt') scheduledAt: string,
  ) {
    return this.bookingService.proposeNewTime(id, req.user.sub, new Date(scheduledAt));
  }

  // Patient accepts counter offer
  @Patch(':id/accept-counter')
  @Roles(Role.PATIENT)
  acceptCounterOffer(@Param('id') id: string, @Req() req: any) {
    return this.bookingService.acceptCounterOffer(id, req.user.sub);
  }

  // Patient rejects counter offer
  @Patch(':id/reject-counter')
  @Roles(Role.PATIENT)
  rejectCounterOffer(@Param('id') id: string, @Req() req: any) {
    return this.bookingService.rejectCounterOffer(id, req.user.sub);
  }
}