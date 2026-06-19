// backend/src/rating/rating.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRatingDto } from './dto/create-rating.dto';

@Injectable()
export class RatingService {
  constructor(private readonly prisma: PrismaService) {}

  // ✅ Get patient appointments with rating status
  async getPatientAppointmentsWithRatings(patientUserId: string) {
    try {
      // Get the patient
      const patient = await this.prisma.patient.findUnique({
        where: { userId: patientUserId },
      });

      if (!patient) {
        throw new NotFoundException('Patient not found');
      }

      // Get appointments
      const appointments = await this.prisma.appointment.findMany({
        where: {
          patientId: patient.id,
        },
        include: {
          doctor: {
            select: {
              id: true,
              name: true,
              specialty: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          scheduledAt: 'desc',
        },
      });

      // Get all ratings for these appointments in one query
      const appointmentIds = appointments.map(a => a.id);
      const ratings = await this.prisma.rating.findMany({
        where: {
          appointmentId: {
            in: appointmentIds,
          },
        },
      });

      // Create a map of appointmentId -> rating
      const ratingMap = new Map();
      ratings.forEach(rating => {
        ratingMap.set(rating.appointmentId, rating);
      });

      // Transform to include hasRating flag
      return appointments.map((appointment) => ({
        id: appointment.id,
        scheduledAt: appointment.scheduledAt,
        status: appointment.status,
        type: appointment.type,
        durationMinutes: appointment.durationMinutes,
        queueNumber: appointment.queueNumber,
        videoLink: appointment.videoLink,
        notes: appointment.notes,
        doctor: appointment.doctor,
        hasRating: ratingMap.has(appointment.id),
        rating: ratingMap.get(appointment.id) || null,
      }));
    } catch (error) {
      console.error('Error in getPatientAppointmentsWithRatings:', error);
      throw error;
    }
  }

  // ✅ Get doctor appointments with rating status
  async getDoctorAppointmentsWithRatings(doctorUserId: string) {
    try {
      // Get the doctor
      const doctor = await this.prisma.doctor.findUnique({
        where: { userId: doctorUserId },
      });

      if (!doctor) {
        throw new NotFoundException('Doctor not found');
      }

      // Get appointments
      const appointments = await this.prisma.appointment.findMany({
        where: {
          doctorId: doctor.id,
        },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          scheduledAt: 'desc',
        },
      });

      // Get all ratings for these appointments in one query
      const appointmentIds = appointments.map(a => a.id);
      const ratings = await this.prisma.rating.findMany({
        where: {
          appointmentId: {
            in: appointmentIds,
          },
        },
      });

      // Create a map of appointmentId -> rating
      const ratingMap = new Map();
      ratings.forEach(rating => {
        ratingMap.set(rating.appointmentId, rating);
      });

      // Transform to include hasRating flag
      return appointments.map((appointment) => ({
        id: appointment.id,
        scheduledAt: appointment.scheduledAt,
        status: appointment.status,
        type: appointment.type,
        durationMinutes: appointment.durationMinutes,
        queueNumber: appointment.queueNumber,
        videoLink: appointment.videoLink,
        notes: appointment.notes,
        patient: appointment.patient,
        hasRating: ratingMap.has(appointment.id),
        rating: ratingMap.get(appointment.id) || null,
      }));
    } catch (error) {
      console.error('Error in getDoctorAppointmentsWithRatings:', error);
      throw error;
    }
  }

  // ✅ CREATE RATING - Your existing method
  async createRating(patientUserId: string, dto: CreateRatingDto) {
    try {
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
    } catch (error) {
      console.error('Error in createRating:', error);
      throw error;
    }
  }

  // ✅ GET DOCTOR RATINGS - Your existing method
  async getDoctorRatings(doctorId: string) {
    try {
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
    } catch (error) {
      console.error('Error in getDoctorRatings:', error);
      throw error;
    }
  }

  // ✅ GET DOCTOR AVERAGE RATING - Your existing method
  async getDoctorAverageRating(doctorId: string) {
    try {
      const ratings = await this.prisma.rating.findMany({
        where: { doctorId },
        select: { score: true },
      });

      if (ratings.length === 0) return null;

      const average = ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length;
      return { averageRating: average, totalRatings: ratings.length };
    } catch (error) {
      console.error('Error in getDoctorAverageRating:', error);
      throw error;
    }
  }
}