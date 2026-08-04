import { DataSourceOptions } from 'typeorm';
import { Listing } from '../listings/entities/listing.entity';
import { User } from '../users/entities/user.entity';
import { CreateUsersTable1781395200000 } from './migrations/1781395200000-CreateUsersTable';
import { CreateListingsTable1781395200001 } from './migrations/1781395200001-CreateListingsTable';

export function getDatabaseOptions(): DataSourceOptions {
  const databaseUrl = process.env.DATABASE_URL;

  const connection = databaseUrl
    ? { type: 'postgres' as const, url: databaseUrl }
    : {
        type: 'postgres' as const,
        host: process.env.DB_HOST ?? 'localhost',
        port: parseInt(process.env.DB_PORT ?? '5432', 10),
        username: process.env.DB_USERNAME ?? 'postgres',
        password: process.env.DB_PASSWORD ?? 'postgres',
        database: process.env.DB_NAME ?? 'retunra',
      };

  return {
    ...connection,
    entities: [User, Listing],
    migrations: [CreateUsersTable1781395200000, CreateListingsTable1781395200001],
    synchronize: false,
    ssl: databaseUrl ? { rejectUnauthorized: false } : false,
  };
}
