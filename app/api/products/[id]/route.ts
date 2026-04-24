import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/app/lib/rate-limit";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (process.env.NODE_ENV !== "development" && !rateLimit(ip, 60, 60000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id, visible: true },
    include: { variants: true, images: { orderBy: { order: "asc" } } },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const data = {
    id: product.id,
    hash: product.hash,
    name: product.name,
    price: product.price,
    description: product.description,
    category: product.category,
    subCategory: product.subCategory,
    visible: product.visible,
    stock: product.stock ?? 0,
    imageUrl: product.images[0]?.url ?? null,
    images: product.images.map((img) => ({ id: img.id, url: img.url, variantId: img.variantId ?? null, order: img.order })),
    variants: product.variants.map((v) => ({ id: v.id, name: v.name, option: v.option, price: v.price, stock: v.stock })),
  };

  return NextResponse.json(data);
}
