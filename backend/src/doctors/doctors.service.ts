import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';

@Injectable()
export class DoctorsService {
  
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDoctorDto) {
    
    return { id: 'temp-id', ...dto };
  }

  async findAll() {
    // Use prisma instead of a local array
    return this.prisma.doctor.findMany();
  }

  async findOne(id: string) {
    return this.prisma.doctor.findUnique({
      where: { id },
    });
  }

  async update(id: string, dto: UpdateDoctorDto) {
    return this.prisma.doctor.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    return this.prisma.doctor.delete({
      where: { id },
    });
  }
}