import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @Roles(Role.PATIENT, Role.DOCTOR, Role.ADMIN)
  async getMyNotifications(
    @Request() req: any,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.notificationService.getUserNotifications(
      req.user.sub,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('unread/count')
  @Roles(Role.PATIENT, Role.DOCTOR, Role.ADMIN)
  async getUnreadCount(@Request() req: any) {
    const count = await this.notificationService.getUnreadCount(req.user.sub);
    return { unreadCount: count };
  }

  @Post()
  @Roles(Role.PATIENT, Role.DOCTOR, Role.ADMIN)
  async createNotification(@Request() req: any, @Body() body: any) {
    return this.notificationService.create({
      userId: req.user.sub,
      title: body.title,
      message: body.message,
      type: body.type,
      metadata: body.metadata || {},
    });
  }

  @Patch(':id/read')
  @Roles(Role.PATIENT, Role.DOCTOR, Role.ADMIN)
  async markAsRead(@Param('id') id: string, @Request() req: any) {
    return this.notificationService.markAsRead(id, req.user.sub);
  }

  @Patch('read/all')
  @Roles(Role.PATIENT, Role.DOCTOR, Role.ADMIN)
  async markAllAsRead(@Request() req: any) {
    return this.notificationService.markAllAsRead(req.user.sub);
  }

  @Delete(':id')
  @Roles(Role.PATIENT, Role.DOCTOR, Role.ADMIN)
  async deleteNotification(@Param('id') id: string, @Request() req: any) {
    return this.notificationService.deleteNotification(id, req.user.sub);
  }

  @Delete('read/all')
  @Roles(Role.PATIENT, Role.DOCTOR, Role.ADMIN)
  async deleteAllRead(@Request() req: any) {
    return this.notificationService.deleteAllRead(req.user.sub);
  }
}
