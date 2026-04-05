// @ts-nocheck
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CreateOrderDto, VerifyPaymentDto } from './dto/create-payment.dto';
import Razorpay from 'razorpay';
import crypto from 'crypto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private razorpay: Razorpay;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      this.logger.warn('Razorpay credentials not configured. Payment features will not work.');
      return;
    }

    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  async createOrder(patientUserId: string, dto: CreateOrderDto) {
    if (!this.razorpay) {
      throw new BadRequestException('Payment gateway not configured');
    }

    // Verify appointment belongs to user
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: dto.appointmentId,
        patient: { userId: patientUserId },
      },
      include: {
        patient: true,
        doctor: true,
      },
    });

    if (!appointment) {
      throw new BadRequestException('Appointment not found');
    }

    // Check if payment already exists
    const existingPayment = await this.prisma.payment.findUnique({
      where: { appointmentId: dto.appointmentId },
    });

    if (existingPayment && existingPayment.status === 'captured') {
      throw new BadRequestException('Payment already completed');
    }

    // Create Razorpay order
    const options = {
      amount: dto.amount * 100,
      currency: dto.currency,
      receipt: `appointment_${dto.appointmentId}`,
      notes: {
        appointmentId: dto.appointmentId,
        patientName: appointment.patient.name,
        doctorName: appointment.doctor.name,
      },
    };

    const order = await this.razorpay.orders.create(options);

    // Save or update payment record
    const payment = await this.prisma.payment.upsert({
      where: { appointmentId: dto.appointmentId },
      update: {
        orderId: order.id,
        amount: dto.amount * 100,
        currency: dto.currency,
        status: 'created',
        provider: 'razorpay',
      },
      create: {
        appointmentId: dto.appointmentId,
        orderId: order.id,
        amount: dto.amount * 100,
        currency: dto.currency,
        status: 'created',
        provider: 'razorpay',
      },
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    };
  }

  async verifyPayment(patientUserId: string, dto: VerifyPaymentDto) {
    const { orderId, paymentId, signature, appointmentId } = dto;

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      throw new BadRequestException('Payment gateway not configured');
    }

    // Verify appointment belongs to user
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        patient: { userId: patientUserId },
      },
    });

    if (!appointment) {
      throw new BadRequestException('Appointment not found');
    }

    // Verify signature
    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new BadRequestException('Invalid payment signature');
    }

    // Update payment status
    const payment = await this.prisma.payment.update({
      where: { appointmentId },
      data: {
        paymentId,
        status: 'captured',
      },
    });

    // Get full appointment details for notifications
    const fullAppointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
      },
    });

    if (fullAppointment) {
      // Send notifications
      await this.notificationService.paymentReceived(
        fullAppointment.patient.userId,
        appointmentId,
        payment.amount / 100,
      );

      await this.notificationService.create({
        userId: fullAppointment.doctor.userId,
        title: 'Payment Received',
        message: `Payment of ₹${payment.amount / 100} received from ${fullAppointment.patient.name}`,
        type: 'PAYMENT_RECEIVED',
        metadata: { appointmentId, amount: payment.amount / 100 },
      });
    }

    return { success: true, payment };
  }

  async getPaymentStatus(appointmentId: string, userId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { appointmentId },
    });

    if (!payment) {
      return { status: 'pending', amount: 0 };
    }

    return {
      status: payment.status,
      amount: payment.amount / 100,
      currency: payment.currency,
      paymentId: payment.paymentId,
      createdAt: payment.createdAt,
    };
  }

  async getPaymentHistory(userId: string, role: string) {
    const where = role === 'PATIENT'
      ? { appointment: { patient: { userId } } }
      : { appointment: { doctor: { userId } } };

    const payments = await this.prisma.payment.findMany({
      where,
      include: {
        appointment: {
          include: {
            doctor: true,
            patient: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return payments;
  }
}
