-- CreateTable
CREATE TABLE
    "Category" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "parentId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
    );

-- CreateTable
CREATE TABLE
    "ProductCategory" (
        "productId" TEXT NOT NULL,
        "categoryId" TEXT NOT NULL,
        CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("productId", "categoryId")
    );

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE;