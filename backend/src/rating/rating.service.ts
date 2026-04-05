import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRatingDto } from './dto/create-rating.dto';

@Injectable()
export class RatingService {
  constructor(private readonly prisma: PrismaService) {}

  async createRating(patientUserId: string, dto: CreateRatingDto) {
    // Verify appointment exists and belongs to patient
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
      include: { 
        patient: true,
        doctor: true 
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Check if patient owns this appointment
    const patient = await this.prisma.patient.findUnique({
      where: { id: appointment.patientId },
    });

    if (!patient || patient.userId !== patientUserId) {
      throw new BadRequestException('Not your appointment');
    }

    if (appointment.status !== 'COMPLETED') {
      throw new BadRequestException('Can only rate completed appointments');
    }

    // Check if already rated
    const existingRating = await this.prisma.rating.findUnique({
      where: { appointmentId: dto.appointmentId },
    });

    if (existingRating) {
      throw new BadRequestException('Already rated this appointment');
    }

    // Create rating
    const rating = await this.prisma.rating.create({
      data: {
        doctorId: dto.doctorId,
        patientId: appointment.patientId,
        appointmentId: dto.appointmentId,
        score: dto.score,
        comment: dto.comment,
      },
    });

    return rating;
  }

  async getDoctorRatings(doctorId: string) {
    const ratings = await this.prisma.rating.findMany({
      where: { doctorId },
      orderBy: { createdAt: 'desc' },
    });

    // Get patient names
    const ratingsWithPatients = await Promise.all(
      ratings.map(async (rating) => {
        const patient = await this.prisma.patient.findUnique({
          where: { id: rating.patientId },
          select: { name: true },
        });
        return { ...rating, patient };
      })
    );

    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
      : null;

    return {
      ratings: ratingsWithPatients,
      averageRating,
      totalRatings: ratings.length,
      distribution: {
        5: ratings.filter(r => r.score === 5).length,
        4: ratings.filter(r => r.score === 4).length,
        3: ratings.filter(r => r.score === 3).length,
        2: ratings.filter(r => r.score === 2).length,
        1: ratings.filter(r => r.score === 1).length,
      },
    };
  }

  async getDoctorAverageRating(doctorId: string) {
    const ratings = await this.prisma.rating.findMany({
      where: { doctorId },
      select: { score: true },
    });

    if (ratings.length === 0) return null;

    const average = ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length;
    return { averageRating: average, totalRatings: ratings.length };
  }
}