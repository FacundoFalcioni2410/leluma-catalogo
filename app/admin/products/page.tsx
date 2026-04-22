/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import CategoryFilter from "@/app/components/CategoryFilter";

type CategoryOption = { id: string; name: string; parentId: string | null; children?: { id: string; name: string }[] };
type Product = {
  id: string;
  hash: string;
  name: string;
  price: number;
  category: string;
  subCategory?: string | null;
  visible: boolean;
  imageUrl?: string | null;
  order: number;
  stock: number;
  variants: { id: string; stock: number }[];
};

export default function AdminProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [filterCategory, setFilterCategory] = useState<string | undefined>(undefined);
  const [filterSubCategory, setFilterSubCategory] = useState<string | undefined>(undefined);
  const [filterExpanded, setFilterExpanded] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const totalPages = Math.ceil(total / perPage);

  const syncUrl = useCallback((overrides: { page?: number; search?: string; category?: string | null; subCategory?: string | null }) => {
    const url = new URL(window.location.href);
    const p = overrides.page ?? page;
    const s = "search" in overrides ? overrides.search : search;
    const cat = "category" in overrides ? overrides.category : filterCategory;
    const sub = "subCategory" in overrides ? overrides.subCategory : filterSubCategory;
    url.searchParams.set("page", String(p));
    if (s) url.searchParams.set("search", s); else url.searchParams.delete("search");
    if (cat) url.searchParams.set("category", cat); else url.searchParams.delete("category");
    if (sub) url.searchParams.set("subCategory", sub); else url.searchParams.delete("subCategory");
    window.history.pushState({}, "", url.toString());
  }, [page, search, filterCategory, filterSubCategory]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/categories", { credentials: "same-origin" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const roots = data.filter((c: CategoryOption) => !c.parentId);
          const withChildren = roots.map((c: CategoryOption) => ({
            ...c,
            children: data.filter((ch: CategoryOption) => ch.parentId === c.id).map((ch: CategoryOption) => ({ id: ch.id, name: ch.name })),
          }));
          setCategoryOptions(withChildren);
          if (filterCategory || filterSubCategory) {
            const cat = withChildren.find((c: CategoryOption) => c.name === filterCategory);
            if (cat) {
              setFilterExpanded((prev) => new Set(prev).add(cat.id));
            }
          }
        }
      }
    } catch { /* ignore */ }
  }, [filterCategory, filterSubCategory]);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    const url = new URL("/api/admin/products", window.location.origin);
    url.searchParams.set("page", String(p));
    url.searchParams.set("perPage", String(perPage));
    if (filterCategory) url.searchParams.set("category", filterCategory);
    if (filterSubCategory) url.searchParams.set("subCategory", filterSubCategory);
    if (search) url.searchParams.set("search", search);
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    setItems(data.items ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [filterCategory, filterSubCategory, search, perPage]);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const p = parseInt(sp.get("page") ?? "1") || 1;
    const s = sp.get("search") ?? "";
    const cat = sp.get("category") || undefined;
    const sub = sp.get("subCategory") || undefined;
    if (p !== 1) setPage(p);
    if (s) setSearch(s);
    if (cat) setFilterCategory(cat);
    if (sub) setFilterSubCategory(sub);
    setInitialized(true);
  }, []);

  useEffect(() => { if (initialized) void fetchPage(page); }, [fetchPage, page, initialized]);
  useEffect(() => { void fetchCategories(); }, [fetchCategories]);

  const toggleVisible = async (id: string, visible: boolean) => {
    setItems((prev) => prev.map((p) => p.id === id ? { ...p, visible } : p));
    await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible }),
    });
  };

  const changePage = (p: number) => { setPage(p); syncUrl({ page: p }); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const resetPage = () => { setPage(1); syncUrl({ page: 1 }); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#fa6e83] to-[#326b83] bg-clip-text text-transparent">Productos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona tu catálogo de productos</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/products/new"
            className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 font-medium py-2.5 px-5 rounded-lg hover:bg-gray-50 transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Crear producto
          </Link>
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
      </div>

      {/* Search + filters + table */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar filters — desktop only */}
        <div className="hidden lg:block lg:w-60 shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm sticky top-24">
            <h3 className="font-semibold text-gray-700 text-sm mb-3">Categorías</h3>
            <CategoryFilter
              variant="catalogo"
              categories={categoryOptions}
              expandedCategories={filterExpanded}
              selectedCategory={filterCategory}
              selectedSubCategory={filterSubCategory}
              onCategoryChange={(cat, sub) => { setFilterCategory(cat); setFilterSubCategory(sub); setPage(1); syncUrl({ page: 1, category: cat ?? null, subCategory: sub ?? null }); }}
              onToggleExpand={(id) => setFilterExpanded((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; })}
            />
          </div>
        </div>

        {/* Bottom sheet — mobile only */}
        <div className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl transition-transform duration-300 ${sidebarOpen ? "translate-y-0" : "translate-y-full"}`}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <span className="font-semibold text-gray-900">Categorías</span>
              {(filterCategory || filterSubCategory) && (
                <button
                  onClick={() => { setFilterCategory(undefined); setFilterSubCategory(undefined); setPage(1); syncUrl({ page: 1, category: null, subCategory: null }); setSidebarOpen(false); }}
                  className="text-xs text-[#fa6e83] font-medium"
                >
                  Limpiar
                </button>
              )}
            </div>
            <div className="overflow-y-auto max-h-[60vh] px-4 py-3 pb-8">
              <CategoryFilter
                variant="catalogo"
                categories={categoryOptions}
                expandedCategories={filterExpanded}
                selectedCategory={filterCategory}
                selectedSubCategory={filterSubCategory}
                onCategoryChange={(cat, sub) => { setFilterCategory(cat); setFilterSubCategory(sub); setPage(1); syncUrl({ page: 1, category: cat ?? null, subCategory: sub ?? null }); setSidebarOpen(false); }}
                onToggleExpand={(id) => setFilterExpanded((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; })}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm mb-4">
            <div className="flex flex-wrap gap-3 items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden inline-flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-700 text-sm hover:bg-gray-100 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Categorías
                {filterCategory && <span className="w-2 h-2 rounded-full bg-[#fa6e83]" />}
              </button>
              <div className="flex-1 min-w-[200px] relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); syncUrl({ search: e.target.value, page: 1 }); }}
                  placeholder="Buscar productos..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#fa6e83]/20 focus:border-[#fa6e83] transition-all"
                />
              </div>
              <select
                value={perPage}
                onChange={(e) => { setPerPage(parseInt(e.target.value, 10)); resetPage(); }}
                className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#fa6e83]/20 focus:border-[#fa6e83] transition-all cursor-pointer"
              >
                <option value={25}>25 por página</option>
                <option value={50}>50 por página</option>
                <option value={100}>100 por página</option>
              </select>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Total:</span>
                <span className="font-semibold text-gray-900">{total} productos</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {loading && (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-[#fa6e83] border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!loading && items.length === 0 && (
              <div className="text-center py-16">
                <p className="text-gray-400 font-medium">No se encontraron productos</p>
                <p className="text-gray-300 text-sm mt-1">Intentá ajustar los filtros</p>
              </div>
            )}

            {!loading && items.length > 0 && (
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wide w-12"></th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wide">Producto</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wide hidden md:table-cell">Categoría</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wide">Precio</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wide hidden sm:table-cell">Stock / Aromas</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wide">Visible</th>
                    <th className="px-4 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((p) => {
                    const totalStock = p.variants.length > 0
                      ? p.variants.reduce((s, v) => s + v.stock, 0)
                      : p.stock;
                    const outOfStock = totalStock <= 0;
                    return (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 truncate max-w-[180px]">{p.name}</p>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-gray-600">{p.category}</span>
                          {p.subCategory && <span className="text-gray-400"> › {p.subCategory}</span>}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">${p.price.toLocaleString()}</td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          {p.variants.length > 0 ? (
                            <span className="text-xs bg-[#fa6e83]/10 text-[#fa6e83] font-medium px-2 py-1 rounded-full">
                              {p.variants.length} {p.category === "Accesorios" ? "colores" : "aromas"}
                            </span>
                          ) : (
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                              outOfStock ? "bg-red-50 text-red-400" : "bg-green-50 text-green-600"
                            }`}>
                              {outOfStock ? "Sin stock" : `Stock: ${p.stock}`}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleVisible(p.id, !p.visible)}
                            className={`w-10 h-5 rounded-full transition-colors relative ${p.visible ? "bg-[#fa6e83]" : "bg-gray-200"}`}
                          >
                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${p.visible ? "left-5" : "left-0.5"}`} />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/products/${p.id}`}
                            className="text-xs font-medium text-[#fa6e83] hover:text-[#e55a72] hover:underline transition-all"
                          >
                            Editar
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-2">
              <button
                onClick={() => changePage(page - 1)}
                disabled={page <= 1 || loading}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Anterior
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Página <span className="font-semibold text-gray-900">{page}</span> de <span className="font-semibold text-gray-900">{totalPages}</span>
              </span>
              <button
                onClick={() => changePage(page + 1)}
                disabled={page >= totalPages || loading}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
