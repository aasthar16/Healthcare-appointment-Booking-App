import { Module, Global } from '@nestjs/common';
import { RedlockService } from './redlock.service';

@Global()
@Module({
  providers: [RedlockService],
  exports: [RedlockService],
})
export class RedisModule {}