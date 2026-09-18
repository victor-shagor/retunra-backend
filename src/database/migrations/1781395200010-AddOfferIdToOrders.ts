import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOfferIdToOrders1781395200010 implements MigrationInterface {
  name = 'AddOfferIdToOrders1781395200010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN "offer_id" uuid`);
    await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "UQ_orders_offer_id" UNIQUE ("offer_id")`);
    await queryRunner.query(`
      ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_offer_id" FOREIGN KEY ("offer_id")
        REFERENCES "offers" ("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_offer_id"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "UQ_orders_offer_id"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "offer_id"`);
  }
}
