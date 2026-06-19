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
import { AppointmentStatus, AppointmentType } from '@prisma/client';
import { NotificationModule } from '../notification/notification.module';
import { NotificationService } from '../notification/notification.service';
import { randomUUID } from 'crypto'; // ✅ ADD THIS IMPORT

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

    // ✅ GENERATE JITSI MEET LINK FOR ONLINE APPOINTMENTS
    let videoLink: string | null = null;
    if (dto.type === AppointmentType.ONLINE) {
      videoLink = `https://meet.jit.si/health-${randomUUID()}`;
      this.logger.log(`Generated Jitsi meet link: ${videoLink}`);
    }

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
        videoLink: videoLink, // ✅ ADD THIS
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

    // ✅ GENERATE JITSI MEET LINK FOR ONLINE APPOINTMENTS IF NOT ALREADY SET
    let videoLink = appointment.videoLink;
    if (appointment.type === AppointmentType.ONLINE && !videoLink) {
      videoLink = `https://meet.jit.si/health-${randomUUID()}`;
      this.logger.log(`Generated Jitsi meet link: ${videoLink}`);
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { 
        status: AppointmentStatus.SCHEDULED,
        videoLink: videoLink, // ✅ ADD THIS
      },
    });

    // ✅ Send notification to patient with video link if ONLINE
    if (appointment.type === AppointmentType.ONLINE && videoLink) {
      await this.notificationService.create({
        userId: appointment.patient.userId,
        title: 'Appointment Confirmed - Join Video Call',
        message: `Your appointment with Dr. ${appointment.doctor.name} has been confirmed. Join the video call: ${videoLink}`,
        type: 'APPOINTMENT_CONFIRMED',
        metadata: { 
          appointmentId: updated.id, 
          videoLink: videoLink 
        },
      });
    } else {
      await this.notificationService.appointmentConfirmed(
        appointment.patient.userId,
        updated.id,
        appointment.doctor.name,
        updated.scheduledAt,
      );
    }

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
  // backend/src/booking/booking.service.ts

// async getMyAppointments(userId: string, role: string) {
//   // Get appointments
//   const appointments = await this.prisma.appointment.findMany({
//     where: role === 'DOCTOR' ? { doctor: { userId } } : { patient: { userId } },
//     include: {
//       doctor: {
//         include: { user: { select: { email: true } } },
//       },
//       patient: {
//         include: { user: { select: { email: true } } },
//       },
//     },
//     orderBy: { createdAt: 'desc' },
//   });

//   // ✅ Get ratings for these appointments
//   const appointmentIds = appointments.map(a => a.id);
//   const ratings = await this.prisma.rating.findMany({
//     where: {
//       appointmentId: {
//         in: appointmentIds,
//       },
//     },
//   });

//   // ✅ Create a map of appointmentId -> rating
//   const ratingMap = new Map();
//   ratings.forEach(rating => {
//     ratingMap.set(rating.appointmentId, rating);
//   });

//   // ✅ Transform to include hasRating and rating fields
//   return appointments.map(appointment => ({
//     ...appointment,
//     hasRating: ratingMap.has(appointment.id),  // ✅ This should be true/false
//     rating: ratingMap.get(appointment.id) || null,  // ✅ This should contain the rating or null
//   }));
// }

// backend/src/booking/booking.service.ts

// ✅ ADD THIS - Complete appointment
async completeAppointment(appointmentId: string, doctorUserId: string) {
  const appointment = await this.prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { doctor: true },
  });

  if (!appointment) {
    throw new NotFoundException('Appointment not found');
  }

  if (appointment.doctor.userId !== doctorUserId) {
    throw new UnauthorizedException('Not your appointment');
  }

  if (appointment.status !== 'SCHEDULED') {
    throw new BadRequestException('Only scheduled appointments can be completed');
  }

  const updated = await this.prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: 'COMPLETED' },
  });

  return updated;
}

// ==================== GET APPOINTMENT ACCESS STATUS ====================


// ✅ ADD THIS - Cancel appointment
async cancelAppointment(appointmentId: string, doctorUserId: string) {
  const appointment = await this.prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { 
      doctor: true,
      patient: { 
        include: { user: true } 
      }
    },
  });

  if (!appointment) {
    throw new NotFoundException('Appointment not found');
  }

  // Check if the doctor is cancelling their own appointment
  if (appointment.doctor.userId !== doctorUserId) {
    throw new UnauthorizedException('Not your appointment');
  }

  if (appointment.status === 'COMPLETED') {
    throw new BadRequestException('Cannot cancel completed appointment');
  }

  const updated = await this.prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: 'CANCELLED' },
  });

  // ✅ Send notification to patient
  await this.notificationService.create({
    userId: appointment.patient.userId,
    title: 'Appointment Cancelled',
    message: `Your appointment with Dr. ${appointment.doctor.name} on ${new Date(appointment.scheduledAt).toLocaleString()} has been cancelled.`,
    type: 'APPOINTMENT_CANCELLED',
    metadata: { 
      appointmentId: updated.id,
      doctorName: appointment.doctor.name,
      scheduledAt: appointment.scheduledAt,
    },
  });

  // ✅ Send notification to doctor (confirmation)
  await this.notificationService.create({
    userId: doctorUserId,
    title: 'Appointment Cancelled',
    message: `You have cancelled appointment with ${appointment.patient.name} on ${new Date(appointment.scheduledAt).toLocaleString()}.`,
    type: 'APPOINTMENT_CANCELLED',
    metadata: { 
      appointmentId: updated.id,
      patientName: appointment.patient.name,
      scheduledAt: appointment.scheduledAt,
    },
  });

  return updated;
}

// ==================== FIND ALTERNATIVE SLOTS ====================
async findAlternativeSlots(doctorId: string, originalDate: Date, excludeSlotId?: string) {
  const startOfDay = new Date(originalDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(originalDate);
  endOfDay.setHours(23, 59, 59, 999);

  const slots = await this.prisma.doctorAvailability.findMany({
    where: {
      doctorId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
      isAvailable: true,
      id: {
        not: excludeSlotId,
      },
    },
    include: {
      appointments: {
        where: {
          status: {
            notIn: ['CANCELLED', 'NO_SHOW'],
          },
        },
        select: {
          id: true,
          queueNumber: true,
          patientId: true,
        },
      },
    },
  });

  const nearbySlots: any[] = [];
  for (let i = 1; i <= 3; i++) {
    const nextDate = new Date(originalDate);
    nextDate.setDate(nextDate.getDate() + i);
    
    const daySlots = await this.prisma.doctorAvailability.findMany({
      where: {
        doctorId,
        date: {
          gte: new Date(nextDate.setHours(0, 0, 0, 0)),
          lt: new Date(nextDate.setHours(23, 59, 59, 999)),
        },
        isAvailable: true,
      },
      include: {
        appointments: {
          where: {
            status: {
              notIn: ['CANCELLED', 'NO_SHOW'],
            },
          },
        },
      },
    });
    
    nearbySlots.push(...daySlots);
  }

  const allSlots = [...slots, ...nearbySlots];
  
  return allSlots.map(slot => ({
    id: slot.id,
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    bookedCount: slot.appointments.length,
    remainingCapacity: slot.maxCapacity - slot.appointments.length,
    isAvailable: slot.appointments.length < slot.maxCapacity,
  }));
}

// ==================== BOOK APPOINTMENT WITH FRIENDLY ERROR ====================
async bookAppointmentFriendly(
  userId: string,
  doctorId: string,
  availabilityId: string,
  scheduledAt: Date,
  type: AppointmentType = AppointmentType.OFFLINE,
) {
  // ✅ Get the patient record
  const patient = await this.prisma.patient.findUnique({
    where: { userId },
  });

  if (!patient) {
    throw new BadRequestException({
      type: 'PATIENT_NOT_FOUND',
      message: 'Patient profile not found. Please complete your profile first.',
      suggestion: 'Please go to your profile page and complete your patient information.',
    });
  }

  // ✅ Check if there's already an appointment at this exact time for this doctor
 console.log("new code reached here");

  const slot = await this.prisma.doctorAvailability.findUnique({
    where: { id: availabilityId },
    include: {
      doctor: {
        select: {
          id: true,
          name: true,
          specialty: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      },
      appointments: {
        where: {
          status: {
            notIn: ['CANCELLED', 'NO_SHOW'],
          },
        },
        select: {
          id: true,
          patientId: true,
          status: true,
          queueNumber: true,
        },
      },
    },
  });

  if (!slot) {
    throw new NotFoundException({
      type: 'SLOT_NOT_FOUND',
      message: 'This time slot is no longer available.',
      suggestion: 'Please select a different time slot.',
    });
  }

  if (!slot.isAvailable) {
    throw new BadRequestException({
      type: 'SLOT_UNAVAILABLE',
      message: 'This time slot is currently unavailable.',
      suggestion: 'Please select a different time slot.',
    });
  }

  const currentBookings = slot.appointments.length;
  if (currentBookings >= slot.maxCapacity) {
    const alternatives = await this.findAlternativeSlots(doctorId, scheduledAt, availabilityId);
    
    const sameDayAlternatives = alternatives.filter(a => 
      new Date(a.date).toDateString() === new Date(scheduledAt).toDateString()
    );
    
    const nearbyDayAlternatives = alternatives.filter(a => 
      new Date(a.date).toDateString() !== new Date(scheduledAt).toDateString()
    );

    throw new BadRequestException({
      type: 'SLOT_FULL',
      message: 'This time slot is fully booked.',
      slotInfo: {
        date: scheduledAt,
        startTime: slot.startTime,
        endTime: slot.endTime,
        bookedCount: currentBookings,
        maxCapacity: slot.maxCapacity,
      },
      alternatives: {
        sameDay: sameDayAlternatives,
        nearbyDays: nearbyDayAlternatives,
      },
      suggestion: 'Please try booking a different time slot.',
    });
  }

  const existingBooking = await this.prisma.appointment.findFirst({
    where: {
      patientId: patient.id,
      scheduledAt: {
        gte: new Date(new Date(scheduledAt).setHours(0, 0, 0, 0)),
        lt: new Date(new Date(scheduledAt).setHours(23, 59, 59, 999)),
      },
      status: {
        notIn: ['CANCELLED', 'NO_SHOW'],
      },
    },
  });

  if (existingBooking) {
    throw new ConflictException({
      type: 'DUPLICATE_BOOKING',
      message: 'You already have an appointment scheduled on this day.',
      suggestion: 'Please check your existing appointments.',
    });
  }

  const queueNumber = currentBookings + 1;

  const appointment = await this.prisma.appointment.create({
    data: {
      doctorId,
      patientId: patient.id,
      availabilityId,
      scheduledAt,
      type,
      queueNumber,
      status: 'PENDING',
      durationMinutes: 30,
    },
    include: {
      doctor: {
        select: {
          id: true,
          name: true,
          specialty: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      },
      patient: {
        select: {
          id: true,
          name: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      },
    },
  });

  return {
    success: true,
    appointment,
    queueNumber,
    totalInQueue: currentBookings + 1,
    remainingSlots: slot.maxCapacity - (currentBookings + 1),
    message: `✅ Appointment booked! You are #${queueNumber} in queue.`,
  };
}
// ==================== GET USER'S QUEUE STATUS ====================
async getQueueStatus(appointmentId: string, userId: string) {
  const appointment = await this.prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: {
        select: {
          id: true,
          name: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      },
      doctor: {
        select: {
          id: true,
          name: true,
          specialty: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      },
      availability: {
        include: {
          appointments: {
            where: {
              status: {
                notIn: ['CANCELLED', 'NO_SHOW'],
              },
            },
            orderBy: {
              queueNumber: 'asc',
            },
            select: {
              id: true,
              queueNumber: true,
              patientId: true,
              status: true,
              patient: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!appointment) {
    throw new NotFoundException('Appointment not found');
  }

  if (appointment.patientId !== userId && appointment.doctorId !== userId) {
    throw new UnauthorizedException('Not authorized to view this appointment');
  }

  const allInQueue = appointment.availability?.appointments || [];
  const currentPosition = allInQueue.findIndex(a => a.id === appointmentId) + 1;
  const totalInQueue = allInQueue.length;

  return {
    appointmentId: appointment.id,
    queueNumber: appointment.queueNumber,
    currentPosition,
    totalInQueue,
    scheduledAt: appointment.scheduledAt,
    status: appointment.status,
    doctorName: appointment.doctor.name,
    patientName: appointment.patient.name,
  };
}

// ==================== GET DOCTOR'S QUEUE FOR TODAY ====================
async getDoctorQueue(doctorId: string, date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const appointments = await this.prisma.appointment.findMany({
    where: {
      doctorId,
      scheduledAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: {
        notIn: ['CANCELLED', 'NO_SHOW'],
      },
    },
    include: {
      patient: {
        select: {
          id: true,
          name: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      },
      availability: {
        select: {
          id: true,
          startTime: true,
          endTime: true,
          maxCapacity: true,
        },
      },
    },
    orderBy: [
      { scheduledAt: 'asc' },
      { queueNumber: 'asc' },
    ],
  });

  const groupedBySlot = appointments.reduce((acc, appt) => {
    const key = appt.availabilityId || appt.scheduledAt.toISOString();
    if (!acc[key]) {
      acc[key] = {
        slot: appt.availability,
        scheduledAt: appt.scheduledAt,
        patients: [],
      };
    }
    acc[key].patients.push(appt);
    return acc;
  }, {} as Record<string, any>);

  return {
    totalPatients: appointments.length,
    slots: Object.values(groupedBySlot),
    appointments,
  };
}

// ==================== GET MY APPOINTMENTS ====================
async getMyAppointments(userId: string, role: string) {
  const whereClause = role === 'DOCTOR' 
    ? { doctor: { userId } }
    : { patient: { userId } };

  // ✅ Get appointments WITHOUT ratings
  const appointments = await this.prisma.appointment.findMany({
    where: {
      ...whereClause,
      status: {
        notIn: ['CANCELLED'],
      },
    },
    include: {
      doctor: {
        select: {
          id: true,
          name: true,
          specialty: true,
        },
      },
      patient: {
        select: {
          id: true,
          name: true,
        },
      },
      availability: {
        select: {
          startTime: true,
          endTime: true,
        },
      },
    },
    orderBy: {
      scheduledAt: 'asc',
    },
  });

  // ✅ Get ratings separately
  const appointmentIds = appointments.map(a => a.id);
  const ratings = await this.prisma.rating.findMany({
    where: {
      appointmentId: {
        in: appointmentIds,
      },
    },
    select: {
      id: true,
      score: true,
      comment: true,
      createdAt: true,
      appointmentId: true,
    },
  });

  // ✅ Create a map of appointmentId -> rating
  const ratingMap = new Map();
  ratings.forEach(rating => {
    ratingMap.set(rating.appointmentId, rating);
  });

  // ✅ Transform to include hasRating and rating
  return appointments.map(appointment => ({
    ...appointment,
    hasRating: ratingMap.has(appointment.id),
    rating: ratingMap.get(appointment.id) || null,
  }));
}
// ==================== GET APPOINTMENT ACCESS STATUS ====================
async getAppointmentAccess(appointmentId: string, userId: string, userRole: string) {
  const appointment = await this.prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      doctor: true,
      patient: true,
      payment: true,
    },
  });

  if (!appointment) {
    throw new NotFoundException('Appointment not found');
  }

  const hasAccess =
    (userRole === 'DOCTOR' && appointment.doctor.userId === userId) ||
    (userRole === 'PATIENT' && appointment.patient.userId === userId);

  if (!hasAccess) {
    throw new UnauthorizedException('Not authorized');
  }

  const now = new Date();
  const scheduledAt = new Date(appointment.scheduledAt);
  const chatOpensAt = new Date(scheduledAt);
  chatOpensAt.setHours(chatOpensAt.getHours() - 2);
  const chatClosesAt = new Date(scheduledAt);
  chatClosesAt.setHours(chatClosesAt.getHours() + 48);

  const isWithinTimeWindow = now >= chatOpensAt && now <= chatClosesAt;
  const isAfterChatClose = now > chatClosesAt;
  const isOnline = appointment.type === 'ONLINE';
  const isPaid = appointment.isPaid || appointment.payment?.status === 'captured';

  let chatStatus = 'active';
  let chatMessage = 'Chat is active';

  if (!isWithinTimeWindow) {
    if (now < chatOpensAt) {
      chatStatus = 'not_started';
      chatMessage = `Chat will open on ${chatOpensAt.toLocaleString()}`;
    } else if (isAfterChatClose) {
      chatStatus = 'closed';
      chatMessage = 'Chat has been closed. View history below.';
    }
  } else if (isOnline && !isPaid) {
    chatStatus = 'payment_required';
    chatMessage = 'Payment required to send messages.';
  }

  return {
    appointmentId: appointment.id,
    status: appointment.status,
    type: appointment.type,
    scheduledAt: appointment.scheduledAt,
    chatOpensAt,
    chatClosesAt,
    canChat: isWithinTimeWindow && (!isOnline || isPaid),
    canViewHistory: true,
    canJoinVideo: isOnline && isPaid && appointment.status === 'SCHEDULED',
    isPaid,
    isOnline,
    videoLink: appointment.videoLink,
    requiresPayment: isOnline && !isPaid,
    chatStatus,
    chatMessage,
    isAfterChatClose,
    isWithinTimeWindow,
  };
}


  
}