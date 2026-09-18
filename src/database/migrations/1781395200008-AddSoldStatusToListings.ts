import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSoldStatusToListings1781395200008 implements MigrationInterface {
  name = 'AddSoldStatusToListings1781395200008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Despite the migration history saying "listing_status_enum" (singular),
    // the live type is actually named "listings_status_enum" (plural) —
    // verified directly against the DB. It drifted from what the earlier
    // migration source claims at some point before this one.
    await queryRunner.query(`ALTER TYPE "listings_status_enum" ADD VALUE 'sold'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Postgres has no DROP VALUE for enums — 'sold' stays in
    // listings_status_enum on rollback. Harmless: nothing reads/writes it
    // once this migration is reverted.
  }
}
