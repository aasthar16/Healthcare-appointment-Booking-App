import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);
  private readonly mockMode: boolean;

  constructor() {
    // Debug: Check if env variables are loaded
    this.logger.log(`SMTP_USER loaded: ${process.env.SMTP_USER ? 'YES' : 'NO'}`);
    this.logger.log(`SMTP_PASS loaded: ${process.env.SMTP_PASS ? 'YES' : 'NO'}`);
    
    // Check if SMTP credentials are configured
    this.mockMode = !process.env.SMTP_USER || !process.env.SMTP_PASS;
    
    if (this.mockMode) {
      this.logger.warn('⚠️ Email service running in MOCK mode. No actual emails will be sent.');
      this.logger.warn('��� To enable real emails, set SMTP_USER and SMTP_PASS in .env file');
      return;
    }

    const smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
    };
    
    this.logger.log(`SMTP Config: ${smtpConfig.host}:${smtpConfig.port}`);
    this.transporter = nodemailer.createTransport(smtpConfig);
    this.logger.log('Email service initialized with SMTP');
  }

  private async loadTemplate(templateName: string, data: any): Promise<string> {
    const templatePath = path.join(__dirname, 'templates', `${templateName}.hbs`);
    const template = fs.readFileSync(templatePath, 'utf8');
    const compiledTemplate = handlebars.compile(template);
    return compiledTemplate(data);
  }

  async sendAppointmentConfirmation(to: string, data: {
    patientName: string;
    doctorName: string;
    appointmentDate: string;
    appointmentTime: string;
    appointmentType: string;
    specialty: string;
    videoLink?: string;
    dashboardUrl: string;
  }) {
    if (this.mockMode) {
      this.logger.log(`[MOCK] Appointment confirmation email would be sent to: ${to}`);
      this.logger.log(`[MOCK] Subject: Appointment Confirmed - Healthcare System`);
      return { message: 'Mock email - would have been sent' };
    }
    
    const html = await this.loadTemplate('appointment_confirmation', data);
    await this.sendEmail(to, 'Appointment Confirmed - Healthcare System', html);
  }

  async sendAppointmentReminder(to: string, data: {
    patientName: string;
    doctorName: string;
    appointmentDate: string;
    appointmentTime: string;
    appointmentType: string;
    specialty: string;
    dashboardUrl: string;
  }) {
    if (this.mockMode) {
      this.logger.log(`[MOCK] Appointment reminder email would be sent to: ${to}`);
      return { message: 'Mock email - would have been sent' };
    }
    
    const html = await this.loadTemplate('appointment_reminder', data);
    await this.sendEmail(to, 'Appointment Reminder - Tomorrow', html);
  }

  private async sendEmail(to: string, subject: string, html: string) {
    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"Healthcare System" <noreply@healthcare.com>',
        to,
        subject,
        html,
      });
      this.logger.log(`✅ Email sent to ${to}: ${subject} - Message ID: ${info.messageId}`);
      return info;
    } catch (error: any) {
      const errorMsg = error?.message || 'Unknown error';
      this.logger.error(`❌ Failed to send email to ${to}: ${errorMsg}`);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    if (this.mockMode) {
      this.logger.log('Mock mode: No connection to test');
      return false;
    }
    
    try {
      await this.transporter.verify();
      this.logger.log('✅ SMTP connection verified successfully');
      return true;
    } catch (error: any) {
      const errorMsg = error?.message || 'Unknown error';
      this.logger.error(`❌ SMTP connection failed: ${errorMsg}`);
      return false;
    }
  }
}
