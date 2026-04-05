import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QueueService {
  constructor(private readonly prisma: PrismaService) {}

  async getDoctorQueue(doctorId: string) {
    return this.prisma.appointment.findMany({
      where: {
        doctorId: doctorId,
        status: { in: ['SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS'] }
      },
      include: {
        patient: { select: { name: true } }
      },
      orderBy: { queueNumber: 'asc' }
    });
  }

  async joinQueue(appointmentId: string, userId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true }
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (appointment.patient.userId !== userId) {
      throw new Error('Not your appointment');
    }

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CHECKED_IN' }
    });
  }

  async updateStatus(appointmentId: string, status: string) {
    const validStatuses = ['SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status');
    }
    
    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: status as any }
    });
  }
}