import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";
import { rateLimit } from "@/app/lib/rate-limit";
import Papa from "papaparse";

interface CSVRow {
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

  return new Promise<NextResponse>((resolve) => {
    Papa.parse<CSVRow>(text, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const map = new Map<string, {
            hash: string; name: string; price: number; offerPrice: number | null; description: string | null; category: string; subCategory: string | null; variantLabel: string | null; visible: boolean; imageUrl: string | null; variants: Array<{ name: string; option: string; stock: number; price: number | null; }>; }>();

          for (const row of results.data) {
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
              category = parts[0] ?? "";
              subCategory = parts[1] ?? null;
            }
            const variantLabel = row["Nombre de variante #1"] ?? null;
            const option = row["Opción de variante #1"] ?? null;
            const stock = row.Stock ? parseInt(row.Stock, 10) || 0 : 0;
            const visible = (row["Visibilidad (Visible o Oculto)"] ?? "visible").toString().toLowerCase().includes("visible");
            const imageUrl = row.Imagen ?? null;

            if (!hash || !name) continue;
            if (!map.has(hash)) {
              map.set(hash, {
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
                variants: [],
              });
            }
            const product = map.get(hash)!;
            if (variantLabel && option) {
              product.variants.push({ name: variantLabel, option, stock, price: null });
            }
          }

          await prisma.$transaction(async (tx) => {
            await tx.variant.deleteMany({});
            await tx.product.deleteMany({});

            for (const product of map.values()) {
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
                  imageUrl: product.imageUrl,
                  variants: { create: product.variants },
                },
              });
            }
          });

          resolve(
            NextResponse.json({ success: true, count: map.size })
          );
        } catch (err) {
          console.error("Import error:", err);
          resolve(NextResponse.json({ error: "Failed to import" }, { status: 500 }));
        }
      },
      error: (err: Error) => {
        resolve(NextResponse.json({ error: "Failed to parse CSV" }, { status: 400 }));
      },
    });
  });
}
