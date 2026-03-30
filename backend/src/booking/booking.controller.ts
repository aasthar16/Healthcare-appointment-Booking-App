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
import {Public} from '../common/decorators/public.decorators';
import {
  CreateBookingSchema,
  SearchDoctorsSchema,
  UpdateAppointmentStatusSchema,
} from '@health/schemas';
import type {
  CreateBookingDto,
  SearchDoctorsDto,
  UpdateAppointmentStatusDto,
} from '@health/schemas';
import { Role } from '@prisma/client';

@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

 
  @Get('doctors')
  searchDoctors(
    @Query(new ZodValidationPipe(SearchDoctorsSchema)) query: any,
  ) {
   
    return this.bookingService.searchDoctors(query);
  }

  // GET /api/bookings/mine
  @Get('mine')
  getMyAppointments(@Req() req: any) {
    return this.bookingService.getMyAppointments(
      req.user.sub,
      req.user.role,
    );
  }

  // POST /api/bookings
  @Post()
  @Roles(Role.PATIENT)
  createAppointment(
    @Req() req: any,
    @Body(new ZodValidationPipe(CreateBookingSchema)) dto: CreateBookingDto,
  ) {
    return this.bookingService.createAppointment(req.user.sub, dto);
  }

  // PATCH /api/bookings/:id/status
  @Patch(':id/status')
  @Roles(Role.PATIENT, Role.DOCTOR)
  updateStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateAppointmentStatusSchema))
    dto: UpdateAppointmentStatusDto,
    @Req() req: any,
  ) {
    return this.bookingService.updateStatus(
      id,
      dto.status,
      req.user.sub,
      req.user.role,
    );
  }
}