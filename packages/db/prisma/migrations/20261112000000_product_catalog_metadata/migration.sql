-- AlterTable
ALTER TABLE "product" ADD COLUMN     "attributes" JSONB,
ADD COLUMN     "credit" TEXT,
ADD COLUMN     "formats" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "license" VARCHAR(32),
ADD COLUMN     "model_url" TEXT,
ADD COLUMN     "source_url" TEXT;

-- CreateIndex
CREATE INDEX "ix_product_license" ON "product"("license");

-- CreateIndex
CREATE INDEX "ix_product_formats" ON "product" USING GIN ("formats");

