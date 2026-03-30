import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { BookingModule } from './booking/booking.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { ConsentMiddleware } from './common/middleware/consent.middleware';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AppService } from './app.service';
import { AppController } from './app.controller';


@Module({
  imports: [PrismaModule, RedisModule, AuthModule, BookingModule],
  providers: [AppService,
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