/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";
import { rateLimit } from "@/app/lib/rate-limit";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (!rateLimit(ip, 100, 60000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const perPage = Math.max(1, Math.min(100, parseInt(url.searchParams.get("perPage") || "10")));
  const category = url.searchParams.get("category") || undefined;
  const search = url.searchParams.get("search") || undefined;

  const where: any = {};
  if (category) where.category = category;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { hash: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [count, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, include: { variants: true }, take: perPage, skip: (page - 1) * perPage, orderBy: { createdAt: "desc" } }),
  ]);

  const data = items.map((p) => ({
    id: p.id,
    hash: p.hash,
    name: p.name,
    price: p.price,
    description: p.description,
    category: p.category,
    subCategory: p.subCategory,
    visible: p.visible,
    imageUrl: p.imageUrl,
    variants: p.variants.map((v) => ({
      id: v.id,
      name: v.name,
      option: v.option,
      price: v.price,
      stock: v.stock,
    })),
  }));

  return NextResponse.json({ total: count, page, perPage, pages: Math.ceil(count / perPage), items: data });
}
