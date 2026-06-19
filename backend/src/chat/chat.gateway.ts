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
import { NotificationService } from '../notification/notification.service';

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
    private readonly notificationService: NotificationService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      this.connectedUsers.set(client.id, userId);
      client.data.userId = userId;
      client.data.role = payload.role;

      console.log(`✅ User ${userId} connected`);
    } catch (error: any) {
      console.log('❌ Auth failed:', error?.message || 'Unknown error');
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.connectedUsers.get(client.id);
    console.log(`❌ User ${userId} disconnected`);
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

  console.log(`👤 User ${userId} joining chat for appointment ${appointmentId}`);

  const appointment = await this.prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { 
      doctor: true, 
      patient: true,
      payment: true,
    },
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

  const now = new Date();
  const scheduledAt = new Date(appointment.scheduledAt);
  
  // ✅ Time window: 2 hours before to 48 hours after
  const chatOpensAt = new Date(scheduledAt);
  chatOpensAt.setHours(chatOpensAt.getHours() - 2);
  
  const chatClosesAt = new Date(scheduledAt);
  chatClosesAt.setHours(chatClosesAt.getHours() + 48);

  // ✅ Check time window
  const isWithinTimeWindow = now >= chatOpensAt && now <= chatClosesAt;
  const isAfterChatClose = now > chatClosesAt;

  // ✅ Check payment status for ONLINE appointments
  const isOnline = appointment.type === 'ONLINE';
  const isPaid = appointment.isPaid || appointment.payment?.status === 'captured';
  
  // ✅ Chat active = within time window AND (not online OR paid)
  const canChat = isWithinTimeWindow && (!isOnline || isPaid);
  
  // ✅ Can view history = always true after appointment is created
  const canViewHistory = true;

  let chatStatusMessage = '';
  let chatStatusType: 'active' | 'not_started' | 'closed' | 'payment_required' = 'active';

  if (!isWithinTimeWindow) {
    if (now < chatOpensAt) {
      chatStatusMessage = `Chat will open on ${chatOpensAt.toLocaleString()}`;
      chatStatusType = 'not_started';
    } else if (isAfterChatClose) {
      chatStatusMessage = 'This chat has been closed. You can view the history below.';
      chatStatusType = 'closed';
    }
  } else if (isOnline && !isPaid) {
    chatStatusMessage = 'Please complete payment to send messages in this chat.';
    chatStatusType = 'payment_required';
  } else {
    chatStatusMessage = 'Chat is active. You can send messages.';
    chatStatusType = 'active';
  }

  console.log(`📊 Chat status: canChat=${canChat}, canViewHistory=${canViewHistory}, type=${chatStatusType}`);

  // ✅ Get chat room and messages (always fetch for history)
  let chatRoom = await this.prisma.chatRoom.findUnique({
    where: { appointmentId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 200,
      },
    },
  });

  // If no chat room exists yet, create one for history tracking
  if (!chatRoom) {
    chatRoom = await this.prisma.chatRoom.create({
      data: {
        appointmentId,
        closesAt: chatClosesAt,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 200,
        },
      },
    });
  }

  // ✅ Join the room only if canChat is true
  if (canChat) {
    client.join(`chat:${appointmentId}`);
    client.data.appointmentId = appointmentId;
    console.log(`✅ User ${userId} joined chat room chat:${appointmentId}`);
  } else {
    console.log(`⛔ User ${userId} cannot join chat (inactive), but can view history`);
  }

  // ✅ Send chat status with history visibility
  client.emit('chat-status', {
    canChat,
    canViewHistory,
    message: chatStatusMessage,
    statusType: chatStatusType,
    chatOpensAt,
    chatClosesAt,
    requiresPayment: isOnline && !isPaid,
    isPaid,
    isOnline,
    isWithinTimeWindow,
    isAfterChatClose,
  });

  // ✅ Always send previous messages (for history)
  client.emit('previous-messages', chatRoom.messages || []);
}
  @SubscribeMessage('send-message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { appointmentId: string; content: string; fileUrl?: string; fileName?: string },
  ) {
    const { appointmentId, content, fileUrl, fileName } = data;
    const userId = client.data.userId;
    const userRole = client.data.role;

    console.log(`��� New message from ${userRole} in ${appointmentId}, fileUrl: ${fileUrl}`);

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

    this.server.to(`chat:${appointmentId}`).emit('new-message', messageToSend);

   try {
      const senderName = userRole === 'DOCTOR' 
        ? `Dr. ${appointment.doctor.name}` 
        : appointment.patient.name;
      
      const recipientUserId = userRole === 'DOCTOR' 
        ? appointment.patient.userId 
        : appointment.doctor.userId;

      const recipientRole = userRole === 'DOCTOR' ? 'PATIENT' : 'DOCTOR';

      // ✅ Create notification for the recipient
      await this.notificationService.create({
        userId: recipientUserId,
        title: `New message from ${senderName}`,
        message: content?.trim()?.substring(0, 100) || 'New message received',
        type: 'MESSAGE_RECEIVED',
        metadata: {
          appointmentId: appointment.id,
          senderId: userId,
          senderRole: userRole,
          messageId: message.id,
          senderName: senderName,
        },
      });

      console.log(`✅ Notification sent to ${recipientRole} (${recipientUserId})`);

      // ✅ Also notify if the recipient is online (for real-time badge update)
      // You can emit a socket event to the recipient if they're connected
      // This will be handled by the frontend polling for notifications

    } catch (error) {
      console.error('❌ Failed to send notification:', error);
    }
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
