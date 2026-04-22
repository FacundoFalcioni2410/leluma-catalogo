import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const productId = formData.get("productId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > 5) {
      return NextResponse.json({ error: "Máximo 5MB" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const filename = `products/${productId}-${Date.now()}.${ext}`;

    const blob = await put(filename, file, { access: "public" });

    await prisma.product.update({
      where: { id: productId },
      data: { imageUrl: blob.url },
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
