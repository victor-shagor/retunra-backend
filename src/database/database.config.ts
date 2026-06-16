import { DataSourceOptions } from 'typeorm';
import { User } from '../users/entities/user.entity';

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
    entities: [User],
    migrations: [`${__dirname}/migrations/*.{js,ts}`],
    synchronize: false,
    ssl: databaseUrl ? { rejectUnauthorized: false } : false,
  };
}
