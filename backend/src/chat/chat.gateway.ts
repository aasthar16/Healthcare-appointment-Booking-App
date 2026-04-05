import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

const CHAT_TIME_RESTRICTION_ENABLED = false;

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers: Map<string, string> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      this.connectedUsers.set(client.id, userId);
      client.data.userId = userId;
      client.data.role = payload.role;

      console.log(`‚úÖ User ${userId} connected`);
    } catch (error: any) {
      console.log('‚ùå Auth failed:', error?.message || 'Unknown error');
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.connectedUsers.get(client.id);
    console.log(`‚ùå User ${userId} disconnected`);
    this.connectedUsers.delete(client.id);
  }

  @SubscribeMessage('join-chat')
  async handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { appointmentId: string },
  ) {
    const { appointmentId } = data;
    const userId = client.data.userId;
    const userRole = client.data.role;

    console.log(`Ì≥± User ${userId} joining chat for appointment ${appointmentId}`);

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { doctor: true, patient: true },
    });

    if (!appointment) {
      client.emit('error', { message: 'Appointment not found' });
      return;
    }

    const hasAccess =
      (userRole === 'DOCTOR' && appointment.doctor.userId === userId) ||
      (userRole === 'PATIENT' && appointment.patient.userId === userId);

    if (!hasAccess) {
      client.emit('error', { message: 'Not authorized' });
      return;
    }

    client.join(`chat:${appointmentId}`);
    client.data.appointmentId = appointmentId;

    console.log(`‚úÖ User ${userId} joined chat room chat:${appointmentId}`);

    client.emit('chat-status', {
      canChat: true,
      message: 'Chat active',
      chatOpensAt: new Date(),
      chatClosesAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const chatRoom = await this.prisma.chatRoom.findUnique({
      where: { appointmentId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 100,
        },
      },
    });

    if (chatRoom) {
      client.emit('previous-messages', chatRoom.messages);
    } else {
      client.emit('previous-messages', []);
    }
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { appointmentId: string; content: string; fileUrl?: string; fileName?: string },
  ) {
    const { appointmentId, content, fileUrl, fileName } = data;
    const userId = client.data.userId;
    const userRole = client.data.role;

    console.log(`Ì≤¨ New message from ${userRole} in ${appointmentId}, fileUrl: ${fileUrl}`);

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { doctor: true, patient: true },
    });

    if (!appointment) {
      client.emit('error', { message: 'Appointment not found' });
      return;
    }

    const hasAccess =
      (userRole === 'DOCTOR' && appointment.doctor.userId === userId) ||
      (userRole === 'PATIENT' && appointment.patient.userId === userId);

    if (!hasAccess) {
      client.emit('error', { message: 'Not authorized' });
      return;
    }

    if (!content?.trim() && !fileUrl) {
      client.emit('error', { message: 'Message cannot be empty' });
      return;
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

    // Create message with optional fileUrl
    const messageData: any = {
      roomId: chatRoom.id,
      senderRole: userRole,
      senderId: userId,
      content: content?.trim() || '',
    };
    
    if (fileUrl) {
      messageData.fileUrl = fileUrl;
    }

    const message = await this.prisma.chatMessage.create({
      data: messageData,
    });

    const messageToSend = {
      id: message.id,
      content: message.content,
      senderRole: message.senderRole,
      senderId: message.senderId,
      createdAt: message.createdAt,
      fileUrl: message.fileUrl,
      fileName: fileName,
    };

    console.log(`Ì≥§ Broadcasting message with fileUrl: ${messageToSend.fileUrl}`);

    this.server.to(`chat:${appointmentId}`).emit('new-message', messageToSend);
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { appointmentId: string; isTyping: boolean },
  ) {
    const { appointmentId, isTyping } = data;
    const userRole = client.data.role;

    client.to(`chat:${appointmentId}`).emit('user-typing', {
      role: userRole,
      isTyping,
    });
  }
}
