
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Role } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateChatRoom(appointmentId: string, userId: string, userRole: Role) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const isDoctor = userRole === Role.DOCTOR && appointment.doctor.userId === userId;
    const isPatient = userRole === Role.PATIENT && appointment.patient.userId === userId;

    if (!isDoctor && !isPatient) {
      throw new BadRequestException('Not authorized');
    }

    let chatRoom = await this.prisma.chatRoom.findUnique({
      where: { appointmentId },
    });

    if (!chatRoom) {
      chatRoom = await this.prisma.chatRoom.create({
        data: {
          appointmentId,
          closesAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        },
      });
    }

    return chatRoom;
  }

  async sendMessage(userId: string, userRole: Role, dto: any) {
    const chatRoom = await this.getOrCreateChatRoom(dto.appointmentId, userId, userRole);

    const messageData: any = {
      roomId: chatRoom.id,
      senderRole: userRole,
      senderId: userId,
      content: dto.content,
    };

    // Store file info if present
    if (dto.fileUrl) {
      messageData.fileUrl = dto.fileUrl;
    }

    const message = await this.prisma.chatMessage.create({
      data: messageData,
    });

    return message;
  }

  async getMessages(userId: string, userRole: Role, appointmentId: string, page: number = 1, limit: number = 50) {
    const chatRoom = await this.getOrCreateChatRoom(appointmentId, userId, userRole);

    const messages = await this.prisma.chatMessage.findMany({
      where: { roomId: chatRoom.id },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      messages,
      total: messages.length,
      page,
      limit,
    };
  }

  async uploadFile(file: any, userId: string) {
    const uploadDir = path.join(process.cwd(), 'uploads', 'chat');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, file.buffer);

    // Return URL for the file
    const fileUrl = `http://localhost:4000/uploads/chat/${fileName}`;

    return {
      fileUrl,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }
}
