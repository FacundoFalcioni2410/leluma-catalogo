/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

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

type Category = {
  id: string;
  name: string;
  children?: Array<{ id: string; name: string }>;
};

type CartItem = { product: Product; variantId: string | null; variantName: string | null; quantity: number };

function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

function useQueryParams() {
  const [params, setParams] = useState<URLSearchParams>();
  
  useEffect(() => {
    setParams(new URLSearchParams(window.location.search));
  }, []);
  
  const setQuery = (key: string, value: string | null) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (value) {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
    window.history.pushState({}, '', url.toString());
    setParams(new URLSearchParams(url.searchParams));
  };
  
  const clearQuery = () => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.search = '';
    window.history.pushState({}, '', url.toString());
    setParams(new URLSearchParams());
  };
  
  return { params, setQuery, clearQuery };
}

export default function CatalogPage() {
  const { params, setQuery, clearQuery } = useQueryParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [perPage] = useState(12);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const fetchCategories = async () => {
    const res = await fetch("/api/categories");
    if (res.ok) {
      const data = await res.json();
      setCategories(data);
    }
  };

  const fetchPage = async (p: number) => {
    setLoading(true);
    const url = new URL("/api/products", window.location.origin);
    url.searchParams.set("page", String(p));
    url.searchParams.set("perPage", String(perPage));
    if (category) url.searchParams.set("category", category);
    if (search) url.searchParams.set("search", search);
    const res = await fetch(url.toString());
    const data = await res.json();
    const items = (data.items ?? data) as Product[];
    setProducts(items);
    setTotal(data.total ?? 0);
    setPage(data.page ?? p);
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
    if (params) {
      const c = params.get('category');
      const s = params.get('search');
      const p = params.get('page');
      if (c) setCategory(c);
      if (s) setSearch(s);
      if (p) setPage(parseInt(p));
    }
  }, [params]);

  useEffect(() => {
    if (params !== undefined) {
      fetchPage(page);
    }
  }, [category, search, page, params]);

  const handleCategoryChange = (cat: string | undefined) => {
    setCategory(cat);
    setQuery('category', cat || null);
    setPage(1);
  };

  const handleSearchChange = (s: string) => {
    setSearch(s);
    setQuery('search', s || null);
    setPage(1);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    setQuery('page', String(p));
  };

  const handleClearFilters = () => {
    clearQuery();
    setCategory(undefined);
    setSearch("");
    setPage(1);
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
    
    setCart((prev) => {
      const existing = prev.find(
        (item) => item.product.id === selectedProduct.id && item.variantId === selectedVariant
      );
      if (existing) {
        return prev.map((item) =>
          item.product.id === selectedProduct.id && item.variantId === selectedVariant
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      const variant = selectedProduct.variants.find((v) => v.id === selectedVariant);
      return [
        ...prev,
        {
          product: selectedProduct,
          variantId: selectedVariant,
          variantName: variant?.option ?? null,
          quantity: quantity,
        },
      ];
    });
    setQuantity(1);
    setSelectedVariant(null);
  };

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

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-[#fa6e83] text-white sticky top-0 z-50 shadow-md">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" width={40} height={40} alt="Leluma" className="h-10 w-10" />
              <span className="text-white font-semibold text-lg leading-none">Leluma</span>
            </Link>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="p-2 hover:bg-[#e55a72] rounded-full transition-colors md:hidden"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
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
              onKeyDown={(e) => e.key === "Enter" && handleSearchChange(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-white/50 rounded-full focus:outline-none focus:border-white bg-white text-black text-base"
            />
          </div>
        </div>
      </header>

      {/* Mobile Filters */}
      {showFilters && (
        <div className="bg-white border-b border-[#fa6e83] p-4 md:hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-black">Filtros</span>
            {(category || search) && (
              <button
                onClick={handleClearFilters}
                className="text-xs text-[#fa6e83] hover:underline font-medium"
              >
                Limpiar
              </button>
            )}
          </div>
          <div className="space-y-2">
            <button
              onClick={() => { handleCategoryChange(undefined); setShowFilters(false); }}
              className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !category ? "bg-[#fa6e83] text-white" : "bg-gray-100 text-black"
              }`}
            >
              Todas
            </button>
            {categories.map((cat) => (
              <div key={cat.id}>
                <button
                  onClick={() => { handleCategoryChange(cat.name); setShowFilters(false); }}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors flex justify-between items-center ${
                    category === cat.name ? "bg-[#fa6e83] text-white" : "bg-gray-100 text-black"
                  }`}
                >
                  {cat.name}
                  {cat.children && cat.children.length > 0 && (
                    <span className="text-xs">{expandedCategories.has(cat.id) ? "▾" : "▸"}</span>
                  )}
                </button>
                {cat.children && cat.children.length > 0 && expandedCategories.has(cat.id) && (
                  <div className="ml-4 mt-1 space-y-1">
                    {cat.children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => { handleCategoryChange(child.name); setShowFilters(false); }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          category === child.name ? "bg-[#fa6e83] text-white" : "hover:bg-gray-200 text-black"
                        }`}
                      >
                        {child.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
                  <h3 className="font-medium text-black mb-2 text-sm">Aromas</h3>
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
              <button
                onClick={addToCart}
                disabled={selectedProduct.variants.length > 0 && (!selectedVariant || selectedProduct.variants.find((v) => v.id === selectedVariant)?.stock === 0)}
                className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  selectedProduct.variants.length > 0 && (!selectedVariant || selectedProduct.variants.find((v) => v.id === selectedVariant)?.stock === 0)
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-[#fa6e83] text-white hover:bg-[#e55a72]"
                }`}
              >
                {selectedProduct.variants.length > 0 && !selectedVariant
                  ? "Seleccioná un aroma"
                  : selectedProduct.variants.find((v) => v.id === selectedVariant)?.stock === 0
                    ? "Agotado"
                    : "Agregar al carrito"}
              </button>
            </div>
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
                onClick={() => handleCategoryChange(undefined)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  !category ? "bg-[#fa6e83] text-white" : "hover:bg-gray-100 text-black"
                }`}
              >
                Todas
              </button>
              {categories.map((cat) => (
                <div key={cat.id}>
                  <button
                    onClick={() => handleCategoryChange(cat.name)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex justify-between items-center ${
                      category === cat.name ? "bg-[#fa6e83] text-white" : "hover:bg-gray-100 text-black"
                    }`}
                  >
                    {cat.name}
                    {cat.children && cat.children.length > 0 && (
                      <span 
                        onClick={(e) => { e.stopPropagation(); toggleCategory(cat.id); }}
                        className="text-xs text-gray-500 hover:text-[#fa6e83]"
                      >
                        {expandedCategories.has(cat.id) ? "▾" : "▸"}
                      </span>
                    )}
                  </button>
                  {cat.children && cat.children.length > 0 && expandedCategories.has(cat.id) && (
                    <div className="ml-4 mt-1 space-y-1">
                      {cat.children.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => handleCategoryChange(child.name)}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            category === child.name ? "bg-[#fa6e83] text-white" : "hover:bg-gray-100 text-black"
                          }`}
                        >
                          {child.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
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
            {products.filter((p) => p.visible).map((p) => (
              <div 
                key={p.id} 
                className="bg-white rounded-lg overflow-hidden hover:shadow-lg transition-shadow flex flex-col border border-gray-200 cursor-pointer"
                onClick={() => openProduct(p)}
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
                    <p className="text-xs text-[#fa6e83] mb-2">{p.variants.length} aromas</p>
                  )}
                  <div className="mt-auto">
                    <p className="text-lg sm:text-xl font-bold text-black mb-2">
                      ${p.price.toFixed(2)}
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); openProduct(p); }}
                      className="w-full bg-[#fa6e83] text-white py-2 sm:py-2.5 rounded-lg text-sm font-medium hover:bg-[#e55a72] transition-colors"
                    >
                      Ver producto
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {loading && <div className="text-center py-8 text-black">Cargando...</div>}
          
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
          
          {!loading && products.length >= total && products.length > 0 && (
            <div className="text-center py-8 text-black">No hay más productos</div>
          )}
        </main>
      </div>
    </div>
  );
}