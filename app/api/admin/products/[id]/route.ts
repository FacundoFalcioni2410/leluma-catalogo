import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";
import { rateLimit } from "@/app/lib/rate-limit";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { variants: true, images: { orderBy: { order: "asc" } } },
  });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(product);
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  try {
    await prisma.variant.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (process.env.NODE_ENV !== "development" && !rateLimit(ip, 30, 60000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { id } = await context.params;
  const body = await req.json();
  const { name, price, description, category, subCategory, order, stock, visible, variants, imagesToAdd, imagesToDelete, imagesToReorder } = body;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          name: name ?? undefined,
          price: price ?? undefined,
          description: description ?? null,
          category: category ?? undefined,
          subCategory: subCategory ?? null,
          order: order ?? undefined,
          stock: stock ?? undefined,
          visible: visible ?? undefined,
        },
      });

      if (variants !== undefined) {
        type VariantInput = { id?: string; name: string; option: string; price: number | null; stock: number };
        const incoming = variants as VariantInput[];
        const keepIds = incoming.filter((v) => v.id).map((v) => v.id!);

        // Delete variants that were removed
        await tx.variant.deleteMany({ where: { productId: id, id: { notIn: keepIds } } });

        // Update existing variants (preserve IDs so image FK references stay valid)
        for (const v of incoming.filter((v) => v.id)) {
          await tx.variant.update({
            where: { id: v.id },
            data: { name: v.name, option: v.option, price: v.price ?? null, stock: v.stock ?? 0 },
          });
        }

        // Create brand-new variants
        const newVariants = incoming.filter((v) => !v.id);
        if (newVariants.length > 0) {
          await tx.variant.createMany({
            data: newVariants.map((v) => ({
              productId: id,
              name: v.name,
              option: v.option,
              price: v.price ?? null,
              stock: v.stock ?? 0,
            })),
          });
        }
      }

      if (imagesToDelete?.length) {
        await tx.productImage.deleteMany({ where: { id: { in: imagesToDelete }, productId: id } });
      }

      if (imagesToReorder?.length) {
        await Promise.all(
          (imagesToReorder as { id: string; order: number; variantId?: string | null }[]).map(({ id: imgId, order: imgOrder, variantId: vid }) =>
            tx.productImage.updateMany({
              where: { id: imgId, productId: id },
              data: { order: imgOrder, variantId: vid ?? null },
            })
          )
        );
      }

      if (imagesToAdd?.length) {
        const existingCount = await tx.productImage.count({ where: { productId: id } });
        await tx.productImage.createMany({
          data: (imagesToAdd as { url: string; variantId?: string | null }[]).map((img, i) => ({
            productId: id,
            url: img.url,
            variantId: img.variantId ?? null,
            order: existingCount + i,
          })),
        });
      }
    });

    const updated = await prisma.product.findUnique({
      where: { id },
      include: { variants: true, images: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: "Failed to update product", details: String(error) }, { status: 500 });
  }
}
