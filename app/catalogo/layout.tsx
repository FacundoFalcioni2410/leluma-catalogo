import type { Metadata } from "next";
import { CartProvider } from "@/app/context/CartContext";

export const metadata: Metadata = {
  title: "Leluma — Catálogo de productos",
  description:
    "Leluma - Catálogo mayorista de productos",
  keywords: [
    "Leluma",
    "velas artesanales",
    "aromaterapia",
    "inciensos",
    "productos espirituales",
    "catálogo online",
    "comprar por WhatsApp",
  ],
  openGraph: {
    title: "Leluma — Catálogo de productos",
    description:
      "Leluma - Catálogo mayorista de productos",
    type: "website",
    locale: "es_AR",
    images: [
      {
        url: "/logo.png",
        width: 500,
        height: 500,
        alt: "Leluma",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Leluma — Catálogo de productos",
    description:
      "Leluma - Catálogo mayorista de productos",
    images: ["/logo.png"],
  },
  alternates: {
    canonical: "/catalogo",
  },
};

export default function CatalogoLayout({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}