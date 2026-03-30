import { Injectable, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedlockService implements OnModuleInit {
  private redlock: any;

  async onModuleInit() {
    // Dynamic import to handle Redlock v5 (ESM) in a NestJS (CJS) environment
    const { default: Redlock } = await (eval('import("redlock")') as Promise<any>);
    
    const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    this.redlock = new Redlock([redisClient], {
      driftFactor: 0.01,
      retryCount: 10,
      retryDelay: 200,
      retryJitter: 200,
    });
  }

  async acquireLock(resource: string, ttl: number = 5000) {
    if (!this.redlock) {
      throw new Error('Redlock not initialized yet');
    }
    try {
      const lock = await this.redlock.acquire([resource], ttl);
      return async () => {
        await lock.release();
      };
    } catch (e) {
      throw new Error(`Could not acquire lock for ${resource}`);
    }
  }
}