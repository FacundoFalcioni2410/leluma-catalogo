/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Variant = { name: string; option: string; price: number | null; stock: number };
type CategoryOption = { id: string; name: string; parentId: string | null };

export default function NewProductPage() {
  const router = useRouter();

  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [order, setOrder] = useState(999999);
  const [stock, setStock] = useState(0);
  const [visible, setVisible] = useState(true);
  const [variants, setVariants] = useState<Variant[]>([]);

  // inline category creation state
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [addingSub, setAddingSub] = useState(false);
  const [newSubName, setNewSubName] = useState("");

  const variantLabel = category === "Accesorios" ? "Color" : "Aroma";
  const variantLabelPlural = category === "Accesorios" ? "Colores" : "Aromas";

  const roots = categoryOptions.filter((c) => !c.parentId);
  const categoryNode = categoryOptions.find((c) => c.name === category);
  const subCategoryOptions = categoryNode ? categoryOptions.filter((c) => c.parentId === categoryNode.id) : [];

  useEffect(() => {
    fetch("/api/admin/categories").then((r) => r.json()).then((cats) => {
      setCategoryOptions(Array.isArray(cats) ? cats : []);
    });
  }, []);

  const reloadCategories = () =>
    fetch("/api/admin/categories").then((r) => r.json()).then((cats) => {
      setCategoryOptions(Array.isArray(cats) ? cats : []);
    });

  const createCategory = async (catName: string, parentId?: string) => {
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: catName.trim(), parentId: parentId ?? null }),
    });
    if (res.ok) {
      await reloadCategories();
      return true;
    }
    return false;
  };

  const handleAddRootCat = async () => {
    if (!newCatName.trim()) return;
    if (await createCategory(newCatName)) {
      setCategory(newCatName.trim());
      setSubCategory("");
      setAddingCat(false);
      setNewCatName("");
    }
  };

  const handleAddSub = async () => {
    if (!newSubName.trim() || !categoryNode) return;
    if (await createCategory(newSubName, categoryNode.id)) {
      setSubCategory(newSubName.trim());
      setAddingSub(false);
      setNewSubName("");
    }
  };

  const save = async () => {
    if (!name.trim() || !category) { setError("Nombre y categoría son requeridos"); return; }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, price, description,
        category, subCategory: subCategory || null,
        order, stock: variants.length === 0 ? stock : 0,
        visible, variants,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      router.push(`/admin/products/${data.id}`);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al crear producto");
    }
  };

  const updateVariant = (i: number, field: keyof Variant, value: string | number | null) =>
    setVariants((prev) => prev.map((v, idx) => idx === i ? { ...v, [field]: value } : v));
  const removeVariant = (i: number) => setVariants((prev) => prev.filter((_, idx) => idx !== i));
  const addVariant = () => setVariants((prev) => [...prev, { name: "Aroma", option: "", price: null, stock: 0 }]);

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#fa6e83]/20 focus:border-[#fa6e83] transition-all";
  const labelCls = "text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 block";

  const InlineInput = ({ value, onChange, onSave, onCancel, placeholder }: {
    value: string; onChange: (v: string) => void;
    onSave: () => void; onCancel: () => void; placeholder?: string;
  }) => (
    <div className="flex gap-1 mt-1">
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onSave(); if (e.key === "Escape") onCancel(); }}
        placeholder={placeholder ?? "Nombre..."}
        className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-[#fa6e83] placeholder:text-black"
      />
      <button type="button" onClick={onSave} className="text-[#fa6e83] hover:text-[#e55a72] px-2 text-xs font-medium">✓</button>
      <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 px-1 text-xs">✕</button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold bg-gradient-to-r from-[#fa6e83] to-[#326b83] bg-clip-text text-transparent">
            Nuevo producto
          </h1>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)}
            className="w-4 h-4 text-[#fa6e83] rounded border-gray-300 focus:ring-[#fa6e83]" />
          <span className={`text-sm font-medium ${visible ? "text-green-600" : "text-gray-400"}`}>
            {visible ? "Visible" : "Oculto"}
          </span>
        </label>
      </div>

      {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-4 py-2">{error}</p>}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Nombre</label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del producto" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Precio</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input className={`${inputCls} pl-7`} type="number" value={price} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Categoría</label>
              <div className="flex gap-1">
                <select className={`${inputCls} appearance-none cursor-pointer flex-1`} value={category} onChange={(e) => { setCategory(e.target.value); setSubCategory(""); }}>
                  <option value="">Seleccionar</option>
                  {roots.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <button type="button" title="Nueva categoría" onClick={() => { setAddingCat(true); setAddingSub(false); }}
                  className="px-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-400 hover:text-[#fa6e83] hover:border-[#fa6e83] transition-all text-lg leading-none">
                  +
                </button>
              </div>
              {addingCat && (
                <InlineInput value={newCatName} onChange={setNewCatName}
                  onSave={handleAddRootCat} onCancel={() => { setAddingCat(false); setNewCatName(""); }}
                  placeholder="Nueva categoría..." />
              )}
            </div>
          </div>

          {(subCategoryOptions.length > 0 || (category && !addingCat)) && category && (
            <div>
              <label className={labelCls}>Subcategoría</label>
              <div className="flex gap-1">
                <select className={`${inputCls} appearance-none cursor-pointer flex-1`} value={subCategory} onChange={(e) => setSubCategory(e.target.value)}>
                  <option value="">Ninguna</option>
                  {subCategoryOptions.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <button type="button" title="Nueva subcategoría" onClick={() => { setAddingSub(true); setAddingCat(false); }}
                  className="px-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-400 hover:text-[#fa6e83] hover:border-[#fa6e83] transition-all text-lg leading-none">
                  +
                </button>
              </div>
              {addingSub && (
                <InlineInput value={newSubName} onChange={setNewSubName}
                  onSave={handleAddSub} onCancel={() => { setAddingSub(false); setNewSubName(""); }}
                  placeholder="Nueva subcategoría..." />
              )}
            </div>
          )}

          <div>
            <label className={labelCls}>Descripción</label>
            <textarea className={`${inputCls} resize-none`} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción del producto" />
          </div>

          <div className={`grid gap-4 ${variants.length === 0 ? "grid-cols-2" : "grid-cols-1"}`}>
            <div>
              <label className={labelCls}>Orden</label>
              <input className={inputCls} type="number" value={order} onChange={(e) => setOrder(parseInt(e.target.value) || 0)} />
              <p className="text-xs text-gray-400 mt-1">Menor número = aparece primero</p>
            </div>
            {variants.length === 0 && (
              <div>
                <label className={labelCls}>Stock</label>
                <input className={inputCls} type="number" min={0} value={stock} onChange={(e) => setStock(parseInt(e.target.value) || 0)} />
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">
                {variantLabelPlural}
                {variants.length > 0 && (
                  <span className="ml-2 bg-[#fa6e83] text-white rounded-full px-2 py-0.5 text-xs">{variants.length}</span>
                )}
              </h3>
              <button type="button" onClick={addVariant} className="text-xs font-medium text-[#fa6e83] hover:text-[#e55a72] hover:underline transition-all">
                + Agregar
              </button>
            </div>
            <div className="space-y-2">
              {variants.length === 0 && (
                <p className="text-xs text-gray-400 italic text-center py-3">Sin {variantLabelPlural.toLowerCase()} configurados</p>
              )}
              {variants.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    placeholder={`Nombre del ${variantLabel.toLowerCase()}`}
                    value={v.option}
                    onChange={(e) => updateVariant(i, "option", e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#fa6e83]/20 focus:border-[#fa6e83] transition-all"
                  />
                  <input
                    type="number" placeholder="Stock" value={v.stock}
                    onChange={(e) => updateVariant(i, "stock", parseInt(e.target.value) || 0)}
                    className="w-20 border border-gray-200 rounded-lg px-2 py-2 bg-white text-gray-900 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#fa6e83]/20 focus:border-[#fa6e83] transition-all"
                  />
                  <button type="button" onClick={() => removeVariant(i)} className="text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg p-2 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={save}
            disabled={saving}
            className="w-full py-3 rounded-lg font-medium text-sm transition-all duration-200 shadow-sm bg-gradient-to-r from-[#fa6e83] to-[#fa6e83]/90 text-white hover:from-[#e55a72] hover:to-[#e55a72]/90 disabled:opacity-50"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creando...
              </span>
            ) : "Crear producto"}
          </button>
        </div>
      </div>
    </div>
  );
}
