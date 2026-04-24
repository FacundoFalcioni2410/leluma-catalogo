import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/app/lib/rate-limit";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (process.env.NODE_ENV !== "development" && !rateLimit(ip, 60, 60000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const perPage = Math.max(1, Math.min(100, parseInt(url.searchParams.get("perPage") || "9")));
  const category = url.searchParams.get("category") || undefined;
  const subCategory = url.searchParams.get("subCategory") || undefined;
  const search = url.searchParams.get("search") || undefined;

  const where: Record<string, unknown> = { visible: true };
  if (category) where.category = category;
  if (subCategory) where.subCategory = subCategory;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { hash: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [count, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: { variants: true, images: { orderBy: { order: "asc" } } },
      take: perPage,
      skip: (page - 1) * perPage,
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  const data = items.map((p) => {
    const generalImage = p.images.find((img) => !img.variantId);
    const firstImage = generalImage ?? p.images[0];
    return ({
      id: p.id,
      hash: p.hash,
      name: p.name,
      price: p.price,
      description: p.description,
      category: p.category,
      subCategory: p.subCategory,
      visible: p.visible,
      stock: p.stock ?? 0,
      imageUrl: firstImage?.url ?? null,
      images: p.images.map((img) => ({ id: img.id, url: img.url, variantId: img.variantId ?? null })),
      variants: p.variants.map((v) => ({ id: v.id, name: v.name, option: v.option, price: v.price, stock: v.stock })),
    });
  });

  return NextResponse.json({ total: count, page, perPage, pages: Math.ceil(count / perPage), items: data });
}
