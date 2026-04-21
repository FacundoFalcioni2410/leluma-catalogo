import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";
import Papa from "papaparse";

interface CSVRow {
  Hash: string;
  "Nombre del producto": string;
  Precio: string;
  Oferta?: string;
  Stock?: string;
  "Visibilidad (Visible o Oculto)"?: string;
  Descripción?: string;
  "Nombre de variante #1"?: string;
  "Opción de variante #1"?: string;
  "Categorías > Subcategorías > … > Subcategorías"?: string;
}

function cleanText(text: string | undefined): string {
  if (!text) return "";
  return text
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/"/g, '"')
    .replace(/"/g, '"')
    .replace(/'/g, "'")
    .replace(/'/g, "'");
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

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const text = await file.text();

  return new Promise<NextResponse>((resolve) => {
    Papa.parse<CSVRow>(text, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const productsMap = new Map<
            string,
            {
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
              variants: Array<{
                name: string;
                option: string;
                price: number | null;
                stock: number;
              }>;
            }
          >();

          for (const row of results.data) {
            const hash = cleanText(row.Hash);
            const name = cleanText(row["Nombre del producto"]);
            const price = parsePrice(row.Precio);
            const offerPrice = row.Oferta ? parsePrice(row.Oferta) : null;
            const description = cleanText(row.Descripción);
            const categoryPath = cleanText(row["Categorías > Subcategorías > … > Subcategorías"]);
            
            let category = "";
            let subCategory: string | null = null;
            if (categoryPath) {
              const parts = categoryPath.split(">").map(s => s.trim());
              category = parts[0] || "";
              subCategory = parts[1] || null;
            }

            const variantLabel = cleanText(row["Nombre de variante #1"]);
            const option = cleanText(row["Opción de variante #1"]);
            const stock = row.Stock ? parseInt(row.Stock, 10) || 0 : 0;
            const visibility = row["Visibilidad (Visible o Oculto)"]?.toLowerCase() || "";
            const visible = visibility === "visible";

            if (!hash || !name) continue;
            if (!visible) continue;

            if (!productsMap.has(hash)) {
              productsMap.set(hash, {
                hash,
                name,
                price,
                offerPrice,
                description: description || null,
                category,
                subCategory,
                variantLabel: variantLabel || null,
                visible,
                imageUrl: null,
                variants: [],
              });
            }

            const product = productsMap.get(hash)!;

            if (variantLabel && option) {
              product.variants.push({
                name: variantLabel,
                option,
                price: null,
                stock,
              });
            }
          }

          await prisma.$transaction(async (tx) => {
            await tx.variant.deleteMany({});
            await tx.product.deleteMany({});

            for (const productData of productsMap.values()) {
              await tx.product.create({
                data: {
                  hash: productData.hash,
                  name: productData.name,
                  price: productData.price,
                  offerPrice: productData.offerPrice,
                  description: productData.description,
                  category: productData.category,
                  subCategory: productData.subCategory,
                  variantLabel: productData.variantLabel,
                  visible: productData.visible,
                  imageUrl: productData.imageUrl,
                  variants: {
                    create: productData.variants,
                  },
                },
              });
            }
          });

          resolve(
            NextResponse.json({
              success: true,
              count: productsMap.size,
            })
          );
        } catch (error) {
          console.error("Import error:", error);
          resolve(
            NextResponse.json(
              { error: "Failed to import products" },
              { status: 500 }
            )
          );
        }
      },
      error: (error: Error) => {
        resolve(
          NextResponse.json(
            { error: "Failed to parse CSV" },
            { status: 400 }
          )
        );
      },
    });
  });
}
