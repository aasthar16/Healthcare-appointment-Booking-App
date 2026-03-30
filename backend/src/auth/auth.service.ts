import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { RegisterDto, LoginDto } from '@health/schemas';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException('Email already registered.');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { email: dto.email, passwordHash, role: dto.role as Role },
      });

      
      if (dto.role === 'DOCTOR') {
        await tx.doctor.create({
          data: {
            user: { connect: { id: newUser.id } },
            name: dto.name,
            specialty: 'General', 
            consultationFee: 500, // <--- Add this line (or whatever default fee you want)
          },
        });
      }

      return newUser;
    });

    return this.signToken(user.id, user.email, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials.');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials.');

    return this.signToken(user.id, user.email, user.role);
  }

  private signToken(userId: string, email: string, role: Role) {
    return {
      accessToken: this.jwt.sign({ sub: userId, email, role }),
      role,
    };
  }
}