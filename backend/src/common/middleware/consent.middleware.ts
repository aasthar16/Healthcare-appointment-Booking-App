import {
  Injectable,
  NestMiddleware,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class ConsentMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user;
    const targetPatientId = req.params.patientId;

    if (!user) throw new ForbiddenException('Authentication required.');

    
    if (user.role === Role.PATIENT) {
      const patient = await this.prisma.patient.findUnique({
        where: { userId: user.sub },
      });
      if (patient?.id !== targetPatientId) {
        throw new ForbiddenException('You can only access your own records.');
      }
      return next();
    }

    
    if (user.role === Role.ADMIN) return next();

   
    if (user.role === Role.DOCTOR) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { userId: user.sub },
      });
      if (!doctor) throw new NotFoundException('Doctor profile not found.');

      const appointment = await this.prisma.appointment.findFirst({
        where: {
          doctorId: doctor.id,
          patientId : targetPatientId as string,
          status: { in: ['SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS'] },
         
          scheduledAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });

      if (!appointment) {
        throw new ForbiddenException(
          'Access denied. No active appointment with this patient.',
        );
      }
      return next();
    }

    throw new ForbiddenException('Access denied.');
  }
}