
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

type NotificationType = 
  | 'APPOINTMENT_CONFIRMED'
  | 'APPOINTMENT_CANCELLED'
  | 'APPOINTMENT_REMINDER'
  | 'APPOINTMENT_RESCHEDULED'
  | 'MESSAGE_RECEIVED'
  | 'RATING_REQUEST'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED'
  | 'DOCTOR_RESPONSE'
  | 'SYSTEM_ALERT';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        title: dto.title,
        message: dto.message,
        type: dto.type as any,
        metadata: dto.metadata || {},
      },
    });

    this.logger.log(`Notification created for user ${dto.userId}: ${dto.title}`);
    return notification;
  }

  async createBulk(notifications: CreateNotificationDto[]) {
    const created = await this.prisma.notification.createMany({
      data: notifications.map(n => ({
        userId: n.userId,
        title: n.title,
        message: n.message,
        type: n.type as any,
        metadata: n.metadata || {},
      })),
    });

    this.logger.log(`Created ${created.count} notifications`);
    return created;
  }

  async getUserNotifications(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    
    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      notifications,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async deleteNotification(notificationId: string, userId: string) {
    return this.prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });
  }

  async deleteAllRead(userId: string) {
    return this.prisma.notification.deleteMany({
      where: { userId, isRead: true },
    });
  }

  // Convenience methods
  async appointmentConfirmed(userId: string, appointmentId: string, doctorName: string, date: Date) {
    return this.create({
      userId,
      title: 'Appointment Confirmed',
      message: `Your appointment with Dr. ${doctorName} on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()} has been confirmed.`,
      type: 'APPOINTMENT_CONFIRMED',
      metadata: { appointmentId, doctorName, date: date.toISOString() },
    });
  }

  async appointmentReminder(userId: string, appointmentId: string, doctorName: string, date: Date) {
    return this.create({
      userId,
      title: 'Appointment Reminder',
      message: `Reminder: You have an appointment with Dr. ${doctorName} tomorrow at ${date.toLocaleTimeString()}.`,
      type: 'APPOINTMENT_REMINDER',
      metadata: { appointmentId, doctorName, date: date.toISOString() },
    });
  }

  async appointmentCancelled(userId: string, appointmentId: string, doctorName: string) {
    return this.create({
      userId,
      title: 'Appointment Cancelled',
      message: `Your appointment with Dr. ${doctorName} has been cancelled.`,
      type: 'APPOINTMENT_CANCELLED',
      metadata: { appointmentId, doctorName },
    });
  }

  async appointmentRescheduled(userId: string, appointmentId: string, doctorName: string, oldDate: Date, newDate: Date) {
    return this.create({
      userId,
      title: 'Appointment Rescheduled',
      message: `Your appointment with Dr. ${doctorName} has been rescheduled from ${oldDate.toLocaleDateString()} to ${newDate.toLocaleDateString()}.`,
      type: 'APPOINTMENT_RESCHEDULED',
      metadata: { appointmentId, doctorName, oldDate: oldDate.toISOString(), newDate: newDate.toISOString() },
    });
  }

  async newMessage(userId: string, appointmentId: string, senderName: string) {
    return this.create({
      userId,
      title: 'New Message',
      message: `You have a new message from ${senderName} regarding your appointment.`,
      type: 'MESSAGE_RECEIVED',
      metadata: { appointmentId, senderName },
    });
  }

  async ratingRequest(userId: string, appointmentId: string, doctorName: string) {
    return this.create({
      userId,
      title: 'Rate Your Experience',
      message: `How was your appointment with Dr. ${doctorName}? Please take a moment to rate your experience.`,
      type: 'RATING_REQUEST',
      metadata: { appointmentId, doctorName },
    });
  }

  async doctorResponse(userId: string, appointmentId: string, doctorName: string, status: string) {
    return this.create({
      userId,
      title: 'Doctor Response',
      message: `Dr. ${doctorName} has ${status} your appointment request.`,
      type: 'DOCTOR_RESPONSE',
      metadata: { appointmentId, doctorName, status },
    });
  }

  async paymentReceived(userId: string, appointmentId: string, amount: number) {
    return this.create({
      userId,
      title: 'Payment Received',
      message: `Payment of ₹${amount} for your appointment has been received successfully.`,
      type: 'PAYMENT_RECEIVED',
      metadata: { appointmentId, amount },
    });
  }

  async paymentFailed(userId: string, appointmentId: string, amount: number) {
    return this.create({
      userId,
      title: 'Payment Failed',
      message: `Payment of ₹${amount} for your appointment failed. Please try again.`,
      type: 'PAYMENT_FAILED',
      metadata: { appointmentId, amount },
    });
  }

  async systemAlert(userId: string, title: string, message: string) {
    return this.create({
      userId,
      title,
      message,
      type: 'SYSTEM_ALERT',
    });
  }
}
