import {
  Injectable, BadRequestException, ConflictException, Logger, NotFoundException
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedlockService } from '../redis/redlock.service';
import { CreateBookingDto } from '../schemas/booking.schema';
import { SearchDoctorsDto } from '@health/schemas';
import { VALID_TRANSITIONS } from '../schemas/appointment.schema';
import { AppointmentStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redlock: RedlockService,
  ) {}


  async createAppointment(patientUserId: string, dto: CreateBookingDto) {
    const patient = await this.prisma.patient.findUniqueOrThrow({
      where: { userId: patientUserId },
    });

    const doctor = await this.prisma.doctor.findUniqueOrThrow({
      where: { id: dto.doctorId },
    });

    if (doctor.verificationStatus !== 'VERIFIED') {
      throw new BadRequestException('Doctor is not yet verified.');
    }

    
    const slotKey = `booking:${dto.doctorId}:${dto.scheduledAt.toISOString()}`;
    const release = await this.redlock.acquireLock(slotKey);

    try {
      
      const existing = await this.prisma.appointment.findFirst({
        where: {
          doctorId: dto.doctorId,
          scheduledAt: dto.scheduledAt,
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        },
      });

      if (existing) {
        throw new ConflictException('This time slot is already booked.');
      }

      // Compute queue number for the time block (same hour = same queue)
      const blockStart = new Date(dto.scheduledAt);
      blockStart.setMinutes(0, 0, 0);
      const blockEnd = new Date(blockStart.getTime() + 60 * 60 * 1000);

      const queueCount = await this.prisma.appointment.count({
        where: {
          doctorId: dto.doctorId,
          scheduledAt: { gte: blockStart, lt: blockEnd },
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        },
      });

      const videoLink =
        dto.type === 'ONLINE'
          ? `https://meet.jit.si/health-${randomUUID()}`
          : undefined;

      const appointment = await this.prisma.appointment.create({
        data: {
          doctorId: dto.doctorId,
          patientId: patient.id,
          scheduledAt: dto.scheduledAt,
          durationMinutes: dto.durationMinutes,
          type: dto.type,
          status: 'SCHEDULED',
          queueNumber: queueCount + 1,
          videoLink,
        },
      });

      
      await this.prisma.chatRoom.create({
        data: {
          appointmentId: appointment.id,
          closesAt: new Date(
            dto.scheduledAt.getTime() + 24 * 60 * 60 * 1000,
          ),
        },
      });

      this.logger.log(
        `Appointment booked: ${appointment.id} for patient ${patient.id} with doctor ${doctor.id}`,
      );

      return appointment;
    } finally {
      await release();
    }
  }

  
  async updateStatus(
    appointmentId: string,
    newStatus: AppointmentStatus,
    actorUserId: string,
    actorRole: string,
  ) {
    const appointment = await this.prisma.appointment.findUniqueOrThrow({
      where: { id: appointmentId },
    });

    const currentStatus = appointment.status as string;
    const allowed = VALID_TRANSITIONS[currentStatus] ?? [];

    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid transition: ${currentStatus} → ${newStatus}. Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }

    // Role-based transition guards
    if (newStatus === 'CHECKED_IN' && actorRole !== 'PATIENT') {
      throw new BadRequestException('Only a patient can check in.');
    }
    if (['IN_PROGRESS', 'COMPLETED', 'NO_SHOW'].includes(newStatus) && actorRole !== 'DOCTOR') {
      throw new BadRequestException('Only a doctor can advance this status.');
    }

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: newStatus },
    });
  }

  async searchDoctors(dto: SearchDoctorsDto) {
  const { specialty, date } = dto; // Destructure the object here
  
  return this.prisma.doctor.findMany({
    where: {
      verificationStatus: 'VERIFIED',
      ...(specialty && {
        specialty: { contains: specialty, mode: 'insensitive' },
      }),
    },
    include: {
      availability: true,
      _count: { select: { ratings: true } },
    },
    orderBy: { name: 'asc' },
  });
}

  async getMyAppointments(userId: string, role: string) {
    return this.prisma.appointment.findMany({
      where: role === 'DOCTOR' ? { doctor: { userId } } : { patient: { userId } },
      include: {
        doctor: true,
        patient: true,
      },
    });
  }
}