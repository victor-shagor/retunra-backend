import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateListingFields1781395200003 implements MigrationInterface {
  name = 'UpdateListingFields1781395200003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Category enum ────────────────────────────────────────────────────────
    // Detach column from old enum so we can drop and recreate it
    await queryRunner.query(
      `ALTER TABLE "listings" ALTER COLUMN "category" TYPE text USING "category"::text`,
    );
    await queryRunner.query(`DROP TYPE "listing_category_enum"`);
    await queryRunner.query(
      `CREATE TYPE "listing_category_enum" AS ENUM ('Clothing', 'Shoes', 'Accessories', 'Bags', 'Hair')`,
    );
    // Nullify any stale values that don't exist in the new enum
    await queryRunner.query(
      `UPDATE "listings" SET "category" = NULL
       WHERE "category" NOT IN ('Clothing','Shoes','Accessories','Bags','Hair')`,
    );
    await queryRunner.query(
      `ALTER TABLE "listings" ALTER COLUMN "category" TYPE "listing_category_enum" USING "category"::"listing_category_enum"`,
    );

    // ── Condition enum ───────────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "listings" ALTER COLUMN "condition" TYPE text USING "condition"::text`,
    );
    await queryRunner.query(`DROP TYPE "listing_condition_enum"`);
    await queryRunner.query(
      `CREATE TYPE "listing_condition_enum" AS ENUM ('new_tags', 'new', 'like_new', 'very_good', 'good', 'satisfactory')`,
    );
    // 'used' has no equivalent — nullify it
    await queryRunner.query(
      `UPDATE "listings" SET "condition" = NULL
       WHERE "condition" NOT IN ('new_tags','new','like_new','very_good','good','satisfactory')`,
    );
    await queryRunner.query(
      `ALTER TABLE "listings" ALTER COLUMN "condition" TYPE "listing_condition_enum" USING "condition"::"listing_condition_enum"`,
    );

    // ── New columns ──────────────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "subcategory" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "negotiable" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN IF EXISTS "negotiable"`);
    await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN IF EXISTS "subcategory"`);

    // Restore condition enum
    await queryRunner.query(
      `ALTER TABLE "listings" ALTER COLUMN "condition" TYPE text USING "condition"::text`,
    );
    await queryRunner.query(`DROP TYPE "listing_condition_enum"`);
    await queryRunner.query(
      `CREATE TYPE "listing_condition_enum" AS ENUM ('new', 'used')`,
    );
    await queryRunner.query(
      `UPDATE "listings" SET "condition" = NULL
       WHERE "condition" NOT IN ('new','used')`,
    );
    await queryRunner.query(
      `ALTER TABLE "listings" ALTER COLUMN "condition" TYPE "listing_condition_enum" USING "condition"::"listing_condition_enum"`,
    );

    // Restore category enum
    await queryRunner.query(
      `ALTER TABLE "listings" ALTER COLUMN "category" TYPE text USING "category"::text`,
    );
    await queryRunner.query(`DROP TYPE "listing_category_enum"`);
    await queryRunner.query(
      `CREATE TYPE "listing_category_enum" AS ENUM ('clothing', 'shoes', 'basics', 'accessories', 'hair')`,
    );
    await queryRunner.query(
      `UPDATE "listings" SET "category" = NULL
       WHERE "category" NOT IN ('clothing','shoes','basics','accessories','hair')`,
    );
    await queryRunner.query(
      `ALTER TABLE "listings" ALTER COLUMN "category" TYPE "listing_category_enum" USING "category"::"listing_category_enum"`,
    );
  }
}
