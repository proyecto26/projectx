-- Visual search: assets, blobs, embeddings, product links and search sessions.
-- Design: docs/ai/search/VISUAL_SEARCH.md

-- CreateEnum
CREATE TYPE "blob_state" AS ENUM ('live', 'deleting');

-- CreateEnum
CREATE TYPE "asset_status" AS ENUM ('admitted', 'stored', 'embedded', 'failed');

-- CreateEnum
CREATE TYPE "product_asset_role" AS ENUM ('thumbnail', 'gallery');

-- CreateEnum
CREATE TYPE "search_mode" AS ENUM ('vector', 'hybrid', 'lexical');

-- AlterTable
-- Kept in sync with name and description by a trigger (Prisma reports a
-- generated column as a default and would try to drop it)
ALTER TABLE "product" ADD COLUMN "search_text" TEXT;

CREATE FUNCTION "product_search_text"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW."search_text" := NEW."name" || ' ' || COALESCE(NEW."description", '');
  RETURN NEW;
END;
$$;

CREATE TRIGGER "tr_product_search_text"
  BEFORE INSERT OR UPDATE OF "name", "description", "search_text" ON "product"
  FOR EACH ROW EXECUTE FUNCTION "product_search_text"();

UPDATE "product" SET "search_text" = "name" || ' ' || COALESCE("description", '');

-- CreateTable
CREATE TABLE "embedding_profile" (
    "id" SERIAL NOT NULL,
    "model" VARCHAR(200) NOT NULL,
    "model_revision" VARCHAR(64) NOT NULL,
    "dims" INTEGER NOT NULL,
    "dtype" VARCHAR(16) NOT NULL,
    "runtime" VARCHAR(64) NOT NULL,
    "document_template" VARCHAR(32) NOT NULL,
    "query_prompt" VARCHAR(64),
    "image_token_budget" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "embedding_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blob" (
    "id" SERIAL NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "state" "blob_state" NOT NULL DEFAULT 'live',
    "storage_key" TEXT NOT NULL,
    "content_type" VARCHAR(100) NOT NULL,
    "bytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "colors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "unreferenced_since" TIMESTAMP(3),
    "deleting_started_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset" (
    "id" SERIAL NOT NULL,
    "source" VARCHAR(64) NOT NULL,
    "external_id" TEXT NOT NULL,
    "blob_id" INTEGER,
    "origin_url" TEXT,
    "staging_key" TEXT,
    "ingest_generation" INTEGER NOT NULL DEFAULT 0,
    "admission_key" TEXT,
    "deleted_at" TIMESTAMP(3),
    "content_revision" INTEGER NOT NULL DEFAULT 0,
    "replaced_from_generation" INTEGER,
    "stored_at" TIMESTAMP(3),
    "source_url" TEXT,
    "license" VARCHAR(32),
    "credit" TEXT,
    "name" TEXT,
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "status" "asset_status" NOT NULL DEFAULT 'admitted',
    "error" TEXT,
    "error_code" VARCHAR(32),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
-- One row per dispatch that counted an attempt (EMBEDDINGS_SERVICE.md, Failures)
CREATE TABLE "asset_dispatch" (
    "asset_id" INTEGER NOT NULL,
    "ingest_generation" INTEGER NOT NULL,
    "dispatch_id" VARCHAR(128) NOT NULL,
    "seq" BIGSERIAL NOT NULL,
    "failed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_dispatch_pkey" PRIMARY KEY ("asset_id","ingest_generation","dispatch_id")
);

CREATE TABLE "asset_embedding" (
    "asset_id" INTEGER NOT NULL,
    "profile_id" INTEGER NOT NULL,
    "input_revision" INTEGER NOT NULL DEFAULT 0,
    "ingest_generation" INTEGER NOT NULL,
    "embedding" halfvec(768) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_embedding_pkey" PRIMARY KEY ("asset_id","profile_id")
);

-- CreateTable
CREATE TABLE "product_asset" (
    "product_id" INTEGER NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "role" "product_asset_role" NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "source_image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_asset_pkey" PRIMARY KEY ("product_id","asset_id","role")
);

-- CreateTable
CREATE TABLE "search_session" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" INTEGER,
    "mode" "search_mode" NOT NULL,
    "query_hash" CHAR(64) NOT NULL,
    "results" JSONB NOT NULL,
    "partial" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_upload" (
    "key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "query_upload_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "search_state" (
    "key" VARCHAR(64) NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_state_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_embedding_profile" ON "embedding_profile"("model", "model_revision", "dims", "dtype", "runtime", "document_template");

-- CreateIndex
CREATE UNIQUE INDEX "blob_storage_key_key" ON "blob"("storage_key");

-- CreateIndex
CREATE INDEX "ix_blob_colors" ON "blob" USING GIN ("colors");

-- CreateIndex
CREATE INDEX "ix_blob_gc" ON "blob"("state", "unreferenced_since");

-- CreateIndex
CREATE INDEX "ix_asset_blob_id" ON "asset"("blob_id");

-- CreateIndex
CREATE INDEX "ix_asset_repair" ON "asset"("status", "next_attempt_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_asset_source_external_id" ON "asset"("source", "external_id");

-- CreateIndex
CREATE INDEX "ix_product_asset_asset_id" ON "product_asset"("asset_id");

-- CreateIndex
CREATE INDEX "ix_search_session_expires_at" ON "search_session"("expires_at");

-- CreateIndex
-- Trigram KNN ordering (<->) needs GiST; GIN only supports filtering
CREATE INDEX "ix_product_search_text_trgm" ON "product" USING GIST ("search_text" gist_trgm_ops);

-- CreateIndex
CREATE INDEX "ix_query_upload_expires_at" ON "query_upload"("expires_at");

-- AddForeignKey
ALTER TABLE "asset" ADD CONSTRAINT "fk_asset_blob_id" FOREIGN KEY ("blob_id") REFERENCES "blob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_dispatch" ADD CONSTRAINT "fk_asset_dispatch_asset_id" FOREIGN KEY ("asset_id") REFERENCES "asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "asset_embedding" ADD CONSTRAINT "fk_asset_embedding_asset_id" FOREIGN KEY ("asset_id") REFERENCES "asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_embedding" ADD CONSTRAINT "fk_asset_embedding_profile_id" FOREIGN KEY ("profile_id") REFERENCES "embedding_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_asset" ADD CONSTRAINT "fk_product_asset_product_id" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_asset" ADD CONSTRAINT "fk_product_asset_asset_id" FOREIGN KEY ("asset_id") REFERENCES "asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_session" ADD CONSTRAINT "fk_search_session_profile_id" FOREIGN KEY ("profile_id") REFERENCES "embedding_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Managed in SQL only: Prisma can't express these indexes.

-- One live blob per content hash; a blob being deleted doesn't block a new one
CREATE UNIQUE INDEX "uq_blob_sha256_live" ON "blob"("sha256") WHERE "state" = 'live';

-- One thumbnail per product
CREATE UNIQUE INDEX "uq_product_asset_thumbnail" ON "product_asset"("product_id") WHERE "role" = 'thumbnail';

-- Approximate nearest neighbours over the whole corpus (cosine). Prisma has no
-- HNSW index type, so `prisma migrate dev` proposes dropping this index:
-- remove that statement from any generated migration.
CREATE INDEX "ix_asset_embedding_hnsw" ON "asset_embedding" USING hnsw ("embedding" halfvec_cosine_ops);


