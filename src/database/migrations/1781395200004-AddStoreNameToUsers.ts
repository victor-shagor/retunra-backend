import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStoreNameToUsers1781395200004 implements MigrationInterface {
  name = 'AddStoreNameToUsers1781395200004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "store_name" character varying
    `);
    await queryRunner.query(`
      UPDATE "users"
      SET "store_name" = split_part("full_name", ' ', 1) || '''s Closet'
      WHERE "store_name" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "store_name"`);
  }
}
