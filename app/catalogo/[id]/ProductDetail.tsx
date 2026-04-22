/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

type Variant = { id: string; name: string; option: string; price: number | null; stock: number };
type Product = { id: string; hash: string; name: string; price: number; description?: string | null; imageUrl?: string | null; category: string; subCategory?: string | null; stock: number; variants: Variant[] };

type CartItem = { product: Product; variantId: string | null; variantName: string | null; quantity: number };

function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

export default function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [showAllVariants, setShowAllVariants] = useState(false);
  const INITIAL_VARIANTS_SHOW = 5;

  useEffect(() => {
    async function fetchProduct() {
      const { id } = await params;
      const res = await fetch(`/api/products/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data);
      } else {
        router.push("/catalogo");
      }
      setLoading(false);
    }
    fetchProduct();
  }, [params, router]);

  const addToCart = useCallback(() => {
    if (!product) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id && item.variantId === selectedVariant);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id && item.variantId === selectedVariant
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      const variant = product.variants.find((v) => v.id === selectedVariant);
      return [
        ...prev,
        {
          product,
          variantId: selectedVariant,
          variantName: variant?.option ?? null,
          quantity,
        },
      ];
    });
    setQuantity(1);
    setSelectedVariant(null);
  }, [product, selectedVariant, quantity]);

  const removeFromCart = (productId: string, variantId: string | null) => {
    setCart((prev) => prev.filter((item) => !(item.product.id === productId && item.variantId === variantId)));
  };

  const updateQuantity = (productId: string, variantId: string | null, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId && item.variantId === variantId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const cartTotal = cart.reduce((sum, item) => {
    const variant = item.product.variants.find((v) => v.id === item.variantId);
    const price = variant?.price ?? item.product.price;
    return sum + price * item.quantity;
  }, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const whatsapp = () => {
    if (cart.length === 0) return;
    const items_list = cart
      .map((item) => {
        const variant = item.variantName ? ` (${item.variantName})` : "";
        return `- ${item.product.name}${variant} x${item.quantity}: $${(item.product.variants.find((v) => v.id === item.variantId)?.price ?? item.product.price) * item.quantity}`;
      })
      .join("%0A");
    const message = `Hola! Quiero comprar:%0A${items_list}%0ATotal: $${cartTotal}`;
    window.open(`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=${message}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#fa6e83] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) return null;

  const { id: productId, name, price, description, category, subCategory, imageUrl, variants, stock } = product;
  const noVariants = variants.length === 0;
  const outOfStock = noVariants && stock <= 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-[#fa6e83] text-white sticky top-0 z-50 shadow-md">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/catalogo" className="flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-semibold text-lg">Volver</span>
            </Link>
            <button
              onClick={() => setShowCart(!showCart)}
              className="relative p-2 hover:bg-[#e55a72] rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#fa6e83] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Cart Sidebar */}
      {showCart && (
        <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowCart(false)}>
          <div 
            className="absolute right-0 top-0 bottom-0 left-0 md:left-auto md:w-80 w-full bg-white shadow-xl flex flex-col" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 flex items-center justify-between border-b border-[#fa6e83]">
              <h2 className="text-lg font-semibold text-black">Carrito ({cartCount})</h2>
              <button onClick={() => setShowCart(false)} className="p-2 text-black hover:text-[#fa6e83]">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <p className="text-black text-center py-8">Tu carrito está vacío</p>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={`${item.product.id}-${item.variantId}`} className="border-b border-gray-200 pb-4">
                      <p className="font-medium text-black text-sm">{item.product.name}</p>
                      {item.variantName && (
                        <p className="text-sm text-[#fa6e83]">{item.variantName}</p>
                      )}
                      <p className="text-black font-semibold">
                        ${(item.product.variants.find((v) => v.id === item.variantId)?.price ?? item.product.price)}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.variantId, -1)}
                          className="w-10 h-10 border-2 border-[#fa6e83] rounded-lg flex items-center justify-center text-black font-bold text-lg"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-black font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.variantId, 1)}
                          className="w-10 h-10 border-2 border-[#fa6e83] rounded-lg flex items-center justify-center text-black font-bold text-lg"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product.id, item.variantId)}
                          className="ml-auto text-red-500 text-sm hover:underline"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {cart.length > 0 && (
              <div className="p-4 border-t border-[#fa6e83]">
                <div className="flex justify-between mb-4">
                  <span className="font-semibold text-black">Total:</span>
                  <span className="font-bold text-xl text-black">${cartTotal.toFixed(2)}</span>
                </div>
                <button
                  onClick={whatsapp}
                  className="w-full bg-[#fa6e83] text-white py-3 rounded-lg font-semibold hover:bg-[#e55a72] text-base"
                >
                  Comprar por WhatsApp
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Content */}
      <div className="max-w-5xl mx-auto p-4 pb-24 md:p-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Image */}
          <div>
            {imageUrl ? (
              <img src={imageUrl} alt={name} className="w-full h-48 md:h-[500px] object-cover rounded-lg" />
            ) : (
              <div className="w-full h-48 md:h-[500px] bg-gray-100 flex items-center justify-center rounded-lg">
                <span className="text-gray-400">Sin imagen</span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col">
            <div>
              <h1 className="font-semibold text-black">{name}</h1>
            </div>

            {description && (
              <div className="mt-2">
                <p className={`text-sm text-gray-600 ${!showFullDesc && description.length > 100 ? 'line-clamp-3' : ''}`}>
                  {stripHtml(description)}
                </p>
                {description.length > 100 && (
                  <button onClick={() => setShowFullDesc(!showFullDesc)} className="text-xs text-[#fa6e83] mt-1 hover:underline">
                    {showFullDesc ? 'Ver menos' : 'Leer más'}
                  </button>
                )}
              </div>
            )}

            <p className="font-bold text-black mt-2">${price.toFixed(2)}</p>

            {variants.length > 0 && (
              <div className="mt-3">
                <h3 className="font-medium text-black text-sm mb-2">{category === "Accesorios" ? "Colores" : "Aromas"}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {variants.slice(0, showAllVariants ? undefined : INITIAL_VARIANTS_SHOW).map((variant) => {
                    const hasStock = variant.stock > 0;
                    return (
                      <button
                        key={variant.id}
                        onClick={() => hasStock && setSelectedVariant(variant.id)}
                        disabled={!hasStock}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                          selectedVariant === variant.id
                            ? "bg-[#fa6e83] text-white border-[#fa6e83]"
                            : hasStock
                              ? "bg-white text-black border-[#fa6e83]/50 hover:border-[#fa6e83]"
                              : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                        }`}
                      >
                        {variant.option}
                        {!hasStock && ' (Agotado)'}
                      </button>
                    );
                  })}
                </div>
                {variants.length > INITIAL_VARIANTS_SHOW && (
                  <button onClick={() => setShowAllVariants(!showAllVariants)} className="text-xs text-[#fa6e83] mt-2 hover:underline">
                    {showAllVariants ? 'Ver menos' : `Ver ${variants.length - INITIAL_VARIANTS_SHOW} más`}
                  </button>
                )}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-sm text-black">Cantidad</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-full border border-[#fa6e83] text-black font-bold hover:border-[#fa6e83]"
                >
                  -
                </button>
                <span className="w-8 text-center font-semibold text-black text-sm">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-8 h-8 rounded-full border border-[#fa6e83] text-black font-bold hover:border-[#fa6e83]"
                >
                  +
                </button>
              </div>
            </div>

            <button
              onClick={addToCart}
              disabled={outOfStock || (variants.length > 0 && !selectedVariant)}
              className={`w-full py-3 rounded-lg font-medium text-base transition-colors mt-3 ${
                outOfStock || (variants.length > 0 && !selectedVariant)
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-[#fa6e83] text-white hover:bg-[#e55a72]"
              }`}
            >
              {outOfStock
                ? "Agotado"
                : variants.length > 0 && !selectedVariant
                  ? `Seleccioná un ${category === "Accesorios" ? "color" : "aroma"}`
                  : "Agregar al carrito"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}