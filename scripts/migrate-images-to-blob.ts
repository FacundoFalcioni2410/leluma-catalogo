import { put } from "@vercel/blob";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, imageUrl: true },
    where: { imageUrl: { startsWith: "data:" } },
  });

  console.log(`Found ${products.length} products with base64 images`);

  for (const product of products) {
    try {
      const dataUrl = product.imageUrl!;
      const [header, base64] = dataUrl.split(",");
      const mimeType = header.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";
      const ext = mimeType.split("/")[1] ?? "jpg";

      const buffer = Buffer.from(base64, "base64");
      const filename = `products/${product.id}-migrated.${ext}`;

      const blob = await put(filename, buffer, {
        access: "public",
        contentType: mimeType,
      });

      await prisma.product.update({
        where: { id: product.id },
        data: { imageUrl: blob.url },
      });

      console.log(`✓ ${product.id} → ${blob.url}`);
    } catch (err) {
      console.error(`✗ ${product.id}:`, err);
    }
  }

  console.log("Done");
}

main().finally(() => prisma.$disconnect());
