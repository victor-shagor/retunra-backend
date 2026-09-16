import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReviewsTable1781395200006 implements MigrationInterface {
  name = 'CreateReviewsTable1781395200006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "reviews" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "order_id" uuid NOT NULL,
        "buyer_id" uuid NOT NULL,
        "seller_id" uuid NOT NULL,
        "rating" smallint NOT NULL,
        "comment" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reviews_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_reviews_order_id" UNIQUE ("order_id"),
        CONSTRAINT "CHK_reviews_rating_range" CHECK ("rating" >= 1 AND "rating" <= 5),
        CONSTRAINT "FK_reviews_order_id" FOREIGN KEY ("order_id")
          REFERENCES "orders" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_reviews_buyer_id" FOREIGN KEY ("buyer_id")
          REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_reviews_seller_id" FOREIGN KEY ("seller_id")
          REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "reviews"`);
  }
}
