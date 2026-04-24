import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";
import { rateLimit } from "@/app/lib/rate-limit";
import Papa from "papaparse";

interface CSVRow {
  id?: string;
  Hash: string;
  "Nombre del producto": string;
  Nombre?: string;
  Precio: string;
  Oferta?: string;
  Stock?: string;
  "Visibilidad (Visible o Oculto)"?: string;
  Descripción?: string;
  "Categorías > Subcategorías > … > Subcategorías"?: string;
  "Nombre de variante #1"?: string;
  "Opción de variante #1"?: string;
  "Nombre de variante #2"?: string;
  "Opción de variante #2"?: string;
  "Nombre de variante #3"?: string;
  "Opción de variante #3"?: string;
  Imagen?: string;
}

function parsePrice(price: string | undefined): number {
  if (!price) return 0;
  const cleaned = price.replace(/[$.]/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (!rateLimit(ip, 10, 60000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  const text = await file.text();

  const allCategories = await prisma.category.findMany({ select: { name: true } });
  const categoryNames = allCategories.map((c) => c.name);

  function matchCategory(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const normalized = raw.trim().toLowerCase();
    return categoryNames.find((n) => n.toLowerCase() === normalized) ?? raw.trim();
  }

  return new Promise<NextResponse>((resolve) => {
    Papa.parse<CSVRow>(text, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          // Group rows by id (preferred) or hash
          type ProductData = {
            id: string | null;
            hash: string;
            name: string;
            price: number;
            offerPrice: number | null;
            description: string | null;
            category: string;
            subCategory: string | null;
            variantLabel: string | null;
            visible: boolean;
            imageUrl: string | null;
            stock: number;
            variants: Array<{ name: string; option: string; stock: number; price: number | null }>;
          };

          // Key: id if present, else hash
          const map = new Map<string, ProductData>();

          for (const row of results.data) {
            const id = row.id?.trim() || null;
            const hash = (row.Hash ?? "").toString().trim();
            const name = (row["Nombre del producto"] ?? row["Nombre"] ?? "").toString().trim();
            const price = parsePrice(row.Precio);
            const offerPrice = row.Oferta ? parsePrice(row.Oferta) : null;
            const description = row.Descripción ?? null;
            const categoryPath = row["Categorías > Subcategorías > … > Subcategorías"] ?? "";
            let category = "";
            let subCategory: string | null = null;
            if (categoryPath) {
              const parts = categoryPath.split(">").map((s) => s.trim());
              category = matchCategory(parts[0]) ?? "";
              subCategory = matchCategory(parts[1]);
            }
            const variantLabel = row["Nombre de variante #1"] ?? null;
            const option = row["Opción de variante #1"] ?? null;
            const stock = row.Stock ? parseInt(row.Stock, 10) || 0 : 0;
            const visible = (row["Visibilidad (Visible o Oculto)"] ?? "visible")
              .toString()
              .toLowerCase()
              .includes("visible");
            const rawImage = (row.Imagen ?? "").trim();
            const imageUrl = rawImage && !rawImage.startsWith("data:") ? rawImage : null;

            const key = id ?? hash;
            if (!key || !name) continue;

            if (!map.has(key)) {
              map.set(key, {
                id,
                hash,
                name,
                price,
                offerPrice,
                description,
                category,
                subCategory,
                variantLabel,
                visible,
                imageUrl,
                stock: variantLabel && option ? 0 : stock,
                variants: [],
              });
            }
            const product = map.get(key)!;
            if (variantLabel && option) {
              product.variants.push({ name: variantLabel, option, stock, price: null });
            }
          }

          await prisma.$transaction(async (tx) => {
            for (const product of map.values()) {
              if (product.id) {
                // Upsert by id: update the product and replace its variants
                await tx.variant.deleteMany({ where: { productId: product.id } });
                await tx.product.upsert({
                  where: { id: product.id },
                  update: {
                    hash: product.hash,
                    name: product.name,
                    price: product.price,
                    offerPrice: product.offerPrice,
                    description: product.description,
                    category: product.category,
                    subCategory: product.subCategory,
                    visible: product.visible,
                    stock: product.stock,
                    variants: { create: product.variants },
                  },
                  create: {
                    id: product.id,
                    hash: product.hash,
                    name: product.name,
                    price: product.price,
                    offerPrice: product.offerPrice,
                    description: product.description,
                    category: product.category,
                    subCategory: product.subCategory,
                    visible: product.visible,
                    stock: product.stock,
                    variants: { create: product.variants },
                  },
                });
              } else {
                // Upsert by hash for rows without id
                const existing = await tx.product.findUnique({ where: { hash: product.hash } });
                if (existing) {
                  await tx.variant.deleteMany({ where: { productId: existing.id } });
                  await tx.product.update({
                    where: { id: existing.id },
                    data: {
                      name: product.name,
                      price: product.price,
                      offerPrice: product.offerPrice,
                      description: product.description,
                      category: product.category,
                      subCategory: product.subCategory,
                      visible: product.visible,
                      stock: product.stock,
                      variants: { create: product.variants },
                    },
                  });
                } else {
                  await tx.product.create({
                    data: {
                      hash: product.hash,
                      name: product.name,
                      price: product.price,
                      offerPrice: product.offerPrice,
                      description: product.description,
                      category: product.category,
                      subCategory: product.subCategory,
                      visible: product.visible,
                      stock: product.stock,
                      variants: { create: product.variants },
                    },
                  });
                }
              }
            }
          });

          resolve(NextResponse.json({ success: true, count: map.size }));
        } catch (err) {
          console.error("Import error:", err);
          resolve(NextResponse.json({ error: "Failed to import" }, { status: 500 }));
        }
      },
      error: () => {
        resolve(NextResponse.json({ error: "Failed to parse CSV" }, { status: 400 }));
      },
    });
  });
}
