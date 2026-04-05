import { Controller, Get, Query } from '@nestjs/common';
import { EmailService } from './email.service';
import { Public } from '../common/decorators/public.decorators';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Get('ping')
  @Public()
  ping() {
    return { message: 'pong', time: new Date().toISOString() };
  }

  @Get('test')
  @Public()
  async testEmail(@Query('email') email: string) {
    if (!email) {
      return { message: 'Please provide an email parameter' };
    }
    
    await this.emailService.sendAppointmentConfirmation(email, {
      patientName: 'Test Patient',
      doctorName: 'Dr. Test',
      appointmentDate: 'April 10, 2024',
      appointmentTime: '10:00 AM',
      appointmentType: 'ONLINE',
      specialty: 'Cardiology',
      dashboardUrl: 'http://localhost:3000/dashboard/appointments',
    });
    
    return { message: `Test email sent to ${email}` };
  }

  @Get('verify')
  @Public()
  async verifyConnection() {
    const isConnected = await this.emailService.testConnection();
    return { connected: isConnected };
  }
}