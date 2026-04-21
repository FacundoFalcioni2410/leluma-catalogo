/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";

type Variant = { id: string; name: string; option: string; price: number | null; stock: number };
type CategoryOption = { id: string; name: string; parentId: string | null; parent: { id: string; name: string } | null };
type Product = {
  id: string;
  hash: string;
  name: string;
  price: number;
  description?: string | null;
  category: string;
  subCategory?: string | null;
  visible: boolean;
  imageUrl?: string | null;
  variants: Variant[];
  order?: number;
};

export default function AdminProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [filterCategory, setFilterCategory] = useState<string | undefined>(undefined);
  const [filterExpanded, setFilterExpanded] = useState<Set<string>>(new Set());
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  const roots = categoryOptions.filter((c) => !c.parentId);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/categories", { credentials: "same-origin" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCategoryOptions(data);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchPage = useCallback(async (p: number, append = false) => {
    setLoading(true);
    const url = new URL("/api/admin/products", window.location.origin);
    url.searchParams.set("page", String(p));
    url.searchParams.set("perPage", String(perPage));
    if (filterCategory) url.searchParams.set("category", filterCategory);
    if (search) url.searchParams.set("search", search);
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      console.error("Fetch failed:", res.status, await res.text());
      setLoading(false);
      return;
    }
    const data = await res.json();
    setItems((prev) => (append ? [...prev, ...(data.items ?? [])] : data.items ?? []));
    setTotal(data.total ?? 0);
    setPage(data.page ?? p);
    setLoading(false);
  }, [filterCategory, search, perPage]);

  useEffect(() => { void fetchPage(1); }, [fetchPage]);
  useEffect(() => { void fetchCategories(); }, [fetchCategories]);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && !loading && items.length < total) {
        void fetchPage(page + 1, true);
      }
    },
    [fetchPage, loading, page, items.length, total]
  );

  useEffect(() => {
    const element = loaderRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [handleObserver]);

  const patchProduct = async (id: string, updates: Partial<Product>) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setItems((ps) => ps.map((p) => (p.id === id ? updated : p)));
      } else {
        const error = await res.text();
        console.error("Failed to save product:", error);
      }
    } catch (err) {
      console.error("Error saving product:", err);
    } finally {
      setLoading(false);
    }
  };

  type VariantDraft = { name: string; option: string; price: number | null; stock: number };

  const ProductCard: React.FC<{ p: Product }> = ({ p }) => {
    const [name, setName] = useState(p.name);
    const [price, setPrice] = useState(p.price);
    const [description] = useState(p.description ?? "");
    const [category, setCategory] = useState(p.category);
    const [subCategory, setSubCategory] = useState(p.subCategory ?? "");
    const [order, setOrder] = useState(p.order ?? 0);
    const [visible, setVisible] = useState(p.visible);
    const [imageUrl, setImageUrl] = useState(p.imageUrl ?? "");
    const [uploading, setUploading] = useState(false);
    const [variants, setVariants] = useState<VariantDraft[]>(
      p.variants.map((v) => ({ name: v.name, option: v.option, price: v.price, stock: v.stock ?? 0 }))
    );
    const [variantsExpanded, setVariantsExpanded] = useState(false);

    const categoryNode = categoryOptions.find((c) => c.name === category);
    const subCategoryOptions = categoryNode ? categoryOptions.filter((c) => c.parentId === categoryNode.id) : [];

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("productId", p.id);

      try {
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          setImageUrl(data.url);
          setItems((prev) => prev.map((item) => item.id === p.id ? { ...item, imageUrl: data.url } : item));
        }
      } catch {
        // ignore
      } finally {
        setUploading(false);
      }
    };

    const updateVariant = (i: number, field: keyof VariantDraft, value: string | number | null) =>
      setVariants((prev) => prev.map((v, idx) => idx === i ? { ...v, [field]: value } : v));

    const removeVariant = (i: number) =>
      setVariants((prev) => prev.filter((_, idx) => idx !== i));

    const addVariant = () =>
      {
        setVariantsExpanded(true);
        return setVariants((prev) => [...prev, { name: "Aroma", option: "", price: null, stock: 0 }]);
      };

    const save = () => {
      patchProduct(p.id, {
        name,
        price,
        description,
        category,
        subCategory: subCategory || null,
        order,
        visible,
        imageUrl: imageUrl || null,
        variants,
      } as Partial<Product>);
    };

    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-200 flex flex-col h-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#fa6e83]/5 to-[#326b83]/5 px-4 py-3 border-b border-gray-100 flex justify-end">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={visible} 
              onChange={(e)=>setVisible(e.target.checked)} 
              className="w-4 h-4 text-[#fa6e83] rounded border-gray-300 focus:ring-[#fa6e83]" 
            />
            <span className={`text-xs font-medium ${visible ? 'text-green-600' : 'text-gray-400'}`}>
              {visible ? "Visible" : "Oculto"}
            </span>
          </label>
        </div>

        {/* Image */}
        <label className="h-40 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center relative cursor-pointer group overflow-hidden shrink-0">
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-[#fa6e83] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-gray-500">Subiendo...</span>
            </div>
          ) : imageUrl ? (
            <>
              <img src={imageUrl} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm text-gray-700 rounded-full px-4 py-1.5 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                Cambiar imagen
              </span>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-[#fa6e83] transition-colors">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-medium">+ Agregar imagen</span>
            </div>
          )}
          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </label>

        {/* Scrollable Content */}
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 block">Nombre</label>
            <input 
              className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#fa6e83]/20 focus:border-[#fa6e83] transition-all" 
              value={name} 
              onChange={(e)=>setName(e.target.value)} 
              placeholder="Nombre del producto"
            />
          </div>

          {/* Price & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 block">Precio</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input 
                  className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#fa6e83]/20 focus:border-[#fa6e83] transition-all" 
                  type="number" 
                  value={price} 
                  onChange={(e)=>setPrice(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 block">Categoría</label>
              <select 
                className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#fa6e83]/20 focus:border-[#fa6e83] transition-all appearance-none cursor-pointer" 
                value={category} 
                onChange={(e)=>setCategory(e.target.value)}
              >
                <option value="">Seleccionar</option>
                {roots.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Subcategory */}
          {subCategoryOptions.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 block">Subcategoría</label>
              <select 
                className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#fa6e83]/20 focus:border-[#fa6e83] transition-all appearance-none cursor-pointer" 
                value={subCategory ?? ""} 
                onChange={(e)=>setSubCategory(e.target.value)}
              >
                <option value="">Ninguna</option>
                {subCategoryOptions.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

{/* Order */}
          <div>
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 block">Orden</label>
            <input 
              className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#fa6e83]/20 focus:border-[#fa6e83] transition-all" 
              type="number" 
              value={order} 
              onChange={(e)=>setOrder(parseInt(e.target.value) || 0)}
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">Mayor número = aparece primero</p>
          </div>

          {/* Variants */}
          <div className="border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => setVariantsExpanded((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-[#fa6e83] transition-colors"
              >
                <span className={`transform transition-transform ${variantsExpanded ? 'rotate-90' : ''}`}>▸</span>
                <span>Aromas</span>
                {variants.length > 0 && (
                  <span className="bg-gradient-to-r from-[#fa6e83] to-[#fa6e83]/80 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold">
                    {variants.length}
                  </span>
                )}
              </button>
              <button 
                type="button" 
                onClick={addVariant} 
                className="text-xs font-medium text-[#fa6e83] hover:text-[#e55a72] hover:underline transition-all"
              >
                + Agregar
              </button>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {variants.length === 0 && (
                <p className="text-xs text-gray-400 italic text-center py-2">Sin aromas configurados</p>
              )}
              {(variantsExpanded ? variants : variants.slice(0, 3)).map((v, i) => (
                <div key={i} className="flex items-center gap-2 group">
                  <input
                    placeholder="Nombre del aroma"
                    value={v.option}
                    onChange={(e) => updateVariant(i, "option", e.target.value)}
                    className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#fa6e83]/20 focus:border-[#fa6e83] transition-all"
                  />
                  <input
                    type="number"
                    placeholder="Stock"
                    value={v.stock}
                    onChange={(e) => updateVariant(i, "stock", parseInt(e.target.value) || 0)}
                    className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-900 text-xs text-center focus:outline-none focus:ring-2 focus:ring-[#fa6e83]/20 focus:border-[#fa6e83] transition-all"
                  />
                  <button 
                    type="button" 
                    onClick={() => removeVariant(i)} 
                    className="text-gray-300 hover:text-red-500 hover:bg-red-50 rounded p-1 transition-all shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              {!variantsExpanded && variants.length > 3 && (
                <button
                  type="button"
                  onClick={() => setVariantsExpanded(true)}
                  className="text-xs font-medium text-[#326b83] hover:text-[#fa6e83] hover:underline transition-all"
                >
                  Ver {variants.length - 3} más…
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Save Button - Always at bottom */}
        <div className="p-4 pt-0 border-t border-gray-100 bg-gradient-to-b from-transparent to-gray-50/50">
          <button 
            className="w-full bg-gradient-to-r from-[#fa6e83] to-[#fa6e83]/90 text-white font-medium py-2.5 rounded-lg hover:from-[#e55a72] hover:to-[#e55a72]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md" 
            onClick={save} 
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Guardando...
              </span>
            ) : (
              "Guardar cambios"
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#fa6e83] to-[#326b83] bg-clip-text text-transparent">Productos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona tu catálogo de productos</p>
        </div>
        <button
          onClick={() => { window.location.href = "/api/admin/products/export"; }}
          className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#fa6e83] to-[#fa6e83]/90 text-white font-medium py-2.5 px-5 rounded-lg hover:from-[#e55a72] hover:to-[#e55a72]/90 transition-all shadow-sm hover:shadow-md"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Exportar CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative w-48">
            <button
              type="button"
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 text-sm hover:bg-gray-100 transition-all"
            >
              <span>{filterCategory || 'Todas las categorías'}</span>
              <svg className={`w-4 h-4 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showCategoryDropdown && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => { setFilterCategory(undefined); setShowCategoryDropdown(false); }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    !filterCategory ? 'bg-[#fa6e83] text-white' : 'text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Todas
                </button>
                {roots.map((cat) => (
                  <div key={cat.id}>
                    <button
                      type="button"
                      onClick={() => { setFilterCategory(cat.name); setShowCategoryDropdown(false); }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors flex justify-between items-center ${
                        filterCategory === cat.name ? 'bg-[#fa6e83] text-white' : 'text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      {cat.name}
                      {categoryOptions.some((c) => c.parentId === cat.id) && (
                        <span 
                          onClick={(e) => { e.stopPropagation(); setFilterExpanded((prev) => {
                            const next = new Set(prev);
                            if (next.has(cat.id)) next.delete(cat.id);
                            else next.add(cat.id);
                            return next;
                          }); }}
                          className="text-xs text-gray-500 hover:text-[#fa6e83]"
                        >
                          {filterExpanded.has(cat.id) ? '▾' : '▸'}
                        </span>
                      )}
                    </button>
                    {categoryOptions.some((c) => c.parentId === cat.id) && filterExpanded.has(cat.id) && (
                      <div className="ml-4 bg-gray-50">
                        {categoryOptions.filter((c) => c.parentId === cat.id).map((child) => (
                          <button
                            key={child.id}
                            type="button"
                            onClick={() => { setFilterCategory(child.name); setShowCategoryDropdown(false); }}
                            className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                              filterCategory === child.name ? 'bg-[#fa6e83] text-white' : 'text-gray-900 hover:bg-gray-200'
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
            )}
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={search}
                onChange={(e)=>{ setSearch(e.target.value); setPage(1); }}
                placeholder="Buscar productos..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#fa6e83]/20 focus:border-[#fa6e83] transition-all"
              />
            </div>
          </div>
          <select 
            value={perPage} 
            onChange={(e)=>{ setPerPage(parseInt(e.target.value, 10)); }} 
            className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#fa6e83]/20 focus:border-[#fa6e83] transition-all cursor-pointer"
          >
            <option value={50}>50 por página</option>
            <option value={100}>100 por página</option>
            <option value={200}>200 por página</option>
          </select>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Total:</span>
            <span className="font-semibold text-gray-900">{total} productos</span>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {items.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-8">
          <div className="w-6 h-6 border-2 border-[#fa6e83] border-t-transparent rounded-full animate-spin" />
          <span className="text-[#fa6e83] font-medium">Cargando productos...</span>
        </div>
      )}

      {/* Loader trigger */}
      <div ref={loaderRef} className="h-10" />

      {/* End of list */}
      {items.length >= total && items.length > 0 && (
        <div className="text-center py-8 border-t border-gray-200">
          <p className="text-gray-500 text-sm">No hay más productos para mostrar</p>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && !loading && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-gray-500 font-medium">No se encontraron productos</p>
          <p className="text-gray-400 text-sm mt-1">Intenta ajustar los filtros de búsqueda</p>
        </div>
      )}
    </div>
  );
}
