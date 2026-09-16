import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrdersTable1781395200005 implements MigrationInterface {
  name = 'CreateOrdersTable1781395200005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "order_status_enum" AS ENUM ('pending_payment', 'processing', 'shipped', 'delivered', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TYPE "order_payment_status_enum" AS ENUM ('pending', 'paid', 'failed')`,
    );

    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "buyer_id" uuid NOT NULL,
        "seller_id" uuid NOT NULL,
        "listing_id" uuid,
        "item_name" character varying NOT NULL,
        "item_price" numeric(10,2) NOT NULL,
        "delivery_fee" numeric(10,2) NOT NULL,
        "total" numeric(10,2) NOT NULL,
        "currency" character varying NOT NULL DEFAULT 'NGN',
        "delivery_name" character varying NOT NULL,
        "delivery_phone" character varying NOT NULL,
        "delivery_address" character varying NOT NULL,
        "delivery_city" character varying NOT NULL,
        "delivery_state" character varying NOT NULL,
        "delivery_note" text,
        "courier_name" character varying,
        "courier_service_code" character varying,
        "status" "order_status_enum" NOT NULL DEFAULT 'pending_payment',
        "payment_reference" character varying NOT NULL,
        "payment_status" "order_payment_status_enum" NOT NULL DEFAULT 'pending',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_orders_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_orders_payment_reference" UNIQUE ("payment_reference"),
        CONSTRAINT "FK_orders_buyer_id" FOREIGN KEY ("buyer_id")
          REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_orders_seller_id" FOREIGN KEY ("seller_id")
          REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_orders_listing_id" FOREIGN KEY ("listing_id")
          REFERENCES "listings" ("id") ON DELETE SET NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP TYPE "order_payment_status_enum"`);
    await queryRunner.query(`DROP TYPE "order_status_enum"`);
  }
}
