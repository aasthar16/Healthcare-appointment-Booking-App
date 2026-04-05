import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request, UsePipes } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { BookingService } from 'src/booking/booking.service';
import { 
  CreateDoctorProfileSchema, 
  CreateDoctorProfileDto,
  UpdateDoctorProfileSchema,
  UpdateDoctorProfileDto,
  SubmitDocumentsSchema,
  SubmitDocumentsDto,
  VerificationDecisionSchema,
  VerificationDecisionDto
} from './dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorators';
import { Role } from '@prisma/client';
import { SearchDoctorsDto } from '../../../packages/schemas/src/booking.schema';

@Controller('doctors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Post('profile')
  @Roles(Role.DOCTOR)
  @UsePipes(new ZodValidationPipe(CreateDoctorProfileSchema))
  createProfile(@Request() req: any, @Body() dto: CreateDoctorProfileDto) {
    return this.doctorsService.createProfile(req.user.sub, dto);
  }



  @Post(':id/documents')
  @Roles(Role.DOCTOR)
  @UsePipes(new ZodValidationPipe(SubmitDocumentsSchema))
  submitDocuments(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: SubmitDocumentsDto,
  ) {
    return this.doctorsService.submitDocuments(id, req.user.sub, dto);
  }

  @Post('verify')
  @Roles(Role.ADMIN)
  @UsePipes(new ZodValidationPipe(VerificationDecisionSchema))
  verifyDoctor(@Request() req: any, @Body() dto: VerificationDecisionDto) {
    return this.doctorsService.verifyDoctor(req.user.sub, dto);
  }

  @Get(':id')
  @Public()
  getProfile(@Param('id') id: string) {
    return this.doctorsService.getProfile(id);
  }

  @Get()
  @Public()
  getAllVerified() {
    return this.doctorsService.getAllVerifiedDoctors();
  }

  @Get('user/:userId')
  @Public()
  async getDoctorByUserId(@Param('userId') userId: string) {
    return this.doctorsService.getDoctorByUserId(userId);
  }

  @Patch(':id')
  @Roles(Role.DOCTOR)
  async updateProfile(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    console.log('Update profile request:', body);
    return this.doctorsService.updateProfile(id, req.user.sub, body);
  }
}
