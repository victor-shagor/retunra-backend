import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateListingsTable1781395200001 implements MigrationInterface {
  name = 'CreateListingsTable1781395200001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "listing_status_enum" AS ENUM ('draft', 'published')`);
    await queryRunner.query(`CREATE TYPE "listing_gender_enum" AS ENUM ('male', 'female', 'kid')`);
    await queryRunner.query(`CREATE TYPE "listing_condition_enum" AS ENUM ('new', 'used')`);
    await queryRunner.query(`CREATE TYPE "listing_category_enum" AS ENUM ('clothing', 'shoes', 'basics', 'accessories', 'hair')`);

    await queryRunner.query(`
      CREATE TABLE "listings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" character varying NOT NULL,
        "description" text,
        "category" "listing_category_enum",
        "gender" "listing_gender_enum",
        "condition" "listing_condition_enum",
        "price" numeric(10,2) NOT NULL,
        "status" "listing_status_enum" NOT NULL DEFAULT 'draft',
        "images" text[] NOT NULL DEFAULT '{}',
        "user_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_listings_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_listings_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "listings"`);
    await queryRunner.query(`DROP TYPE "listing_category_enum"`);
    await queryRunner.query(`DROP TYPE "listing_condition_enum"`);
    await queryRunner.query(`DROP TYPE "listing_gender_enum"`);
    await queryRunner.query(`DROP TYPE "listing_status_enum"`);
  }
}
