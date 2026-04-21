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
  const { name, price, description, category, subCategory, visible, imageUrl } = body;

  try {
    const updated = await prisma.product.update({
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
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}
