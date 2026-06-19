// backend/src/doctors/doctors.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  UseGuards, 
  Request, 
  UsePipes, 
  Req, 
  UnauthorizedException, 
  BadRequestException, 
  UseInterceptors, 
  UploadedFiles, 
  Delete 
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express'; // ✅ CHANGED: Import this
import { DoctorsService } from './doctors.service';
import { 
  CreateDoctorProfileSchema, 
  CreateDoctorProfileDto,
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
import { multerConfig } from '../config/multer.config';

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
  async submitDocuments(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    console.log('📥 Body type:', typeof body);
    console.log('📥 Body:', body);
    
    let parsedBody = body;
    if (typeof body === 'string') {
      try {
        parsedBody = JSON.parse(body);
        console.log('✅ Parsed to object:', parsedBody);
      } catch (e) {
        throw new BadRequestException('Invalid JSON format in request body');
      }
    }
    
    const result = SubmitDocumentsSchema.safeParse(parsedBody);
    if (!result.success) {
      const formatted = result.error.flatten();
      throw new BadRequestException({
        message: 'Validation failed',
        errors: formatted.fieldErrors,
        formErrors: formatted.formErrors,
      });
    }
    
    const dto = result.data;
    console.log('✅ Validated DTO:', dto);
    
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
  
  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  async getDoctorByUserId(@Param('userId') userId: string, @Req() req: any) {
    if (req.user.sub !== userId) {
      throw new UnauthorizedException('Not authorized to view this profile');
    }
    return this.doctorsService.getDoctorByUserId(userId);
  }

  @Get('details/:doctorId')
  @UseGuards(JwtAuthGuard)
  async getDoctorById(@Param('doctorId') doctorId: string, @Req() req: any) {
    return this.doctorsService.getDoctorById(doctorId, req.user.sub);
  }

  @Patch('update/:doctorId')
  @UseGuards(JwtAuthGuard)
  async updateDoctor(
    @Param('doctorId') doctorId: string,
    @Body() updateData: any,
    @Req() req: any,
  ) {
    return this.doctorsService.updateDoctor(doctorId, updateData, req.user.sub);
  }

  // ✅ FIXED: Upload Documents Route - Maps frontend fields to service fields
  @Post('documents/upload/:doctorId')
  @Roles(Role.DOCTOR)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'license', maxCount: 1 },
        { name: 'degree', maxCount: 1 },
      ],
      multerConfig
    )
  )
  async uploadDocuments(
    @Param('doctorId') doctorId: string,
    @Request() req: any,
    @UploadedFiles() files: { 
      license?: Express.Multer.File[]; 
      degree?: Express.Multer.File[] 
    },
  ) {
    console.log('📥 Received document upload request for doctor:', doctorId);
    console.log('📦 Files received:', {
      license: files?.license?.length || 0,
      degree: files?.degree?.length || 0,
    });

    // Check if at least one file was uploaded
    if (!files?.license?.length && !files?.degree?.length) {
      throw new BadRequestException('Please upload at least one document (license or degree)');
    }

    // ✅ MAP the fields: frontend sends 'license'/'degree', service expects 'licenseDoc'/'degreeDoc'
    const mappedFiles = {
      licenseDoc: files?.license || [],
      degreeDoc: files?.degree || [],
    };

    // Process the files
    const result = await this.doctorsService.uploadDocuments(
      doctorId,
      req.user.sub,
      mappedFiles
    );

    return result;
  }

  // ✅ Delete Document Route
  @Delete('documents/:doctorId/:type')
  @Roles(Role.DOCTOR)
  async deleteDocument(
    @Param('doctorId') doctorId: string,
    @Param('type') type: 'license' | 'degree',
    @Request() req: any,
  ) {
    return this.doctorsService.deleteDocument(doctorId, req.user.sub, type);
  }
}