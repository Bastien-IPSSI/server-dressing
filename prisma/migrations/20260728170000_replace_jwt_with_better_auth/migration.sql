-- This migration intentionally resets authentication and all user-owned data.
-- Legacy JWT password hashes and Google identifiers are not compatible with the
-- clean Better Auth account/session model requested for this application.
TRUNCATE TABLE "users" RESTART IDENTITY CASCADE;

-- Drop user foreign keys before changing their identifiers from BIGINT to TEXT.
ALTER TABLE "clothing_items" DROP CONSTRAINT "clothing_items_user_id_fkey";
ALTER TABLE "outfits" DROP CONSTRAINT "outfits_user_id_fkey";
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_fkey";
ALTER TABLE "current_outfit_selection" DROP CONSTRAINT "current_outfit_selection_user_id_fkey";

ALTER TABLE "users" DROP CONSTRAINT "users_pkey";
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "id" TYPE VARCHAR(255) USING "id"::text;

ALTER TABLE "clothing_items" ALTER COLUMN "user_id" TYPE VARCHAR(255) USING "user_id"::text;
ALTER TABLE "outfits" ALTER COLUMN "user_id" TYPE VARCHAR(255) USING "user_id"::text;
ALTER TABLE "notifications" ALTER COLUMN "user_id" TYPE VARCHAR(255) USING "user_id"::text;
ALTER TABLE "current_outfit_selection" ALTER COLUMN "user_id" TYPE VARCHAR(255) USING "user_id"::text;

ALTER TABLE "users"
  DROP COLUMN "password_hash",
  DROP COLUMN "google_id",
  DROP COLUMN "username",
  DROP COLUMN "avatar_url",
  ADD COLUMN "name" VARCHAR(100) NOT NULL,
  ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "image" TEXT;

ALTER TABLE "users" ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
DROP SEQUENCE IF EXISTS "users_id_seq";

ALTER TABLE "clothing_items" ADD CONSTRAINT "clothing_items_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outfits" ADD CONSTRAINT "outfits_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "current_outfit_selection" ADD CONSTRAINT "current_outfit_selection_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "sessions" (
  "id" VARCHAR(255) NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "token" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ip_address" VARCHAR(255),
  "user_agent" TEXT,
  "user_id" VARCHAR(255) NOT NULL,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "accounts" (
  "id" VARCHAR(255) NOT NULL,
  "account_id" VARCHAR(255) NOT NULL,
  "provider_id" VARCHAR(255) NOT NULL,
  "user_id" VARCHAR(255) NOT NULL,
  "access_token" TEXT,
  "refresh_token" TEXT,
  "id_token" TEXT,
  "access_token_expires_at" TIMESTAMPTZ(6),
  "refresh_token_expires_at" TIMESTAMPTZ(6),
  "scope" TEXT,
  "password" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "verifications" (
  "id" VARCHAR(255) NOT NULL,
  "identifier" VARCHAR(255) NOT NULL,
  "value" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");
CREATE INDEX "idx_sessions_user_id" ON "sessions"("user_id");
CREATE UNIQUE INDEX "uq_accounts_provider_account" ON "accounts"("provider_id", "account_id");
CREATE INDEX "idx_accounts_user_id" ON "accounts"("user_id");
CREATE INDEX "idx_verifications_identifier" ON "verifications"("identifier");

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
