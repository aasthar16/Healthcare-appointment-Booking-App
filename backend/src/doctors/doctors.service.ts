import { Injectable, NotFoundException, BadRequestException, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { CreateDoctorProfileDto, UpdateDoctorProfileDto, SubmitDocumentsDto, VerificationDecisionDto } from './dto';

@Injectable()
export class DoctorsService {
  constructor(private readonly prisma: PrismaService) {}

  async createProfile(userId: string, dto: CreateDoctorProfileDto) {
    const existing = await this.prisma.doctor.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new BadRequestException('Doctor profile already exists');
    }

    const doctor = await this.prisma.doctor.create({
      data: {
        userId,
        name: dto.name,
        specialty: dto.specialty,
        bio: dto.bio,
        consultationFee: dto.consultationFee,
        verificationStatus: 'PENDING_DOCUMENTS',
        defaultMaxCapacity: dto.defaultMaxCapacity || 5,
      },
    });

    return doctor;
  }

  async updateProfile(doctorId: string, userId: string, dto: UpdateDoctorProfileDto) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { id: doctorId, userId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    return this.prisma.doctor.update({
      where: { id: doctorId },
      data: dto,
    });
  }

  async submitDocuments(doctorId: string, userId: string, dto: SubmitDocumentsDto) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { id: doctorId, userId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const updated = await this.prisma.doctor.update({
      where: { id: doctorId },
      data: {
        licenseDocUrl: dto.licenseDocUrl,
        degreeDocUrl: dto.degreeDocUrl,
        verificationStatus: 'PENDING_VERIFICATION',
      },
    });

    return updated;
  }

  // async getDoctorByUserId(userId: string) {
  //   const doctor = await this.prisma.doctor.findUnique({
  //     where: { userId },
  //   });

  //   if (!doctor) {
  //     return null;
  //   }

  //   // Get ratings separately
  //   const ratings = await this.prisma.rating.findMany({
  //     where: { doctorId: doctor.id },
  //     select: { score: true },
  //   });

  //   let averageRating = null;
  //   if (ratings.length > 0) {
  //     const sum = ratings.reduce((acc, curr) => acc + curr.score, 0);
  //     averageRating = sum / ratings.length;
  //   }

  //   return {
  //     ...doctor,
  //     averageRating,
  //     totalRatings: ratings.length,
  //   };
  // }

  async getAllVerifiedDoctors() {
    const doctors = await this.prisma.doctor.findMany({
      where: { verificationStatus: 'VERIFIED' },
    });

    // Get ratings for each doctor
    const doctorsWithRatings = await Promise.all(
      doctors.map(async (doctor) => {
        const ratings = await this.prisma.rating.findMany({
          where: { doctorId: doctor.id },
          select: { score: true },
        });
        
        let averageRating = null;
        if (ratings.length > 0) {
          const sum = ratings.reduce((acc, curr) => acc + curr.score, 0);
          averageRating = sum / ratings.length;
        }
        
        return {
          id: doctor.id,
          userId: doctor.userId,
          name: doctor.name,
          specialty: doctor.specialty,
          bio: doctor.bio,
          avatarUrl: doctor.avatarUrl,
          consultationFee: doctor.consultationFee,
          verificationStatus: doctor.verificationStatus,
          createdAt: doctor.createdAt,
          averageRating,
          totalRatings: ratings.length,
        };
      })
    );

    return doctorsWithRatings;
  }

  async getProfile(id: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: {
        user: { select: { email: true } },
      },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    // Get ratings separately
    const ratings = await this.prisma.rating.findMany({
      where: { doctorId: doctor.id },
      select: { score: true },
    });

    let averageRating = null;
    if (ratings.length > 0) {
      const sum = ratings.reduce((acc, curr) => acc + curr.score, 0);
      averageRating = sum / ratings.length;
    }

    return {
      ...doctor,
      averageRating,
      totalRatings: ratings.length,
    };
  }

  async verifyDoctor(adminId: string, dto: VerificationDecisionDto) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: dto.doctorId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    return this.prisma.doctor.update({
      where: { id: dto.doctorId },
      data: { verificationStatus: dto.decision },
    });
  }
   
//  async getDoctorByUserId(userId: string) {
//     const doctor = await this.prisma.doctor.findUnique({
//       where: { userId },
//       include: {
//         user: {
//           select: {
//             email: true,
//             role: true,
//           },
//         },
//         ratings: true,
//       },
//     });

//     if (!doctor) {
//       throw new NotFoundException('Doctor profile not found');
//     }

//     // Calculate average rating
//     const ratings = doctor.ratings || [];
//     const averageRating = ratings.length > 0
//       ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
//       : null;

//     return {
//       ...doctor,
//       averageRating,
//       totalRatings: ratings.length,
//     };
//   }

  async getDoctorByUserId(userId: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            email: true,
            role: true,
          },
        },
        ratings: true,
      },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    // Calculate average rating
    const ratings = doctor.ratings || [];
    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
      : null;

    return {
      ...doctor,
      averageRating,
      totalRatings: ratings.length,
    };
  }

  async getDoctorById(doctorId: string, requestingUserId: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        user: {
          select: {
            email: true,
            role: true,
          },
        },
        ratings: true,
      },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    // Authorization check in service
    if (doctor.userId !== requestingUserId) {
      throw new UnauthorizedException('Not authorized to view this profile');
    }

    // Calculate average rating
    const ratings = doctor.ratings || [];
    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
      : null;

    return {
      ...doctor,
      averageRating,
      totalRatings: ratings.length,
    };
  }

  async updateDoctor(doctorId: string, updateData: any, requestingUserId: string) {
  const doctor = await this.prisma.doctor.findUnique({
    where: { id: doctorId },
  });

  if (!doctor) {
    throw new NotFoundException('Doctor not found');
  }

  if (doctor.userId !== requestingUserId) {
    throw new UnauthorizedException('Not authorized to update this profile');
  }

  // ✅ OPTIONAL: Restrict which fields can be updated
  const allowedFields = ['name', 'specialty', 'bio', 'consultationFee', 'defaultMaxCapacity'];
  const filteredData: any = {};
  for (const key of allowedFields) {
    if (updateData[key] !== undefined) {
      filteredData[key] = updateData[key];
    }
  }

  return this.prisma.doctor.update({
    where: { id: doctorId },
    data: filteredData,
  });
}

   async uploadDocuments(doctorId: string, userId: string, files: { licenseDoc?: Express.Multer.File[], degreeDoc?: Express.Multer.File[] }) {
    // Check if doctor exists and belongs to user
    const doctor = await this.prisma.doctor.findFirst({
      where: { id: doctorId, userId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const updateData: any = {};
    const uploadedFiles: { licenseDocUrl?: string; degreeDocUrl?: string } = {};

    // ✅ Upload license document
    if (files.licenseDoc && files.licenseDoc.length > 0) {
      const file = files.licenseDoc[0];
      try {
        console.log(`📤 Uploading license document: ${file.originalname}`);
        const result = await this.uploadToCloudinary(file, 'healthcare/doctors/license');
        updateData.licenseDocUrl = result.secure_url;
        uploadedFiles.licenseDocUrl = result.secure_url;
        console.log(`✅ License uploaded: ${result.secure_url}`);
      } catch (error) {
        console.error('❌ License upload error:', error);
        throw new InternalServerErrorException('Failed to upload license document');
      }
    }

    // ✅ Upload degree document
    if (files.degreeDoc && files.degreeDoc.length > 0) {
      const file = files.degreeDoc[0];
      try {
        console.log(`📤 Uploading degree document: ${file.originalname}`);
        const result = await this.uploadToCloudinary(file, 'healthcare/doctors/degree');
        updateData.degreeDocUrl = result.secure_url;
        uploadedFiles.degreeDocUrl = result.secure_url;
        console.log(`✅ Degree uploaded: ${result.secure_url}`);
      } catch (error) {
        console.error('❌ Degree upload error:', error);
        throw new InternalServerErrorException('Failed to upload degree document');
      }
    }

    // ✅ Update verification status if both documents are uploaded
    if (updateData.licenseDocUrl && updateData.degreeDocUrl) {
      updateData.verificationStatus = 'PENDING_VERIFICATION';
    }

    // ✅ Update doctor in database
    const updated = await this.prisma.doctor.update({
      where: { id: doctorId },
      data: updateData,
    });

    return {
      doctor: updated,
      uploadedFiles,
    };
  }

  // ==================== UPLOAD TO CLOUDINARY HELPER ====================
  private async uploadToCloudinary(file: Express.Multer.File, folder: string): Promise<UploadApiResponse> {
    return new Promise<UploadApiResponse>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: folder,
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve(result);
          } else {
            reject(new Error('Upload failed - no result'));
          }
        }
      ).end(file.buffer);
    });
  }

  // ==================== DELETE DOCUMENT FROM CLOUDINARY ====================
  async deleteDocument(doctorId: string, userId: string, documentType: 'license' | 'degree') {
    const doctor = await this.prisma.doctor.findFirst({
      where: { id: doctorId, userId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const fieldName = documentType === 'license' ? 'licenseDocUrl' : 'degreeDocUrl';
    const docUrl = doctor[fieldName];

    if (!docUrl) {
      throw new NotFoundException(`${documentType} document not found`);
    }

    try {
      const urlParts = docUrl.split('/');
      const publicIdWithExtension = urlParts.slice(-1)[0];
      const folderPath = documentType === 'license' ? 'healthcare/doctors/license' : 'healthcare/doctors/degree';
      const publicId = `${folderPath}/${publicIdWithExtension.split('.')[0]}`;
      
      await cloudinary.uploader.destroy(publicId);
      console.log(`✅ Deleted from Cloudinary: ${publicId}`);
    } catch (error) {
      console.log('⚠️ Cloudinary delete failed, continuing...', error);
    }

    // ✅ Remove URL from database and update status
    const otherField = documentType === 'license' ? 'degreeDocUrl' : 'licenseDocUrl';
    const hasOtherDoc = doctor[otherField] !== null;

    const updated = await this.prisma.doctor.update({
      where: { id: doctorId },
      data: {
        [fieldName]: null,
        verificationStatus: hasOtherDoc ? 'PENDING_VERIFICATION' : 'PENDING_DOCUMENTS',
      },
    });

    return { message: `${documentType} document deleted successfully`, doctor: updated };
  }
}

