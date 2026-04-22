import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";
import { rateLimit } from "@/app/lib/rate-limit";
import { randomBytes } from "crypto";

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (process.env.NODE_ENV !== "development" && !rateLimit(ip, 100, 60000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const perPage = Math.max(1, Math.min(100, parseInt(url.searchParams.get("perPage") || "10")));
    const category = url.searchParams.get("category") || undefined;
    const subCategory = url.searchParams.get("subCategory") || undefined;
    const search = url.searchParams.get("search") || undefined;

    const where: Record<string, unknown> = {
      category: { not: "Aromas" },
    };
    if (category) where.category = category;
    if (subCategory) where.subCategory = subCategory;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { hash: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const count = await prisma.product.count({ where });
    const items = await prisma.product.findMany({ 
      where, 
      take: perPage, 
      skip: (page - 1) * perPage, 
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      include: { variants: true },
    });

    const data = items.map((p) => ({
      id: p.id,
      hash: p.hash,
      name: p.name,
      price: p.price,
      description: p.description,
      category: p.category,
      subCategory: p.subCategory,
      order: p.order ?? 999999,
      stock: p.stock ?? 0,
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
  } catch (err) {
    console.error("Admin products GET error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (process.env.NODE_ENV !== "development" && !rateLimit(ip, 30, 60000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json();
  const { name, price, description, category, subCategory, order, stock, visible, variants } = body;

  if (!name?.trim() || !category?.trim()) {
    return NextResponse.json({ error: "Nombre y categoría son requeridos" }, { status: 400 });
  }

  const hash = randomBytes(4).toString("hex").toUpperCase();

  try {
    const product = await prisma.product.create({
      data: {
        hash,
        name: name.trim(),
        price: price ?? 0,
        description: description || null,
        category: category.trim(),
        subCategory: subCategory || null,
        order: order ?? 999999,
        stock: (!variants || variants.length === 0) ? (stock ?? 0) : 0,
        visible: visible ?? true,
        variants: variants?.length > 0 ? {
          create: variants.map((v: { name: string; option: string; price: number | null; stock: number }) => ({
            name: v.name,
            option: v.option,
            price: v.price ?? null,
            stock: v.stock ?? 0,
          })),
        } : undefined,
      },
      include: { variants: true },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    console.error("Create product error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
