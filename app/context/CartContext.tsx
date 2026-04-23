"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

type Variant = { id: string; name: string; option: string; price: number | null; stock: number };
type Product = {
  id: string;
  hash: string;
  name: string;
  price: number;
  description?: string | null;
  imageUrl?: string | null;
  category: string;
  subCategory?: string | null;
  stock: number;
  variants: Variant[];
};
export type CartItem = { product: Product; variantId: string | null; variantName: string | null; quantity: number };

type CartContextType = {
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  addToCart: (product: Product, variantId: string | null, quantity: number) => void;
  removeFromCart: (productId: string, variantId: string | null) => void;
  updateQuantity: (productId: string, variantId: string | null, delta: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("leluma_cart");
      if (saved) setCart(JSON.parse(saved));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem("leluma_cart", JSON.stringify(cart)); } catch {}
  }, [cart, hydrated]);

  const addToCart = useCallback((product: Product, variantId: string | null, quantity: number) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id && i.variantId === variantId);
      const variant = product.variants.find((v) => v.id === variantId);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id && i.variantId === variantId
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { product, variantId, variantName: variant?.option ?? null, quantity }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string, variantId: string | null) => {
    setCart((prev) => prev.filter((i) => !(i.product.id === productId && i.variantId === variantId)));
  }, []);

  const updateQuantity = useCallback((productId: string, variantId: string | null, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product.id === productId && i.variantId === variantId
            ? { ...i, quantity: Math.max(0, i.quantity + delta) }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const cartTotal = cart.reduce((sum, item) => {
    const price = item.product.variants.find((v) => v.id === item.variantId)?.price ?? item.product.price;
    return sum + price * item.quantity;
  }, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, cartCount, cartTotal, addToCart, removeFromCart, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
