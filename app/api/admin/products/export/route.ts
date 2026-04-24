import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    include: { variants: true, images: { orderBy: { order: "asc" }, take: 1 } },
    orderBy: { createdAt: "asc" },
  });

  const headers = [
    "id",
    "Hash",
    "Nombre del producto",
    "Precio",
    "Oferta",
    "Descripción",
    "Categorías > Subcategorías > … > Subcategorías",
    "Nombre de variante #1",
    "Opción de variante #1",
    "Stock",
    "Visibilidad (Visible o Oculto)",
    "Imagen",
  ];

  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows: string[] = [headers.join(",")];

  for (const product of products) {
    const categoryPath = [product.category, product.subCategory].filter(Boolean).join(" > ");
    const visibility = product.visible ? "Visible" : "Oculto";
    const imageUrl = product.images[0]?.url ?? "";

    if (product.variants.length === 0) {
      rows.push(
        [
          product.id,
          product.hash,
          product.name,
          product.price,
          product.offerPrice ?? "",
          product.description ?? "",
          categoryPath,
          "",
          "",
          product.stock ?? 0,
          visibility,
          imageUrl,
        ]
          .map(escape)
          .join(",")
      );
    } else {
      for (const variant of product.variants) {
        rows.push(
          [
            product.id,
            product.hash,
            product.name,
            product.price,
            product.offerPrice ?? "",
            product.description ?? "",
            categoryPath,
            variant.name,
            variant.option,
            variant.stock,
            visibility,
            imageUrl,
          ]
            .map(escape)
            .join(",")
        );
      }
    }
  }

  const csv = rows.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leluma-productos-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
