import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: { children: true },
      orderBy: { name: "asc" },
    });

    const roots = categories.filter((c) => !c.parentId);

    return NextResponse.json(roots);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}
