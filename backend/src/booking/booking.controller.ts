// backend/src/booking/booking.controller.ts
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
  NotFoundException,
  UnauthorizedException,
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
import { PrismaService } from '../../prisma/prisma.service';

// type NewType = PrismaService;

@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
  // private readonly prisma: PrismaService,
) {}

  @Get('doctors')
  @Public()
  async searchDoctors(@Query() query: any) {
    console.log('Search doctors called');
    return this.bookingService.searchDoctors(query);
  }

  // ✅ Get my appointments
  @Get('mine')
  getMyAppointments(@Req() req: any) {
    return this.bookingService.getMyAppointments(req.user.sub, req.user.role);
  }

  // Patient requests appointment
  @Post('request')
  @Roles(Role.PATIENT)
  requestAppointment(
    @Req() req: any,
    @Body(new ZodValidationPipe(CreateBookingSchema)) dto: CreateBookingDto,
  ) {
    return this.bookingService.requestAppointment(req.user.sub, dto);
  }

  // ✅ Doctor accepts appointment
  @Patch(':id/accept')
  @Roles(Role.DOCTOR)
  acceptAppointment(@Param('id') id: string, @Req() req: any) {
    return this.bookingService.acceptAppointment(id, req.user.sub);
  }

  // ✅ Doctor rejects appointment
  @Patch(':id/reject')
  @Roles(Role.DOCTOR)
  rejectAppointment(@Param('id') id: string, @Req() req: any) {
    return this.bookingService.rejectAppointment(id, req.user.sub);
  }

  // ✅ Doctor proposes new time
  @Patch(':id/propose-time')
  @Roles(Role.DOCTOR)
  proposeNewTime(
    @Param('id') id: string,
    @Req() req: any,
    @Body('scheduledAt') scheduledAt: string,
  ) {
    return this.bookingService.proposeNewTime(id, req.user.sub, new Date(scheduledAt));
  }

  // ✅ Patient accepts counter offer
  @Patch(':id/accept-counter')
  @Roles(Role.PATIENT)
  acceptCounterOffer(@Param('id') id: string, @Req() req: any) {
    return this.bookingService.acceptCounterOffer(id, req.user.sub);
  }

  // ✅ Patient rejects counter offer
  @Patch(':id/reject-counter')
  @Roles(Role.PATIENT)
  rejectCounterOffer(@Param('id') id: string, @Req() req: any) {
    return this.bookingService.rejectCounterOffer(id, req.user.sub);
  }

  // ✅ ADD THIS - Complete appointment
  @Patch(':id/complete')
  @Roles(Role.DOCTOR)
  completeAppointment(@Param('id') id: string, @Req() req: any) {
    return this.bookingService.completeAppointment(id, req.user.sub);
  }

  // ✅ ADD THIS - Cancel appointment
  @Patch(':id/cancel')
  @Roles(Role.DOCTOR)
  cancelAppointment(@Param('id') id: string, @Req() req: any) {
    return this.bookingService.cancelAppointment(id, req.user.sub);
  }

  // ==================== BOOK APPOINTMENT WITH FRIENDLY ERROR ====================
@Post('book-friendly')
@Roles(Role.PATIENT)
async bookAppointmentFriendly(
  @Req() req: any,
  @Body() body: {
    doctorId: string;
    availabilityId: string;
    scheduledAt: string;
    type?: 'ONLINE' | 'OFFLINE';
  },
) {
  console.log('📥 Book friendly request received');
  return this.bookingService.bookAppointmentFriendly(
    req.user.sub,  // ✅ Pass User ID
    body.doctorId,
    body.availabilityId,
    new Date(body.scheduledAt),
    body.type as any,
  );
}

// ==================== GET QUEUE STATUS ====================
@Get('queue/:appointmentId')
async getQueueStatus(
  @Param('appointmentId') appointmentId: string,
  @Req() req: any,
) {
  return this.bookingService.getQueueStatus(appointmentId, req.user.sub);
}

// ==================== GET DOCTOR QUEUE ====================
@Get('doctor-queue/:doctorId')
@Roles(Role.DOCTOR)
async getDoctorQueue(
  @Param('doctorId') doctorId: string,
  @Query('date') date: string,
  @Req() req: any,
) {
  const parsedDate = date ? new Date(date) : new Date();
  return this.bookingService.getDoctorQueue(doctorId, parsedDate);
}


  // ==================== GET APPOINTMENT ACCESS STATUS ====================
@Get(':id/access')
async getAppointmentAccess(
  @Param('id') appointmentId: string,
  @Req() req: any,
) {
  return this.bookingService.getAppointmentAccess(
    appointmentId,
    req.user.sub,
    req.user.role,
  );
}
}