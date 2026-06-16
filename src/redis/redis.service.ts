import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('redis.url');

    this.client = redisUrl
      ? new Redis(redisUrl, {
          tls: redisUrl.startsWith('rediss://') ? {} : undefined,
          maxRetriesPerRequest: null,
        })
      : new Redis({
          host: this.configService.get<string>('redis.host'),
          port: this.configService.get<number>('redis.port'),
          password: this.configService.get<string>('redis.password'),
          maxRetriesPerRequest: null,
        });
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
      return;
    }

    await this.client.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  onModuleDestroy(): void {
    this.client.disconnect();
  }
}
