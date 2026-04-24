import { put } from "@vercel/blob";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, images: { where: { variantId: null }, take: 1 } },
    where: { images: { some: { url: { startsWith: "data:" } } } },
  });

  console.log(`Found ${products.length} products with base64 images`);

  for (const product of products) {
    try {
      const image = product.images[0];
      if (!image) continue;
      const dataUrl = image.url;
      const [header, base64] = dataUrl.split(",");
      const mimeType = header.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";
      const ext = mimeType.split("/")[1] ?? "jpg";

      const buffer = Buffer.from(base64, "base64");
      const filename = `products/${product.id}-${image.id}-migrated.${ext}`;

      const blob = await put(filename, buffer, {
        access: "public",
        contentType: mimeType,
      });

      // TODO: Update image URL in database when Image model is available
      // await prisma.image.update({
      //   where: { id: image.id },
      //   data: { url: blob.url },
      // });

      console.log(`✓ ${product.id}/${image.id} → ${blob.url}`);
    } catch (err) {
      console.error(`✗ ${product.id}:`, err);
    }
  }

  console.log("Done");
}

main().finally(() => prisma.$disconnect());
