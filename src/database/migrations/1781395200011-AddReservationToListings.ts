import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReservationToListings1781395200011 implements MigrationInterface {
  name = 'AddReservationToListings1781395200011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "listings" ADD COLUMN "reserved_by_user_id" uuid`);
    await queryRunner.query(`ALTER TABLE "listings" ADD COLUMN "reserved_until" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`
      ALTER TABLE "listings" ADD CONSTRAINT "FK_listings_reserved_by_user_id" FOREIGN KEY ("reserved_by_user_id")
        REFERENCES "users" ("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "listings" DROP CONSTRAINT "FK_listings_reserved_by_user_id"`);
    await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "reserved_until"`);
    await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "reserved_by_user_id"`);
  }
}
