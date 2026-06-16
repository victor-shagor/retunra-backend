import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis as UpstashRedis } from '@upstash/redis';
import IoRedis from 'ioredis';

interface RedisClient {
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<void>;
  disconnect?(): void;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: RedisClient;

  constructor(private readonly configService: ConfigService) {
    this.client = this.createClient();
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    await this.client.set(key, value, ttlSeconds);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  onModuleDestroy(): void {
    this.client.disconnect?.();
  }

  private createClient(): RedisClient {
    const restUrl = this.configService.get<string>('redis.restUrl');
    const restToken = this.configService.get<string>('redis.restToken');

    if (restUrl && restToken) {
      const upstash = new UpstashRedis({ url: restUrl, token: restToken });

      return {
        set: async (key, value, ttlSeconds) => {
          if (ttlSeconds) {
            await upstash.set(key, value, { ex: ttlSeconds });
            return;
          }

          await upstash.set(key, value);
        },
        get: async (key) => {
          const value = await upstash.get<string>(key);
          return value ?? null;
        },
        del: async (key) => {
          await upstash.del(key);
        },
      };
    }

    const ioClient = this.createIoRedisClient();

    return {
      set: async (key, value, ttlSeconds) => {
        if (ttlSeconds) {
          await ioClient.set(key, value, 'EX', ttlSeconds);
          return;
        }

        await ioClient.set(key, value);
      },
      get: (key) => ioClient.get(key),
      del: (key) => ioClient.del(key).then(() => undefined),
      disconnect: () => ioClient.disconnect(),
    };
  }

  private createIoRedisClient(): IoRedis {
    const redisUrl = this.configService.get<string>('redis.url');

    if (redisUrl) {
      return new IoRedis(redisUrl, { maxRetriesPerRequest: null });
    }

    return new IoRedis({
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      password: this.configService.get<string>('redis.password'),
      maxRetriesPerRequest: null,
    });
  }
}
