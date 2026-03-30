import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ONBOARDING_TRANSITIONS,
} from '@health/schemas';
import type {
  SubmitDocumentsDto,
  VerificationDecisionDto,
} from '@health/schemas';
import { DoctorVerificationStatus } from '@prisma/client';

@Injectable()
export class DoctorOnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async submitDocuments(doctorUserId: string, dto: SubmitDocumentsDto) {
    const doctor = await this.prisma.doctor.findUniqueOrThrow({
      where: { userId: doctorUserId },
    });

    const allowed = ONBOARDING_TRANSITIONS[doctor.verificationStatus] ?? [];
    if (!allowed.includes('PENDING_VERIFICATION')) {
      throw new BadRequestException(
        `Cannot submit documents from state: ${doctor.verificationStatus}`,
      );
    }

    return this.prisma.doctor.update({
      where: { id: doctor.id },
      data: {
        licenseDocUrl: dto.licenseDocUrl,
        degreeDocUrl: dto.degreeDocUrl,
        verificationStatus: DoctorVerificationStatus.PENDING_VERIFICATION,
      },
    });
  }

  async processVerification(dto: VerificationDecisionDto) {
    const doctor = await this.prisma.doctor.findUniqueOrThrow({
      where: { id: dto.doctorId },
    });

    const allowed = ONBOARDING_TRANSITIONS[doctor.verificationStatus] ?? [];
    if (!allowed.includes(dto.decision)) {
      throw new BadRequestException(
        `Cannot transition to ${dto.decision} from ${doctor.verificationStatus}`,
      );
    }

    return this.prisma.doctor.update({
      where: { id: doctor.id },
      data: {
        verificationStatus: dto.decision as DoctorVerificationStatus,
      },
    });
  }
}