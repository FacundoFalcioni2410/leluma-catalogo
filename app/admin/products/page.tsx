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

  const fetchPage = async (p: number, append = false) => {
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
  };

  useEffect(() => {
    fetchPage(1);
  }, [category, search, perPage]);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && !loading && items.length < total) {
        fetchPage(page + 1, true);
      }
    },
    [loading, page, items.length, total]
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

  const ProductRow: React.FC<{ p: Product }> = ({ p }) => {
    const [name, setName] = useState(p.name);
    const [price, setPrice] = useState(p.price);
    const [description] = useState(p.description ?? "");
    const [category, setCategory] = useState(p.category);
    const [subCategory, setSubCategory] = useState(p.subCategory ?? "");
    const [visible, setVisible] = useState(p.visible);

    const save = () => {
      patchProduct(p.id, {
        name,
        price,
        description,
        category,
        subCategory,
        visible,
      } as Partial<Product>);
    };

    return (
      <tr className="border-b bg-white hover:bg-gray-50">
        <td className="p-2 text-sm text-[#326b83]">{p.hash}</td>
        <td className="p-2"><input className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-[black]" value={name} onChange={(e)=>setName(e.target.value)} /></td>
        <td className="p-2"><input className="w-24 border border-gray-300 rounded px-3 py-2 bg-white text-[black]" type="number" value={price} onChange={(e)=>setPrice(parseFloat(e.target.value))} /></td>
        <td className="p-2"><input className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-[black]" value={description ?? ""} onChange={()=>{}} /></td>
        <td className="p-2"><input className="w-32 border border-gray-300 rounded px-3 py-2 bg-white text-[black]" value={category} onChange={(e)=>setCategory(e.target.value)} /></td>
        <td className="p-2"><input className="w-32 border border-gray-300 rounded px-3 py-2 bg-white text-[black]" value={subCategory ?? ""} onChange={(e)=>setSubCategory(e.target.value)} /></td>
        <td className="p-2">
          <label className="inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={visible} onChange={(e)=>setVisible(e.target.checked)} className="w-5 h-5 text-[#8b5e3c]" />
            <span className="ml-2 text-sm text-[black]">{visible ? "Visible" : "Oculto"}</span>
          </label>
        </td>
        <td className="p-2"><button className="bg-[#8b5e3c] text-white px-4 py-2 rounded hover:bg-[#6d4a2f] disabled:opacity-50" onClick={save} disabled={loading}>Guardar</button></td>
      </tr>
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-[black] mb-6">Productos</h1>
      
      <div className="mb-4 flex flex-wrap gap-3 items-center bg-gray-100 p-3 rounded-lg">
        <input
          value={search}
          onChange={(e)=>{ setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar producto..."
          className="flex-1 min-w-[200px] border border-gray-300 rounded px-4 py-2 bg-white text-[black]"
        />
        <select value={category ?? ''} onChange={(e)=>{ setCategory(e.target.value || undefined); }} className="border border-gray-300 rounded px-3 py-2 bg-white text-[black]">
          <option value="">Todas las categorías</option>
          {allCategories.map((c)=> (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={perPage} onChange={(e)=>{ setPerPage(parseInt(e.target.value, 10)); }} className="border border-gray-300 rounded px-3 py-2 bg-white text-[black]">
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={200}>200</option>
        </select>
        <span className="text-sm text-[black]">{total} productos</span>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg border">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-[#326b83] uppercase">Hash</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-[#326b83] uppercase">Nombre</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-[#326b83] uppercase">Precio</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-[#326b83] uppercase">Descripción</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-[#326b83] uppercase">Categoría</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-[#326b83] uppercase">Subcategoría</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-[#326b83] uppercase">Estado</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-[#326b83] uppercase">Acción</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => <ProductRow key={p.id} p={p} />)}
          </tbody>
        </table>
      </div>

      {loading && <div className="text-center py-4 text-[#326b83]">Cargando...</div>}
      
      <div ref={loaderRef} className="h-10" />
      
      {items.length >= total && (
        <div className="text-center py-4 text-[#326b83]">No hay más productos</div>
      )}
    </div>
  );
}