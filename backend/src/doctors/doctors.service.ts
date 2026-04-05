import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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

  async getDoctorByUserId(userId: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { userId },
    });

    if (!doctor) {
      return null;
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
}
