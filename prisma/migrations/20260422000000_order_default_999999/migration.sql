ALTER TABLE "Product" ALTER COLUMN "order" SET DEFAULT 999999;
ALTER TABLE "Variant" ALTER COLUMN "order" SET DEFAULT 999999;

UPDATE "Product" SET "order" = 999999 WHERE "order" = 0;
UPDATE "Variant" SET "order" = 999999 WHERE "order" = 0;
