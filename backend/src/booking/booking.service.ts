import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedlockService } from '../redis/redlock.service';
import { CreateBookingDto } from '@health/schemas';
import { SearchDoctorsDto } from '@health/schemas';
import { AppointmentStatus } from '@prisma/client';
import { NotificationModule } from '../notification/notification.module';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redlock: RedlockService,
    private readonly notificationService: NotificationService, 
  ) {}

  // Patient requests appointment (PENDING status)
  async requestAppointment(patientUserId: string, dto: CreateBookingDto) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId: patientUserId },
    });

    if (!patient) {
      throw new BadRequestException('Patient profile not found');
    }

    const doctor = await this.prisma.doctor.findUnique({
      where: { id: dto.doctorId },
    });

    if (!doctor) {
      throw new BadRequestException('Doctor not found');
    }

    if (doctor.verificationStatus !== 'VERIFIED') {
      throw new BadRequestException('Doctor is not yet verified.');
    }

    // Count queue for same time slot
    const queueCount = await this.prisma.appointment.count({
      where: {
        doctorId: dto.doctorId,
        scheduledAt: dto.scheduledAt,
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.SCHEDULED] },
      },
    });

    const appointment = await this.prisma.appointment.create({
      data: {
        doctorId: dto.doctorId,
        patientId: patient.id,
        scheduledAt: dto.scheduledAt,
        durationMinutes: dto.durationMinutes,
        type: dto.type,
        status: AppointmentStatus.PENDING,
        queueNumber: queueCount + 1,
        notes: dto.notes || dto.reason,
        originalScheduledAt: dto.scheduledAt,
      },
    });

    // ✅ Send notification to doctor about new request
    await this.notificationService.create({
      userId: doctor.userId,
      title: 'New Appointment Request',
      message: `${patient.name} has requested an appointment on ${new Date(dto.scheduledAt).toLocaleString()}`,
      type: 'DOCTOR_RESPONSE',
      metadata: { appointmentId: appointment.id, patientName: patient.name },
    });

    // ✅ Send notification to patient
    await this.notificationService.create({
      userId: patientUserId,
      title: 'Appointment Request Sent',
      message: `Your appointment request has been sent to Dr. ${doctor.name}. You will be notified once confirmed. Queue position: #${queueCount + 1}`,
      type: 'APPOINTMENT_CONFIRMED',
      metadata: { appointmentId: appointment.id },
    });

    return {
      ...appointment,
      message: `Appointment request sent. You are #${queueCount + 1} in queue.`,
      queuePosition: queueCount + 1,
    };
  }

  // Doctor accepts appointment
  async acceptAppointment(appointmentId: string, doctorUserId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { 
        doctor: true,
        patient: { include: { user: true } }
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.doctor.userId !== doctorUserId) {
      throw new UnauthorizedException('Not your appointment');
    }

    if (appointment.status !== AppointmentStatus.PENDING) {
      throw new BadRequestException('Only pending appointments can be accepted');
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.SCHEDULED },
    });

    // ✅ Send notification to patient
    await this.notificationService.appointmentConfirmed(
      appointment.patient.userId,
      updated.id,
      appointment.doctor.name,
      updated.scheduledAt,
    );

    // ✅ Send notification to doctor
    await this.notificationService.create({
      userId: doctorUserId,
      title: 'Appointment Accepted',
      message: `You have accepted appointment with ${appointment.patient.name}`,
      type: 'APPOINTMENT_CONFIRMED',
      metadata: { appointmentId: updated.id },
    });

    return { ...updated, message: 'Appointment confirmed' };
  }

  // Doctor rejects appointment
  async rejectAppointment(appointmentId: string, doctorUserId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { 
        doctor: true,
        patient: { include: { user: true } }
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.doctor.userId !== doctorUserId) {
      throw new UnauthorizedException('Not your appointment');
    }

    if (appointment.status !== AppointmentStatus.PENDING) {
      throw new BadRequestException('Only pending appointments can be rejected');
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.REJECTED },
    });

    // ✅ Send notification to patient
    await this.notificationService.appointmentCancelled(
      appointment.patient.userId,
      updated.id,
      appointment.doctor.name,
    );

    // ✅ Send notification to doctor
    await this.notificationService.create({
      userId: doctorUserId,
      title: 'Appointment Rejected',
      message: `You have rejected appointment with ${appointment.patient.name}`,
      type: 'APPOINTMENT_CANCELLED',
      metadata: { appointmentId: updated.id },
    });

    return { ...updated, message: 'Appointment rejected' };
  }

  // Doctor proposes new time
  async proposeNewTime(
    appointmentId: string,
    doctorUserId: string,
    newScheduledAt: Date,
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { 
        doctor: true,
        patient: { include: { user: true } }
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.doctor.userId !== doctorUserId) {
      throw new UnauthorizedException('Not your appointment');
    }

    if (appointment.status !== AppointmentStatus.PENDING) {
      throw new BadRequestException('Cannot propose new time');
    }

    const existing = await this.prisma.appointment.findFirst({
      where: {
        doctorId: appointment.doctorId,
        scheduledAt: newScheduledAt,
        status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.PENDING] },
      },
    });

    if (existing) {
      throw new ConflictException('Proposed time slot is already booked');
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        scheduledAt: newScheduledAt,
        status: AppointmentStatus.COUNTER_OFFER,
        proposedAt: new Date(),
        counterOfferAt: newScheduledAt,
      },
    });

    // ✅ Send notification to patient about counter offer
    await this.notificationService.create({
      userId: appointment.patient.userId,
      title: 'Doctor Proposed New Time',
      message: `Dr. ${appointment.doctor.name} has proposed a new time: ${newScheduledAt.toLocaleString()}. Please login to accept or decline.`,
      type: 'APPOINTMENT_RESCHEDULED',
      metadata: { appointmentId: updated.id, newTime: newScheduledAt.toISOString() },
    });

    return {
      ...updated,
      message: `New time proposed: ${newScheduledAt.toLocaleString()}`,
    };
  }

  // Patient accepts counter offer
  async acceptCounterOffer(appointmentId: string, patientUserId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { 
        patient: true,
        doctor: { include: { user: true } }
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.patient.userId !== patientUserId) {
      throw new UnauthorizedException('Not your appointment');
    }

    if (appointment.status !== AppointmentStatus.COUNTER_OFFER) {
      throw new BadRequestException('No counter offer to accept');
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.SCHEDULED },
    });

    // ✅ Send notification to doctor
    await this.notificationService.create({
      userId: appointment.doctor.userId,
      title: 'Patient Accepted New Time',
      message: `${appointment.patient.name} has accepted your proposed time.`,
      type: 'APPOINTMENT_CONFIRMED',
      metadata: { appointmentId: updated.id },
    });

    return { ...updated, message: 'Appointment confirmed' };
  }

  // Patient rejects counter offer
  async rejectCounterOffer(appointmentId: string, patientUserId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { 
        patient: true,
        doctor: { include: { user: true } }
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.patient.userId !== patientUserId) {
      throw new UnauthorizedException('Not your appointment');
    }

    if (appointment.status !== AppointmentStatus.COUNTER_OFFER) {
      throw new BadRequestException('No counter offer to reject');
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.CANCELLED },
    });

    // ✅ Send notification to doctor
    await this.notificationService.create({
      userId: appointment.doctor.userId,
      title: 'Patient Declined New Time',
      message: `${appointment.patient.name} has declined your proposed time. The appointment has been cancelled.`,
      type: 'APPOINTMENT_CANCELLED',
      metadata: { appointmentId: updated.id },
    });

    return { ...updated, message: 'Appointment cancelled' };
  }

    async searchDoctors(dto: SearchDoctorsDto) {
    console.log('🔵🔵🔵 SERVICE CALLED 🔵🔵🔵');
    console.log('DTO received:', dto);
    const { specialty, name, minFee, maxFee, minRating } = dto;
    
    // Get all doctors with ratings
    let doctors = await this.prisma.doctor.findMany({
      where: { verificationStatus: 'VERIFIED' },
      include: { ratings: { select: { score: true } } },
    });
    
    // Filter by specialty
    if (specialty) {
      doctors = doctors.filter(d => d.specialty.toLowerCase().includes(specialty.toLowerCase()));
    }
    
    // Filter by name
    if (name) {
      doctors = doctors.filter(d => d.name.toLowerCase().includes(name.toLowerCase()));
    }
    
    // Filter by fee range
    if (minFee !== undefined || maxFee !== undefined) {
      const min = minFee ? Number(minFee) : 0;
      const max = maxFee ? Number(maxFee) : Infinity;
      
      doctors = doctors.filter(d => {
        const fee = d.consultationFee;
        if (!fee) return false;
        return fee >= min && fee <= max;
      });
    }
    
    console.log('Filtered doctors count:', doctors.length);
    console.log('Filtered fees:', doctors.map(d => ({ name: d.name, fee: d.consultationFee })));
    
    // Format response with ratings
    const results = doctors.map(d => {
      const ratings = d.ratings || [];
      const averageRating = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
        : null;
      
      return {
        id: d.id,
        name: d.name,
        specialty: d.specialty,
        bio: d.bio,
        consultationFee: d.consultationFee,
        averageRating: averageRating,
        totalRatings: ratings.length,
      };
    });
    
    // Filter by rating
    if (minRating) {
      return results.filter(r => r.averageRating && r.averageRating >= minRating);
    }
    
    return results;
  }

  // Get my appointments
  async getMyAppointments(userId: string, role: string) {
    return this.prisma.appointment.findMany({
      where: role === 'DOCTOR' ? { doctor: { userId } } : { patient: { userId } },
      include: {
        doctor: {
          include: { user: { select: { email: true } } },
        },
        patient: {
          include: { user: { select: { email: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}