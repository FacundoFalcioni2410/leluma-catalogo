import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerName, items } = body;

    if (!customerName?.trim()) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Carrito vacío" }, { status: 400 });
    }

    const productIds = [...new Set(items.map((i: { productId: string }) => i.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds as string[] } },
      include: { variants: true },
    });

    const orderItems: {
      productId: string;
      productName: string;
      variantId: string | null;
      variantName: string | null;
      price: number;
      quantity: number;
    }[] = [];
    let total = 0;

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) continue;
      const variant = item.variantId ? product.variants.find((v) => v.id === item.variantId) : null;
      const price = variant?.price ?? product.price;
      orderItems.push({
        productId: product.id,
        productName: product.name,
        variantId: variant?.id ?? null,
        variantName: variant?.option ?? null,
        price,
        quantity: item.quantity,
      });
      total += price * item.quantity;
    }

    const order = await prisma.order.create({
      data: {
        customerName: customerName.trim(),
        total,
        items: { create: orderItems },
      },
    });

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) continue;
      if (item.variantId) {
        await prisma.variant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });
      } else {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    return NextResponse.json({ id: order.id });
  } catch (err) {
    console.error("Order create error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
