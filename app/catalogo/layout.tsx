import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leluma — Catálogo de productos",
  description:
    "Explorá el catálogo de Leluma: velas, aromaterapia, inciensos y productos espirituales. Comprá fácil por WhatsApp.",
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
      "Explorá el catálogo de Leluma: velas, aromaterapia, inciensos y productos espirituales.",
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
      "Explorá el catálogo de Leluma: velas, aromaterapia, inciensos y productos espirituales.",
    images: ["/logo.png"],
  },
  alternates: {
    canonical: "/catalogo",
  },
};

export default function CatalogoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}