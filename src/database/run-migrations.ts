import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { getDatabaseOptions } from './database.config';

config();

export async function runMigrations(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Add your Neon connection string before running migrations.',
    );
  }

  const dataSource = new DataSource(getDatabaseOptions());

  await dataSource.initialize();

  const executed = await dataSource.runMigrations();

  await dataSource.destroy();

  if (executed.length === 0) {
    console.log('No pending migrations.');
    return;
  }

  for (const migration of executed) {
    console.log(`Applied migration: ${migration.name}`);
  }

  console.log('Migrations completed.');
}
