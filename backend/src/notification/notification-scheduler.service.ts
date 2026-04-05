import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  // Run every hour to check for upcoming appointments
  @Cron(CronExpression.EVERY_HOUR)
  async checkUpcomingAppointments() {
    this.logger.log('Checking for upcoming appointments...');
    
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const eightHoursLater = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    // Get appointments that need 1-hour reminder
    await this.sendOneHourReminders(oneHourLater);
    
    // Get appointments that need 8-hour reminder
    await this.sendEightHourReminders(eightHoursLater);
    
    // Get appointments that need 1-day reminder
    await this.sendOneDayReminders(oneDayLater);
  }

  private async sendOneHourReminders(targetTime: Date) {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: {
          gte: new Date(targetTime.getTime() - 5 * 60 * 1000), // 5 min window
          lt: new Date(targetTime.getTime() + 5 * 60 * 1000),
        },
      },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
      },
    });

    for (const apt of appointments) {
      // Send to patient
      await this.notificationService.appointmentReminder(
        apt.patient.userId,
        apt.id,
        apt.doctor.name,
        apt.scheduledAt,
      );
      
      // Send to doctor
      await this.notificationService.create({
        userId: apt.doctor.userId,
        title: 'Appointment in 1 Hour',
        message: `You have an appointment with ${apt.patient.name} in 1 hour.`,
        type: 'APPOINTMENT_REMINDER',
        metadata: { appointmentId: apt.id, patientName: apt.patient.name },
      });
      
      this.logger.log(`Sent 1-hour reminder for appointment ${apt.id}`);
    }
  }

  private async sendEightHourReminders(targetTime: Date) {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: {
          gte: new Date(targetTime.getTime() - 5 * 60 * 1000),
          lt: new Date(targetTime.getTime() + 5 * 60 * 1000),
        },
      },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
      },
    });

    for (const apt of appointments) {
      await this.notificationService.create({
        userId: apt.patient.userId,
        title: 'Appointment in 8 Hours',
        message: `Your appointment with Dr. ${apt.doctor.name} is in 8 hours.`,
        type: 'APPOINTMENT_REMINDER',
        metadata: { appointmentId: apt.id },
      });
      
      await this.notificationService.create({
        userId: apt.doctor.userId,
        title: 'Appointment in 8 Hours',
        message: `Your appointment with ${apt.patient.name} is in 8 hours.`,
        type: 'APPOINTMENT_REMINDER',
        metadata: { appointmentId: apt.id },
      });
      
      this.logger.log(`Sent 8-hour reminder for appointment ${apt.id}`);
    }
  }

  private async sendOneDayReminders(targetTime: Date) {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: {
          gte: new Date(targetTime.getTime() - 30 * 60 * 1000),
          lt: new Date(targetTime.getTime() + 30 * 60 * 1000),
        },
      },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
      },
    });

    for (const apt of appointments) {
      await this.notificationService.create({
        userId: apt.patient.userId,
        title: 'Appointment Tomorrow',
        message: `Reminder: You have an appointment with Dr. ${apt.doctor.name} tomorrow at ${apt.scheduledAt.toLocaleTimeString()}.`,
        type: 'APPOINTMENT_REMINDER',
        metadata: { appointmentId: apt.id },
      });
      
      await this.notificationService.create({
        userId: apt.doctor.userId,
        title: 'Appointment Tomorrow',
        message: `Reminder: You have an appointment with ${apt.patient.name} tomorrow at ${apt.scheduledAt.toLocaleTimeString()}.`,
        type: 'APPOINTMENT_REMINDER',
        metadata: { appointmentId: apt.id },
      });
      
      this.logger.log(`Sent 1-day reminder for appointment ${apt.id}`);
    }
  }
}
