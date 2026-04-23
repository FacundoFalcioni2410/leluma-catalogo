import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const body = await req.json();
  const { status, notes, items } = body;

  try {
    const order = await prisma.$transaction(async (tx) => {
      const currentOrder = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });

      if (status !== undefined && currentOrder) {
        if (currentOrder.status === "PENDING" && status === "CONFIRMED") {
          for (const item of currentOrder.items) {
            if (item.variantId) {
              await tx.variant.update({
                where: { id: item.variantId },
                data: { stock: { decrement: item.quantity } },
              });
            } else {
              await tx.product.update({
                where: { id: item.productId },
                data: { stock: { decrement: item.quantity } },
              });
            }
          }
        } else if (currentOrder.status === "CONFIRMED" && status === "PENDING") {
          for (const item of currentOrder.items) {
            if (item.variantId) {
              await tx.variant.update({
                where: { id: item.variantId },
                data: { stock: { increment: item.quantity } },
              });
            } else {
              await tx.product.update({
                where: { id: item.productId },
                data: { stock: { increment: item.quantity } },
              });
            }
          }
        }
      }

      if (items !== undefined) {
        const total = (items as Array<{ price: number; quantity: number }>).reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
        await tx.orderItem.deleteMany({ where: { orderId: id } });
        if (items.length > 0) {
          await tx.orderItem.createMany({
            data: (items as Array<{
              productId: string;
              productName: string;
              variantId?: string | null;
              variantName?: string | null;
              price: number;
              quantity: number;
            }>).map((item) => ({
              orderId: id,
              productId: item.productId,
              productName: item.productName,
              variantId: item.variantId ?? null,
              variantName: item.variantName ?? null,
              price: item.price,
              quantity: item.quantity,
            })),
          });
        }
        return tx.order.update({
          where: { id },
          data: {
            total,
            ...(status !== undefined && { status }),
            ...(notes !== undefined && { notes }),
          },
          include: { items: true },
        });
      }

      return tx.order.update({
        where: { id },
        data: {
          ...(status !== undefined && { status }),
          ...(notes !== undefined && { notes }),
        },
        include: { items: true },
      });
    });

    return NextResponse.json(order);
  } catch (err) {
    console.error("Order update error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
