import { Suspense } from "react";
import type { Metadata } from "next";
import { prisma } from "@/app/lib/prisma";
import ProductDetail from "./ProductDetail";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id }, include: { variants: true, images: { orderBy: { order: "asc" }, take: 1 } } });

  if (!product) {
    return { title: "Producto no encontrado" };
  }

  const title = `${product.name} - Leluma`;
  const description = product.description
    ? product.description.replace(/<[^>]*>/g, "").slice(0, 160)
    : `Comprá ${product.name} en Leluma. ${product.variants.length} aromas disponibles.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: product.images[0] ? [{ url: product.images[0].url, alt: product.name }] : [],
      type: "website",
    },
    alternates: {
      canonical: `/catalogo/${product.id}`,
    },
  };
}

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#fa6e83] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ProductDetail params={params} />
    </Suspense>
  );
}