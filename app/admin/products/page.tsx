/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";

type Variant = { id: string; name: string; option: string; price: number | null; stock: number };
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
};

export default function AdminProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(async (p: number, append = false) => {
    await Promise.resolve();
    setLoading(true);
    const url = new URL("/api/admin/products", window.location.origin);
    url.searchParams.set("page", String(p));
    url.searchParams.set("perPage", String(perPage));
    if (category) url.searchParams.set("category", category);
    if (search) url.searchParams.set("search", search);
    const res = await fetch(url.toString(), { cache: "no-store" });
    const data = await res.json();
    setItems((prev) => (append ? [...prev, ...(data.items ?? [])] : data.items ?? []));
    setTotal(data.total ?? 0);
    setPage(data.page ?? p);
    if (!append && data.items?.length) {
      const cats = Array.from(new Set(data.items.map((i: Product) => i.category))).filter(Boolean);
      setAllCategories(cats as string[]);
    }
    setLoading(false);
  }, [category, search, perPage]);

  useEffect(() => {
    void fetchPage(1);
  }, [fetchPage]);

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
      }
    } catch {
      // ignore
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
    const [visible, setVisible] = useState(p.visible);
    const [imageUrl, setImageUrl] = useState(p.imageUrl ?? "");
    const [uploading, setUploading] = useState(false);
    const [variants, setVariants] = useState<VariantDraft[]>(
      p.variants.map((v) => ({ name: v.name, option: v.option, price: v.price, stock: v.stock }))
    );
    const [variantsExpanded, setVariantsExpanded] = useState(false);

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
      setVariants((prev) => [...prev, { name: "Aroma", option: "", price: null, stock: 0 }]);

    const save = () => {
      patchProduct(p.id, {
        name,
        price,
        description,
        category,
        subCategory,
        visible,
        imageUrl: imageUrl || null,
        variants,
      } as Partial<Product>);
    };

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-3 h-full">
        <div className="flex justify-between items-start">
          <span className="text-xs text-[#326b83]">{p.hash}</span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={visible} onChange={(e)=>setVisible(e.target.checked)} className="w-4 h-4 text-[#fa6e83]" />
            <span className="text-xs text-black">{visible ? "Visible" : "Oculto"}</span>
          </label>
        </div>
        
        <label className="h-24 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center relative cursor-pointer group">
          {uploading ? (
            <span className="text-xs text-black">Subiendo...</span>
          ) : imageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
              <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs">
                Cambiar imagen
              </span>
            </>
          ) : (
            <span className="text-xs text-black">+ Agregar imagen</span>
          )}
          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </label>
        
        <div>
          <label className="text-xs text-black">Nombre</label>
          <input className="w-full border border-gray-300 rounded px-2 py-1.5 bg-white text-black text-sm" value={name} onChange={(e)=>setName(e.target.value)} />
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-black">Precio</label>
            <input className="w-full border border-gray-300 rounded px-2 py-1.5 bg-white text-black text-sm" type="number" value={price} onChange={(e)=>setPrice(parseFloat(e.target.value))} />
          </div>
          <div>
            <label className="text-xs text-black">Categoría</label>
            <input className="w-full border border-gray-300 rounded px-2 py-1.5 bg-white text-black text-sm" value={category} onChange={(e)=>setCategory(e.target.value)} />
          </div>
        </div>
        
        <div>
          <label className="text-xs text-black">Subcategoría</label>
          <input className="w-full border border-gray-300 rounded px-2 py-1.5 bg-white text-black text-sm" value={subCategory ?? ""} onChange={(e)=>setSubCategory(e.target.value)} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <button
              type="button"
              onClick={() => setVariantsExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs font-medium text-black hover:text-[#fa6e83]"
            >
              <span>{variantsExpanded ? "▾" : "▸"}</span>
              <span>Aromas</span>
              {variants.length > 0 && (
                <span className="ml-1 bg-[#fa6e83]/10 text-[#fa6e83] rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                  {variants.length}
                </span>
              )}
            </button>
            <button type="button" onClick={addVariant} className="text-xs text-[#fa6e83] hover:underline">+ Agregar</button>
          </div>
          <div className="space-y-1.5">
            {variants.length === 0 && (
              <p className="text-xs text-gray-400 italic">Sin aromas</p>
            )}
            {(variantsExpanded ? variants : variants.slice(0, 2)).map((v, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  placeholder="Aroma"
                  value={v.option}
                  onChange={(e) => updateVariant(i, "option", e.target.value)}
                  className="flex-1 border border-gray-300 rounded px-2 py-1 bg-white text-black text-xs"
                />
                <button type="button" onClick={() => removeVariant(i)} className="text-red-400 hover:text-red-600 text-sm leading-none">✕</button>
              </div>
            ))}
            {!variantsExpanded && variants.length > 2 && (
              <button
                type="button"
                onClick={() => setVariantsExpanded(true)}
                className="text-xs text-[#fa6e83] hover:underline"
              >
                Ver {variants.length - 2} más…
              </button>
            )}
          </div>
        </div>

        <button className="w-full bg-[#fa6e83] text-white px-4 py-2 rounded hover:bg-[#e55a72] disabled:opacity-50 text-sm mt-auto" onClick={save} disabled={loading}>Guardar</button>
      </div>
    );
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-[#fa6e83]">Productos</h1>
        <button
          onClick={() => { window.location.href = "/api/admin/products/export"; }}
          className="bg-[#fa6e83] text-white py-2 px-4 rounded-md hover:bg-[#e55a72] transition-colors text-sm"
        >
          Exportar CSV
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 items-center bg-white p-3 rounded-lg border">
          <input
            value={search}
            onChange={(e)=>{ setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar..."
            className="flex-1 min-w-[150px] border border-gray-300 rounded px-3 py-1.5 bg-white text-black text-sm"
          />
          <select value={category ?? ''} onChange={(e)=>{ setCategory(e.target.value || undefined); }} className="border border-gray-300 rounded px-2 py-1.5 bg-white text-black text-sm">
            <option value="">Todas</option>
            {allCategories.map((c)=> (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select value={perPage} onChange={(e)=>{ setPerPage(parseInt(e.target.value, 10)); }} className="border border-gray-300 rounded px-2 py-1.5 bg-white text-black text-sm">
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
          <span className="text-xs text-black">{total} productos</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>

      {loading && <div className="text-center py-4 text-[#fa6e83]">Cargando...</div>}
      
      <div ref={loaderRef} className="h-10" />

      {items.length >= total && (
        <div className="text-center py-4 text-[#fa6e83]">No hay más productos</div>
      )}
    </>
  );
}