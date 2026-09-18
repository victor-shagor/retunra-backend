import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOffersTable1781395200009 implements MigrationInterface {
  name = 'CreateOffersTable1781395200009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "offer_status_enum" AS ENUM ('pending', 'accepted', 'declined')`);

    await queryRunner.query(`
      CREATE TABLE "offers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "listing_id" uuid,
        "buyer_id" uuid NOT NULL,
        "seller_id" uuid NOT NULL,
        "item_name" character varying NOT NULL,
        "listed_price" numeric(10,2) NOT NULL,
        "amount" numeric(10,2) NOT NULL,
        "status" "offer_status_enum" NOT NULL DEFAULT 'pending',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_offers_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_offers_listing_id" FOREIGN KEY ("listing_id")
          REFERENCES "listings" ("id") ON DELETE SET NULL,
        CONSTRAINT "FK_offers_buyer_id" FOREIGN KEY ("buyer_id")
          REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_offers_seller_id" FOREIGN KEY ("seller_id")
          REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "offers"`);
    await queryRunner.query(`DROP TYPE "offer_status_enum"`);
  }
}
