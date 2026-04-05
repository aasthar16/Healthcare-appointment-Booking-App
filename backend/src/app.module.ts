// backend/src/app.module.ts
import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { BookingModule } from './booking/booking.module';
import { DoctorsModule } from './doctors/doctors.module';  
import { PatientsModule } from './patients/patients.module'; 
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { ConsentMiddleware } from './common/middleware/consent.middleware';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AppService } from './app.service';
import { QueueModule } from './queue/queue.module';
import { AppController } from './app.controller';
import { ChatModule } from './chat/chat.module';
import { RatingModule } from './rating/rating.module';
import { EmailModule } from './email/email.module';
import { NotificationModule } from './notification/notification.module';
import { PaymentModule } from './payment/payment.module';
import { AvailabilityModule } from './availability/availability.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AuthModule,
    BookingModule,
    DoctorsModule, 
    QueueModule, 
    ChatModule  ,
    RatingModule,
    EmailModule,
    NotificationModule,
    PaymentModule,
    AvailabilityModule
  ],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  controllers: [AppController]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ConsentMiddleware)
      .forRoutes({ path: 'patients/:patientId/ehr*path', method: RequestMethod.ALL });
  }
}