// test-redis.ts
import Redis from 'ioredis';

async function main() {
  const redis = new Redis(process.env.REDIS_URL!);

  await redis.set('hello', 'world');

  const value = await redis.get('hello');

  console.log(value);

  redis.disconnect();
}

main();