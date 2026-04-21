import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";
import { rateLimit } from "@/app/lib/rate-limit";

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (!rateLimit(ip, 30, 60000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { id } = await context.params;
  const body = await req.json();
  const { name, price, description, category, subCategory, visible, imageUrl, variants } = body;

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
          visible: visible ?? undefined,
          imageUrl: imageUrl ?? undefined,
        },
      });

      if (variants !== undefined) {
        await tx.variant.deleteMany({ where: { productId: id } });
        if (variants.length > 0) {
          await tx.variant.createMany({
            data: variants.map((v: { name: string; option: string; price: number | null; stock: number }) => ({
              productId: id,
              name: v.name,
              option: v.option,
              price: v.price ?? null,
              stock: v.stock ?? 0,
            })),
          });
        }
      }
    });

    const updated = await prisma.product.findUnique({ where: { id }, include: { variants: true } });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}
