"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";

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
  variants: Array<{ id: string; name: string; option: string; price: number | null; stock: number }>;
};

type CartItem = { product: Product; quantity: number };

function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  const fetchPage = async (p: number, append = false) => {
    setLoading(true);
    const url = new URL("/api/products", window.location.origin);
    url.searchParams.set("page", String(p));
    url.searchParams.set("perPage", String(perPage));
    if (category) url.searchParams.set("category", category);
    if (search) url.searchParams.set("search", search);
    const res = await fetch(url.toString());
    const data = await res.json();
    const items = (data.items ?? data) as Product[];
    setProducts((prev) => (append ? [...prev, ...items] : items));
    setTotal(data.total ?? 0);
    setPage(data.page ?? p);
    if (!append && items.length) {
      const cats = Array.from(new Set(items.map((it) => it.category))).filter(Boolean);
      setAllCategories(cats as string[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPage(1);
  }, [category, search]);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && !loading && products.length < total) {
        fetchPage(page + 1, true);
      }
    },
    [loading, page, products.length, total]
  );

  useEffect(() => {
    const element = loaderRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [handleObserver]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const whatsapp = () => {
    if (cart.length === 0) return;
    const items_list = cart
      .map((item) => `- ${item.product.name} x${item.quantity}: $${item.product.price * item.quantity}`)
      .join("%0A");
    const message = `Hola! Quiero comprar:%0A${items_list}%0ATotal: $${cartTotal}`;
    window.open(`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=${message}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-[#326b83] text-white sticky top-0 z-50 shadow-md">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <Link href="/" className="text-xl font-bold text-white">
              Leluma
            </Link>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="p-2 hover:bg-[#fa6e83] rounded-full transition-colors md:hidden"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
              <button
                onClick={() => setShowCart(!showCart)}
                className="relative p-2 hover:bg-[#fa6e83] rounded-full transition-colors"
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
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchPage(1)}
              className="w-full px-4 py-2.5 border-2 border-[#326b83] rounded-full focus:outline-none focus:border-[#fa6e83] bg-white text-black text-base"
            />
          </div>
        </div>
      </header>

      {/* Mobile Filters */}
      {showFilters && (
        <div className="bg-white border-b border-[#326b83] p-4 md:hidden">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setCategory(undefined); setShowFilters(false); }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                !category ? "bg-[#fa6e83] text-white" : "bg-gray-100 text-black"
              }`}
            >
              Todas
            </button>
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => { setCategory(cat); setShowFilters(false); }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  category === cat ? "bg-[#fa6e83] text-white" : "bg-gray-100 text-black"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Cart Sidebar */}
      {showCart && (
        <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowCart(false)}>
          <div 
            className="absolute right-0 top-0 bottom-0 left-0 md:left-auto md:w-80 w-full bg-white shadow-xl flex flex-col" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 flex items-center justify-between border-b border-[#326b83]">
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
                    <div key={item.product.id} className="border-b border-gray-200 pb-4">
                      <p className="font-medium text-black text-sm">{item.product.name}</p>
                      <p className="text-black font-semibold">${item.product.price}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="w-10 h-10 border-2 border-[#326b83] rounded-lg flex items-center justify-center text-black font-bold text-lg"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-black font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="w-10 h-10 border-2 border-[#326b83] rounded-lg flex items-center justify-center text-black font-bold text-lg"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
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
              <div className="p-4 border-t border-[#326b83]">
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

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row">
        {/* Desktop Sidebar Filters */}
        <aside className="w-full md:w-60 p-4 hidden md:block">
          <div className="bg-white rounded-lg p-4 shadow-sm sticky top-24">
            <h3 className="font-semibold text-black mb-3">Categorías</h3>
            <div className="space-y-2">
              <button
                onClick={() => setCategory(undefined)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  !category ? "bg-[#fa6e83] text-white" : "hover:bg-gray-100 text-black"
                }`}
              >
                Todas
              </button>
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    category === cat ? "bg-[#fa6e83] text-white" : "hover:bg-gray-100 text-black"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Products Grid */}
        <main className="flex-1 p-4">
          <p className="text-sm text-black mb-4">{total} productos</p>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {products.filter((p) => p.visible).map((p) => (
              <div key={p.id} className="bg-white rounded-lg overflow-hidden hover:shadow-lg transition-shadow flex flex-col border border-gray-200">
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
                  <p className="text-xs text-black line-clamp-2 mb-2 flex-1 hidden sm:block">
                    {stripHtml(p.description || "")}
                  </p>
                  <div className="mt-auto">
                    <p className="text-lg sm:text-xl font-bold text-black mb-2">
                      ${p.price.toFixed(2)}
                    </p>
                    <button
                      onClick={() => addToCart(p)}
                      className="w-full bg-[#fa6e83] text-white py-2 sm:py-2.5 rounded-lg text-sm font-medium hover:bg-[#e55a72] transition-colors"
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {loading && <div className="text-center py-8 text-black">Cargando...</div>}
          <div ref={loaderRef} className="h-10" />
          {products.length >= total && products.length > 0 && (
            <div className="text-center py-8 text-black">No hay más productos</div>
          )}
        </main>
      </div>
    </div>
  );
}