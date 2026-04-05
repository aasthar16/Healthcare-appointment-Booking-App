import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

async register(dto: {
  email: string;
  password: string;
  name: string;
  role: 'PATIENT' | 'DOCTOR';
  specialty?: string;
  bio?: string;
  consultationFee?: number;
}) {
  console.log("=== REGISTER CALLED - SHOULD RETURN MESSAGE ONLY ===");
  const cleanEmail = dto.email.trim().toLowerCase();

  // Check for duplicate
  const existing = await this.prisma.user.findUnique({
    where: { email: cleanEmail },
  });

  if (existing) {
    throw new ConflictException('An account with this email already exists.');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(dto.password.trim(), 12);

  // Create user and profile in transaction
  await this.prisma.$transaction(async (tx: any) => {
    const user = await tx.user.create({
      data: {
        email: cleanEmail,
        passwordHash: passwordHash,
        role: dto.role as Role,
      },
    });

    if (dto.role === 'DOCTOR') {
      // Only include valid fields for Doctor model
      const doctorData: any = {
        userId: user.id,
        name: dto.name.trim(),
        specialty: dto.specialty || 'General', // Required field, provide default if missing
      };
      
      // Add optional fields only if provided
      if (dto.bio) doctorData.bio = dto.bio;
      if (dto.consultationFee) doctorData.consultationFee = dto.consultationFee;
      
      await tx.doctor.create({
        data: doctorData,
      });
    } else {
      await tx.patient.create({
        data: { 
          userId: user.id, 
          name: dto.name.trim() 
        },
      });
    }

    this.logger.log(`Registered new ${dto.role}: ${cleanEmail}`);
  });

  // Return success message
  return { message: 'Account created successfully.' };
}

  async login(dto: { email: string; password: string }) {
    console.log("=== LOGIN CALLED ===");
    const cleanEmail = dto.email.trim().toLowerCase();
    const cleanPassword = dto.password.trim();

    const user = await this.prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      this.logger.warn(`Login attempt for non-existent email: ${cleanEmail}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(cleanPassword, user.passwordHash);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.signToken(user.id, user.email, user.role);
  }

  private signToken(userId: string, email: string, role: Role) {
    const payload = { sub: userId, email, role };
    
    return {
      accessToken: this.jwt.sign(payload),
      role,
    };
  }
}