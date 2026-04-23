/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import CategoryFilter from "@/app/components/CategoryFilter";
import { useCart } from "@/app/context/CartContext";

type Product = {
  id: string;
  hash: string;
  name: string;
  price: number;
  description?: string | null;
  imageUrl?: string | null;
  category: string;
  subCategory?: string | null;
  visible: boolean;
  stock: number;
  variants: Array<{ id: string; name: string; option: string; price: number | null; stock: number }>;
};

type Category = {
  id: string;
  name: string;
  children?: Array<{ id: string; name: string }>;
};

function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

function getInitialParams() {
  if (typeof window === "undefined") {
    return { page: "1", category: "", subCategory: "", search: "" };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    page: params.get("page") || "1",
    category: params.get("category") || "",
    subCategory: params.get("subCategory") || "",
    search: params.get("search") || "",
  };
}

export default function CatalogPage() {
  const router = useRouter();
  const { cart, cartCount, cartTotal, addToCart: ctxAddToCart, removeFromCart, updateQuantity, clearCart } = useCart();
  const [hydrated, setHydrated] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [perPage] = useState(12);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [subCategory, setSubCategory] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    const params = getInitialParams();
    setPage(parseInt(params.page) || 1);
    setCategory(params.category || undefined);
    setSubCategory(params.subCategory || undefined);
    setSearch(params.search);
    setHydrated(true);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setPage(parseInt(params.get("page") || "1") || 1);
      setCategory(params.get("category") || undefined);
      setSubCategory(params.get("subCategory") || undefined);
      setSearch(params.get("search") || "");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const updateURL = useCallback((updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(window.location.search);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    const newUrl = `/catalogo?${params.toString()}`;
    window.history.pushState({}, "", newUrl);
    if (updates.page) setPage(parseInt(updates.page));
    if (updates.category !== undefined) setCategory(updates.category || undefined);
    if (updates.subCategory !== undefined) setSubCategory(updates.subCategory || undefined);
    if (updates.search !== undefined) setSearch(updates.search || "");
  }, []);

  const fetchCategories = async () => {
    const res = await fetch("/api/categories");
    if (res.ok) {
      const data = await res.json();
      setCategories(data);
      if (category || subCategory) {
        const cat = data.find((c: Category) => c.name === category);
        if (cat) {
          setExpandedCategories((prev) => new Set(prev).add(cat.id));
        }
      }
    }
  };

  const fetchPage = async (p: number) => {
    setLoading(true);
    const url = new URL("/api/products", window.location.origin);
    url.searchParams.set("page", String(p));
    url.searchParams.set("perPage", String(perPage));
    if (category) url.searchParams.set("category", category);
    if (subCategory) url.searchParams.set("subCategory", subCategory);
    if (search) url.searchParams.set("search", search);
    const res = await fetch(url.toString());
    const data = await res.json();
    const items = (data.items ?? data) as Product[];
    setProducts(items);
    setTotal(data.total ?? 0);
    setPage(data.page ?? p);
    setLoading(false);
  };

  useEffect(() => { if (hydrated) fetchCategories(); }, [hydrated]);
  useEffect(() => { 
    if (hydrated) {
      fetchPage(page);
    }
  }, [category, subCategory, search, page, hydrated]);

  const handleCategoryChange = (cat: string | undefined, sub?: string) => {
    setCategory(cat);
    setSubCategory(sub);
    updateURL({ category: cat || undefined, subCategory: sub || undefined, page: "1" });
    setPage(1);
  };

  const handleSearchChange = (s: string) => {
    setSearch(s);
    updateURL({ search: s || undefined, page: "1" });
    setPage(1);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    updateURL({ page: String(p) });
  };

const handleClearFilters = () => {
    window.history.pushState({}, "", "/catalogo");
    setCategory(undefined);
    setSubCategory(undefined);
    setSearch("");
    setPage(1);
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const openProduct = (product: Product) => {
    setSelectedProduct(product);
    setSelectedVariant(null);
  };

  const closeProduct = () => {
    setSelectedProduct(null);
    setSelectedVariant(null);
    setQuantity(1);
  };

  const addToCart = () => {
    if (!selectedProduct) return;
    ctxAddToCart(selectedProduct, selectedVariant, quantity);
    setQuantity(1);
    setSelectedVariant(null);
  };

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

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#fa6e83] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-[#fa6e83] text-white sticky top-0 z-50 shadow-md">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" width={40} height={40} alt="Leluma" className="h-10 w-10" />
              <div className="flex flex-col leading-none">
                <span className="text-white font-semibold text-lg">Leluma</span>
                <span className="text-white/80 text-xs font-medium">Mayorista</span>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-[#e55a72] rounded-full transition-colors md:hidden"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="text-sm font-medium">Categorías</span>
              </button>
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
          <div className="w-full">
            <input
              type="text"
              placeholder="Buscar productos..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchChange((e.target as HTMLInputElement).value)}
              className="w-full px-4 py-2.5 border-2 border-white/50 rounded-full focus:outline-none focus:border-white bg-white text-black text-base"
            />
          </div>
        </div>
      </header>

      {/* Mobile Filters — Bottom Sheet */}
      <div className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${showFilters ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilters(false)} />
        {/* Sheet */}
        <div className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl transition-transform duration-300 ${showFilters ? "translate-y-0" : "translate-y-full"}`}>
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-gray-300" />
          </div>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-900">Categorías</span>
            {(category || subCategory) && (
              <button onClick={() => { handleClearFilters(); setShowFilters(false); }} className="text-xs text-[#fa6e83] font-medium">
                Limpiar
              </button>
            )}
          </div>
          {/* Content */}
          <div className="overflow-y-auto max-h-[60vh] px-4 py-3 space-y-1.5 pb-8">
            <button
              onClick={() => { handleCategoryChange(undefined); setShowFilters(false); }}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                !category ? "bg-[#fa6e83] text-white" : "bg-gray-100 text-gray-800"
              }`}
            >
              Todas
            </button>
            {categories.map((cat) => {
              const hasChildren = cat.children && cat.children.length > 0;
              const isExpanded = expandedCategories.has(cat.id);
              return (
                <div key={cat.id}>
                  <button
                    onClick={() => {
                      handleCategoryChange(cat.name);
                      if (hasChildren) {
                        if (!isExpanded) toggleCategory(cat.id);
                      } else {
                        setShowFilters(false);
                      }
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors flex justify-between items-center ${
                      category === cat.name && !subCategory ? "bg-[#fa6e83] text-white" : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {cat.name}
                    {hasChildren && (
                      <span
                        className="text-xs px-1"
                        onClick={(e) => { e.stopPropagation(); toggleCategory(cat.id); }}
                      >
                        {isExpanded ? "▾" : "▸"}
                      </span>
                    )}
                  </button>
                  {hasChildren && isExpanded && (
                    <div className="ml-4 mt-1 space-y-1">
                      {cat.children!.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => { handleCategoryChange(cat.name, child.name); setShowFilters(false); }}
                          className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors ${
                            category === cat.name && subCategory === child.name
                              ? "bg-[#fa6e83] text-white font-medium"
                              : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {child.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

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

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeProduct}>
          <div 
            className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0">
              {selectedProduct.imageUrl ? (
                <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-48 object-cover" />
              ) : (
                <div className="w-full h-24 bg-gray-100 flex items-center justify-center">
                  <span className="text-gray-400 text-sm">Sin imagen</span>
                </div>
              )}
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-xs text-black mb-0.5">{selectedProduct.category}</p>
                  <h2 className="text-lg font-semibold text-black">{selectedProduct.name}</h2>
                </div>
                <button onClick={closeProduct} className="p-1 text-black hover:text-[#fa6e83] shrink-0">
                  ✕
                </button>
              </div>
              
              {selectedProduct.description && (
                <p className="text-sm text-black mb-3">{stripHtml(selectedProduct.description)}</p>
              )}
              
              <p className="text-xl font-bold text-black mb-4">${selectedProduct.price.toFixed(2)}</p>
              
              {selectedProduct.variants.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-medium text-black mb-2 text-sm">{selectedProduct.category === "Accesorios" ? "Colores" : "Aromas"}</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.variants.map((variant) => {
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
                </div>
              )}
              
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-black">Cantidad</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-full border border-[#fa6e83] text-black font-bold hover:border-[#fa6e83]"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-semibold text-black">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-8 h-8 rounded-full border border-[#fa6e83] text-black font-bold hover:border-[#fa6e83]"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            <div className="p-5 pt-0 shrink-0">
              {(() => {
                const noVariantNoStock = selectedProduct.variants.length === 0 && selectedProduct.stock <= 0;
                const variantNotSelected = selectedProduct.variants.length > 0 && !selectedVariant;
                const selectedVariantSoldOut = !!selectedVariant && selectedProduct.variants.find((v) => v.id === selectedVariant)?.stock === 0;
                const disabled = noVariantNoStock || variantNotSelected || selectedVariantSoldOut;
                const label = noVariantNoStock || selectedVariantSoldOut
                  ? "Agotado"
                  : variantNotSelected
                    ? `Seleccioná un ${selectedProduct.category === "Accesorios" ? "color" : "aroma"}`
                    : "Agregar al carrito";
                return (
                  <button
                    onClick={addToCart}
                    disabled={disabled}
                    className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors ${disabled ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-[#fa6e83] text-white hover:bg-[#e55a72]"}`}
                  >
                    {label}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row">
        {/* Desktop Sidebar Filters */}
        <aside className="w-full md:w-60 p-4 hidden md:block">
          <div className="bg-white rounded-lg p-4 shadow-sm sticky top-24">
            <h3 className="font-semibold text-black mb-3">Categorías</h3>
            <CategoryFilter
              variant="catalogo"
              categories={categories}
              expandedCategories={expandedCategories}
              selectedCategory={category}
              selectedSubCategory={subCategory}
              onCategoryChange={handleCategoryChange}
              onToggleExpand={toggleCategory}
            />
          </div>
        </aside>

        {/* Products Grid */}
        <main className="flex-1 p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-black">{total} productos</p>
            {(category || search) && (
              <button
                onClick={handleClearFilters}
                className="text-xs text-[#fa6e83] hover:underline font-medium flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Limpiar filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {products.filter((p) => p.visible).map((p) => {
              const outOfStock = p.variants.length === 0 && p.stock <= 0;
              return (
              <Link
                key={p.id}
                href={`/catalogo/${p.id}`}
                className={`bg-white rounded-lg overflow-hidden transition-shadow flex flex-col border border-gray-200 ${outOfStock ? "opacity-50 cursor-default" : "hover:shadow-lg cursor-pointer"}`}
              >
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="w-full h-32 sm:h-40 object-cover" />
                ) : (
                  <div className="w-full h-32 sm:h-40 bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">200×200</span>
                  </div>
                )}
                <div className="p-3 flex flex-col flex-1">
                  <p className="text-xs text-black mb-1 truncate">{p.category}</p>
                  <h3 className="font-medium text-sm text-black mb-1 line-clamp-2">{p.name}</h3>
                  {p.variants.length > 0 && (
                    <p className="text-xs text-[#fa6e83] mb-2">{p.variants.length} {p.category === "Accesorios" ? "colores" : "aromas"}</p>
                  )}
                  <div className="mt-auto">
                    <p className="text-lg sm:text-xl font-bold text-black mb-2">
                      ${p.price.toFixed(2)}
                    </p>
                    <button
                      disabled={outOfStock}
                      className={`w-full py-2 sm:py-2.5 rounded-lg text-sm font-medium transition-colors ${outOfStock ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-[#fa6e83] text-white hover:bg-[#e55a72]"}`}
                    >
                      {outOfStock ? "Sin stock" : "Ver producto"}
                    </button>
                  </div>
                </div>
              </Link>
              );
            })}
          </div>

          {loading && <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-[#fa6e83] border-t-transparent rounded-full animate-spin" /></div>}
          
          {!loading && products.length === 0 && total === 0 && (category || search) && (
            <div className="text-center py-8">
              <p className="text-black mb-2">No hay productos que coincidan con los filtros</p>
              <button onClick={handleClearFilters} className="text-[#fa6e83] hover:underline text-sm">
                Limpiar filtros
              </button>
            </div>
          )}
          
          {!loading && products.length > 0 && products.length < total && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 border border-[#fa6e83] text-[#fa6e83] rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#fa6e83] hover:text-white transition-colors"
              >
                Anterior
              </button>
              <span className="px-4 py-2 text-black font-medium">
                Página {page} de {Math.ceil(total / perPage)}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= Math.ceil(total / perPage)}
                className="px-4 py-2 border border-[#fa6e83] text-[#fa6e83] rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#fa6e83] hover:text-white transition-colors"
              >
                Siguiente
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}