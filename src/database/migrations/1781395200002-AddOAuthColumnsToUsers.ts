import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOAuthColumnsToUsers1781395200002 implements MigrationInterface {
  name = 'AddOAuthColumnsToUsers1781395200002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "google_id" character varying UNIQUE`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "facebook_id" character varying UNIQUE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "facebook_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "google_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "password" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "phone" SET NOT NULL`,
    );
  }
}
