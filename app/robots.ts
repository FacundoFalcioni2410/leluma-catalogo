import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/catalogo",
      disallow: ["/admin", "/api", "/login"],
    },
    sitemap: `${process.env.NEXTAUTH_URL ?? "https://leluma.com.ar"}/sitemap.xml`,
  };
}
