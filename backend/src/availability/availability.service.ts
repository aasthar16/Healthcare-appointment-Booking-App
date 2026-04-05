import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  private generateTimeSlots() {
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const endMinute = minute + 30;
        const endHour = hour + (endMinute >= 60 ? 1 : 0);
        const endTime = `${endHour.toString().padStart(2, '0')}:${(endMinute % 60).toString().padStart(2, '0')}`;
        slots.push({ startTime, endTime });
      }
    }
    return slots;
  }

  private getEndTime(startTime: string): string {
    const [hour, minute] = startTime.split(':').map(Number);
    let endHour = hour;
    let endMinute = minute + 30;
    if (endMinute >= 60) {
      endHour++;
      endMinute -= 60;
    }
    return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
  }

  async getDoctorAvailability(doctorId: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const blockedSlots = await this.prisma.doctorAvailability.findMany({
      where: {
        doctorId,
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
        isAvailable: false,
      },
    });

    const allSlots = this.generateTimeSlots();
    
    return allSlots.map(slot => {
      const isBlocked = blockedSlots.some(bs => bs.startTime === slot.startTime);
      return {
        startTime: slot.startTime,
        endTime: slot.endTime,
        isAvailable: !isBlocked,
        id: blockedSlots.find(bs => bs.startTime === slot.startTime)?.id,
      };
    });
  }

  async getDoctorByUserId(userId: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { userId },
    });
    if (!doctor) {
      throw new BadRequestException('Doctor not found');
    }
    return doctor;
  }

  async setUnavailable(doctorId: string, date: Date, slots: string[]) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get existing blocked slots
    const existingBlocked = await this.prisma.doctorAvailability.findMany({
      where: {
        doctorId,
        date: { gte: startOfDay, lt: endOfDay },
        isAvailable: false,
      },
    });

    // Find appointments that will be affected
    const affectedAppointments = [];
    for (const slot of slots) {
      const appointment = await this.prisma.appointment.findFirst({
        where: {
          doctorId,
          scheduledAt: {
            gte: new Date(`${date.toISOString().split('T')[0]}T${slot}:00`),
            lt: new Date(`${date.toISOString().split('T')[0]}T${this.getEndTime(slot)}:00`),
          },
          status: 'SCHEDULED',
        },
        include: {
          patient: { include: { user: true } },
          doctor: true,
        },
      });

      if (appointment) {
        affectedAppointments.push(appointment);
      }
    }

    // Delete existing blocked slots
    await this.prisma.doctorAvailability.deleteMany({
      where: {
        doctorId,
        date: { gte: startOfDay, lt: endOfDay },
      },
    });

    // Create new blocked slots
    const created = await this.prisma.doctorAvailability.createMany({
      data: slots.map(startTime => ({
        doctorId,
        date: startOfDay,
        startTime,
        endTime: this.getEndTime(startTime),
        isAvailable: false,
      })),
    });

    // Handle affected appointments
    for (const appointment of affectedAppointments) {
      // Update appointment status
      await this.prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: 'RESCHEDULE_REQUIRED' },
      });

      // Send notification to patient
      await this.notificationService.create({
        userId: appointment.patient.userId,
        title: 'Appointment Reschedule Required',
        message: `Your appointment with Dr. ${appointment.doctor.name} on ${new Date(appointment.scheduledAt).toLocaleString()} has been cancelled because the doctor is no longer available. Please book a new time slot.`,
        type: 'APPOINTMENT_CANCELLED',
        metadata: { appointmentId: appointment.id, doctorId, oldDate: appointment.scheduledAt },
      });

      // Send notification to doctor
      await this.notificationService.create({
        userId: appointment.doctor.userId,
        title: 'Appointment Auto-Cancelled',
        message: `Appointment with ${appointment.patient.name} on ${new Date(appointment.scheduledAt).toLocaleString()} has been auto-cancelled due to slot unavailability.`,
        type: 'APPOINTMENT_CANCELLED',
        metadata: { appointmentId: appointment.id, patientName: appointment.patient.name },
      });
    }

    return { 
      success: true, 
      count: created.count, 
      affectedAppointments: affectedAppointments.length 
    };
  }

  async toggleSlot(doctorId: string, slotId: string, isAvailable: boolean) {
    const slot = await this.prisma.doctorAvailability.findFirst({
      where: { id: slotId, doctorId },
    });

    if (!slot) {
      throw new BadRequestException('Slot not found');
    }

    // If marking as unavailable (blocking), check for appointments
    if (!isAvailable) {
      const appointment = await this.prisma.appointment.findFirst({
        where: {
          doctorId,
          scheduledAt: {
            gte: new Date(`${slot.date.toISOString().split('T')[0]}T${slot.startTime}:00`),
            lt: new Date(`${slot.date.toISOString().split('T')[0]}T${slot.endTime}:00`),
          },
          status: 'SCHEDULED',
        },
        include: {
          patient: { include: { user: true } },
          doctor: true,
        },
      });

      if (appointment) {
        // Update appointment status
        await this.prisma.appointment.update({
          where: { id: appointment.id },
          data: { status: 'RESCHEDULE_REQUIRED' },
        });

        // Send notification
        await this.notificationService.create({
          userId: appointment.patient.userId,
          title: 'Appointment Reschedule Required',
          message: `Your appointment with Dr. ${appointment.doctor.name} has been cancelled. The doctor is no longer available at that time. Please book a new slot.`,
          type: 'APPOINTMENT_CANCELLED',
          metadata: { appointmentId: appointment.id },
        });
      }
    }

    return this.prisma.doctorAvailability.update({
      where: { id: slotId },
      data: { isAvailable },
    });
  }
}
