import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Req, 
  UploadedFiles, 
  UseInterceptors,
  UnauthorizedException,
  NotFoundException
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { multerConfig } from '../config/multer.config';

@Controller('patients')
export class PatientsController {
  constructor(
    private readonly patientsService: PatientsService,
  private readonly prisma: PrismaService, ) {}

     @Get('my-patients')
  @UseGuards(JwtAuthGuard)
  async getMyPatients(@Req() req: any) {
    console.log('🔴🔴🔴 CONTROLLER: getMyPatients CALLED 🔴🔴🔴');
    console.log('User ID:', req.user.sub);
    try {
      const result = await this.patientsService.getMyPatients(req.user.sub);
      console.log('🔴 Result:', result);
      return result;
    } catch (error) {
      console.error('🔴 Error:', error);
      return [];
    }
  }
    
  // ==================== UPDATE PATIENT PROFILE ====================
  @Patch('update')
  @UseGuards(JwtAuthGuard)
  async updatePatient(@Body() updateData: any, @Req() req: any) {
    // ✅ Use req.user.sub (not req.user.id)
    const userId = req.user.sub;
    console.log('🔵 updatePatient - userId from token:', userId);
    return this.patientsService.updatePatientByUserId(userId, updateData);
  }

  // ==================== GET PATIENT BY USER ID ====================
  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  async getPatientByUserId(@Param('userId') userId: string, @Req() req: any) {
    // ✅ Use req.user.sub (not req.user.id)
    if (req.user.sub !== userId) {
      throw new UnauthorizedException('Not authorized to view this profile');
    }
    return this.patientsService.getPatientByUserId(userId);
  }

  // ==================== GET PATIENT BY PATIENT ID ====================
  @Get(':patientId')
  @UseGuards(JwtAuthGuard)
  async getPatientById(@Param('patientId') patientId: string, @Req() req: any) {
    const patient = await this.patientsService.getPatientById(patientId);
    // ✅ Use req.user.sub (not req.user.id)
    if (patient.userId !== req.user.sub) {
      throw new UnauthorizedException('Not authorized to view this profile');
    }
    return patient;
  }

  // ==================== UPLOAD MEDIA ====================
  @Post(':patientId/media')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files', 20, multerConfig))
  async uploadMedia(
    @Param('patientId') patientId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    const patient = await this.patientsService.getPatientById(patientId);
    // ✅ Use req.user.sub (not req.user.id)
    if (patient.userId !== req.user.sub) {
      throw new UnauthorizedException('Not authorized to upload files');
    }
    return this.patientsService.uploadMedia(patientId, files);
  }

  // ==================== DELETE MEDIA ====================
  @Delete('media/:mediaId')
  @UseGuards(JwtAuthGuard)
  async deleteMedia(@Param('mediaId') mediaId: string, @Req() req: any) {
    // ✅ Use req.user.sub (not req.user.id)
    return this.patientsService.deleteMedia(mediaId, req.user.sub);
  }


}