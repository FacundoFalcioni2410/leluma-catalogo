import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";

// Replace all categories for a product
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { categoryIds } = await req.json() as { categoryIds: string[] };

  await prisma.$transaction([
    prisma.productCategory.deleteMany({ where: { productId: id } }),
    prisma.productCategory.createMany({
      data: categoryIds.map((categoryId) => ({ productId: id, categoryId })),
      skipDuplicates: true,
    }),
  ]);

  const updated = await prisma.product.findUnique({
    where: { id },
    include: { variants: true, categories: { include: { category: { include: { parent: true } } } } },
  });

  return NextResponse.json(updated);
}
