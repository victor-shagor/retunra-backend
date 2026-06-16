import { runMigrations } from './run-migrations';

runMigrations().catch((error: unknown) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
