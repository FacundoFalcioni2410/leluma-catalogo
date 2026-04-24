/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/app/context/CartContext";

type Variant = { id: string; name: string; option: string; price: number | null; stock: number };
type ProductImage = { id: string; url: string; variantId?: string | null; order: number };
type Product = { id: string; hash: string; name: string; price: number; description?: string | null; imageUrl?: string | null; images?: ProductImage[]; category: string; subCategory?: string | null; stock: number; variants: Variant[] };


function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

export default function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { cart, cartCount, cartTotal, addToCart, removeFromCart, updateQuantity, clearCart, isAnimating } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [showAllVariants, setShowAllVariants] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
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

  const handleSelectVariant = (variantId: string) => {
    setSelectedVariant(variantId);
    setImgIdx(0);
  };

  const handleAddToCart = useCallback(() => {
    if (!product) return;
    const variant = product.variants.find((v) => v.id === selectedVariant);
    const availableStock = variant ? variant.stock : product.stock;
    if (quantity > availableStock) return;
    addToCart(product, selectedVariant, quantity);
    setQuantity(1);
    setSelectedVariant(null);
  }, [product, selectedVariant, quantity, addToCart]);

  const openWhatsapp = (name: string) => {
    const items_list = cart
      .map((item) => {
        const variant = item.variantName ? ` (${item.variantName})` : "";
        return `- ${item.product.name}${variant} x${item.quantity}: $${(item.product.variants.find((v) => v.id === item.variantId)?.price ?? item.product.price) * item.quantity}`;
      })
      .join("%0A");
    const message = `Hola! Soy ${encodeURIComponent(name)}, quiero comprar:%0A${items_list}%0ATotal: $${cartTotal}`;
    window.open(`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=${message}`, "_blank");
  };

  const submitOrder = async () => {
    if (!customerName.trim() || cart.length === 0) return;
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(),
          items: cart.map((item) => ({
            productId: item.product.id,
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        }),
      });
      if (res.ok) {
        openWhatsapp(customerName.trim());
        clearCart();
        setShowCheckout(false);
        setShowCart(false);
        setCustomerName("");
      }
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#fa6e83] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) return null;

  const { id: productId, name, price, description, category, subCategory, imageUrl, images = [], variants, stock } = product;

  const allImages = selectedVariant
    ? images.filter((img) => !img.variantId || img.variantId === selectedVariant)
    : images.filter((img) => !img.variantId);
  const displayImages = allImages.length > 0 ? allImages : imageUrl ? [{ id: "legacy", url: imageUrl, variantId: null, order: 0 }] : [];
  const noVariants = variants.length === 0;
  const outOfStock = noVariants && stock <= 0;
  const selectedVariantStock = selectedVariant ? variants.find((v) => v.id === selectedVariant)?.stock ?? 0 : 0;
  const selectedVariantOutOfStock = !!selectedVariant && selectedVariantStock <= 0;
  const quantityExceedsStock = !!selectedVariant && quantity > selectedVariantStock;

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
                <span className={`absolute -top-1 -right-1 bg-[#fa6e83] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center transition-transform ${isAnimating ? 'animate-ping' : ''}`}>
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
                  onClick={() => setShowCheckout(true)}
                  className="w-full bg-[#fa6e83] text-white py-3 rounded-lg font-semibold hover:bg-[#e55a72] text-base"
                >
                  Comprar por WhatsApp
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-black mb-1">Antes de continuar...</h2>
            <p className="text-sm text-gray-500 mb-4">¿Cuál es tu nombre?</p>
            <input
              type="text"
              placeholder="Tu nombre"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitOrder()}
              autoFocus
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#fa6e83] text-black text-base mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowCheckout(false); setCustomerName(""); }}
                className="flex-1 py-2.5 border-2 border-gray-200 rounded-lg text-black font-medium hover:bg-gray-50 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={submitOrder}
                disabled={!customerName.trim() || checkoutLoading}
                className="flex-1 py-2.5 bg-[#fa6e83] text-white rounded-lg font-semibold hover:bg-[#e55a72] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checkoutLoading ? "Enviando..." : "Confirmar pedido"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Content */}
      <div className="max-w-5xl mx-auto p-4 pb-24 md:p-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Image / Carousel */}
          <div>
            {displayImages.length === 0 ? (
              <div className="w-full h-48 md:h-[500px] bg-gray-100 flex items-center justify-center rounded-lg">
                <span className="text-gray-400">Sin imagen</span>
              </div>
            ) : displayImages.length === 1 ? (
              <img src={displayImages[0].url} alt={name} className="w-full h-48 md:h-[500px] object-cover rounded-lg" />
            ) : (
              <div className="relative">
                <img
                  src={displayImages[imgIdx].url}
                  alt={`${name} ${imgIdx + 1}`}
                  className="w-full h-48 md:h-[500px] object-cover rounded-lg"
                />
                <button
                  onClick={() => setImgIdx((i) => (i - 1 + displayImages.length) % displayImages.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setImgIdx((i) => (i + 1) % displayImages.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <div className="flex justify-center gap-1.5 mt-2">
                  {displayImages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setImgIdx(i)}
                      className={`w-2 h-2 rounded-full transition-colors ${i === imgIdx ? "bg-[#fa6e83]" : "bg-gray-300"}`}
                    />
                  ))}
                </div>
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
                        onClick={() => hasStock && handleSelectVariant(variant.id)}
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
                  onClick={() => {
                    const variant = variants.find((v) => v.id === selectedVariant);
                    const availableStock = variant ? variant.stock : stock;
                    setQuantity((q) => q + 1 <= availableStock ? q + 1 : q);
                  }}
                  className="w-8 h-8 rounded-full border border-[#fa6e83] text-black font-bold hover:border-[#fa6e83]"
                >
                  +
                </button>
              </div>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={outOfStock || (variants.length > 0 && !selectedVariant) || selectedVariantOutOfStock || quantityExceedsStock}
              className={`w-full py-3 rounded-lg font-medium text-base transition-colors mt-3 ${
                outOfStock || (variants.length > 0 && !selectedVariant) || selectedVariantOutOfStock || quantityExceedsStock
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-[#fa6e83] text-white hover:bg-[#e55a72]"
              }`}
            >
              {outOfStock
                ? "Agotado"
                : variants.length > 0 && !selectedVariant
                  ? `Seleccioná un ${category === "Accesorios" ? "color" : "aroma"}`
                  : selectedVariantOutOfStock || quantityExceedsStock
                    ? "Sin stock"
                    : "Agregar al carrito"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}