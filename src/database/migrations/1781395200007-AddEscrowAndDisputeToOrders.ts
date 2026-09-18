import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEscrowAndDisputeToOrders1781395200007 implements MigrationInterface {
  name = 'AddEscrowAndDisputeToOrders1781395200007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "order_status_enum" ADD VALUE 'disputed'`);
    await queryRunner.query(`CREATE TYPE "order_escrow_status_enum" AS ENUM ('held', 'released', 'refunded')`);
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN "escrow_status" "order_escrow_status_enum" NOT NULL DEFAULT 'held'`,
    );
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN "dispute_reason" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "dispute_reason"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "escrow_status"`);
    await queryRunner.query(`DROP TYPE "order_escrow_status_enum"`);
    // Postgres has no DROP VALUE for enums — 'disputed' stays in
    // order_status_enum on rollback. Harmless: nothing reads/writes it
    // once this migration is reverted.
  }
}
