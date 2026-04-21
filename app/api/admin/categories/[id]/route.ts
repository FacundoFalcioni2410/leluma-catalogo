import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { name, parentId } = await req.json();

  const category = await prisma.category.update({
    where: { id },
    data: {
      name: name?.trim() ?? undefined,
      parentId: parentId === undefined ? undefined : parentId || null,
    },
    include: { children: true, parent: true },
  });

  return NextResponse.json(category);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Move children to parent's parent before deleting
  const cat = await prisma.category.findUnique({ where: { id }, include: { children: true } });
  if (cat?.children.length) {
    await prisma.category.updateMany({
      where: { parentId: id },
      data: { parentId: cat.parentId },
    });
  }

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
