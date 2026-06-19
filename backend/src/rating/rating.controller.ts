// backend/src/rating/rating.controller.ts
import { Controller, Get, Post, Body, UseGuards, Request, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RatingService } from './rating.service';
import { CreateRatingDto } from './dto/create-rating.dto';

@Controller('ratings')
@UseGuards(JwtAuthGuard)
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @Post()
  async createRating(@Request() req: any, @Body() dto: CreateRatingDto) {
    return this.ratingService.createRating(req.user.sub, dto);
  }

  // ✅ GET patient appointments with rating status
  @Get('appointments/patient')
  async getPatientAppointments(@Request() req: any) {
    return this.ratingService.getPatientAppointmentsWithRatings(req.user.sub);
  }

  // ✅ GET doctor appointments with rating status
  @Get('appointments/doctor')
  async getDoctorAppointments(@Request() req: any) {
    return this.ratingService.getDoctorAppointmentsWithRatings(req.user.sub);
  }

  @Get('doctor/:doctorId')
  async getDoctorRatings(@Param('doctorId') doctorId: string) {
    return this.ratingService.getDoctorRatings(doctorId);
  }

  @Get('doctor/:doctorId/average')
  async getDoctorAverageRating(@Param('doctorId') doctorId: string) {
    return this.ratingService.getDoctorAverageRating(doctorId);
  }
}