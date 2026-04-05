import { Controller, Post, Get, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { RatingService } from './rating.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CreateRatingSchema, CreateRatingDto } from './dto/create-rating.dto';
import { Role } from '@prisma/client';

@Controller('ratings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @Post()
  @Roles(Role.PATIENT)
  async createRating(@Request() req: any, @Body(new ZodValidationPipe(CreateRatingSchema)) dto: CreateRatingDto) {
    return this.ratingService.createRating(req.user.sub, dto);
  }

  @Get('doctor/:doctorId')
  @Public()
  async getDoctorRatings(@Param('doctorId') doctorId: string) {
    return this.ratingService.getDoctorRatings(doctorId);
  }

  @Get('doctor/:doctorId/average')
  @Public()
  async getDoctorAverageRating(@Param('doctorId') doctorId: string) {
    return this.ratingService.getDoctorAverageRating(doctorId);
  }
}