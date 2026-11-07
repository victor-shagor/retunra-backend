import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPickupAddressAndLiveCaptures1781395200012 implements MigrationInterface {
  name = 'AddPickupAddressAndLiveCaptures1781395200012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Seller pickup address — where the courier collects the parcel.
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "pickup_address" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "pickup_city" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "pickup_state" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "pickup_phone" character varying`);

    // Live (camera-only) photos attached to a listing.
    await queryRunner.query(`ALTER TABLE "listings" ADD COLUMN "live_images" text[] NOT NULL DEFAULT '{}'`);

    await queryRunner.query(`CREATE TYPE "live_capture_status_enum" AS ENUM ('pending', 'completed')`);
    await queryRunner.query(`
      CREATE TABLE "live_captures" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "token" character varying NOT NULL,
        "user_id" uuid NOT NULL,
        "status" "live_capture_status_enum" NOT NULL DEFAULT 'pending',
        "image_url" text,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "completed_at" TIMESTAMP WITH TIME ZONE,
        "consumed_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_live_captures_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_live_captures_token" UNIQUE ("token"),
        CONSTRAINT "FK_live_captures_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "live_captures"`);
    await queryRunner.query(`DROP TYPE "live_capture_status_enum"`);
    await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "live_images"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "pickup_phone"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "pickup_state"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "pickup_city"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "pickup_address"`);
  }
}
