/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Variant = { id?: string; name: string; option: string; price: number | null; stock: number };
type CategoryOption = { id: string; name: string; parentId: string | null };
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
  order: number;
  stock: number;
  variants: Variant[];
};

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form state
  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [order, setOrder] = useState(999999);
  const [stock, setStock] = useState(0);
  const [visible, setVisible] = useState(true);
  const [imageUrl, setImageUrl] = useState("");
  const [variants, setVariants] = useState<Variant[]>([]);

  const variantLabel = category === "Accesorios" ? "Color" : "Aroma";
  const variantLabelPlural = category === "Accesorios" ? "Colores" : "Aromas";

  const roots = categoryOptions.filter((c) => !c.parentId);
  const categoryNode = categoryOptions.find((c) => c.name === category);
  const subCategoryOptions = categoryNode ? categoryOptions.filter((c) => c.parentId === categoryNode.id) : [];

  // inline category creation
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [addingSub, setAddingSub] = useState(false);
  const [newSubName, setNewSubName] = useState("");

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
    if (res.ok) { await reloadCategories(); return true; }
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

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/products/${id}`).then((r) => r.json()),
      fetch("/api/admin/categories").then((r) => r.json()),
    ]).then(([p, cats]) => {
      setProduct(p);
      setName(p.name ?? "");
      setPrice(p.price ?? 0);
      setDescription(p.description ?? "");
      setCategory(p.category ?? "");
      setSubCategory(p.subCategory ?? "");
      setOrder(p.order ?? 999999);
      setStock(p.stock ?? 0);
      setVisible(p.visible ?? true);
      setImageUrl(p.imageUrl ?? "");
      setVariants(p.variants ?? []);
      setCategoryOptions(Array.isArray(cats) ? cats : []);
      setLoading(false);
    }).catch(() => { setError("Error al cargar el producto"); setLoading(false); });
  }, [id]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, price, description,
        category, subCategory: subCategory || null,
        order, stock: variants.length === 0 ? stock : undefined,
        visible, imageUrl: imageUrl || null, variants,
      }),
    });
    setSaving(false);
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    else setError("Error al guardar");
  };

  const handleDelete = async () => {
    setDeleting(true);
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) router.push("/admin/products");
    else setError("Error al eliminar");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !product) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("productId", product.id);
    const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
    if (res.ok) { const data = await res.json(); setImageUrl(data.url); }
    setUploading(false);
  };

  const updateVariant = (i: number, field: keyof Variant, value: string | number | null) =>
    setVariants((prev) => prev.map((v, idx) => idx === i ? { ...v, [field]: value } : v));
  const removeVariant = (i: number) => setVariants((prev) => prev.filter((_, idx) => idx !== i));
  const addVariant = () => setVariants((prev) => [...prev, { name: "Aroma", option: "", price: null, stock: 0 }]);

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#fa6e83]/20 focus:border-[#fa6e83] transition-all";
  const labelCls = "text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 block";

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-6 h-6 border-2 border-[#fa6e83] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !product) return (
    <div className="text-center py-24">
      <p className="text-red-500 mb-4">{error ?? "Producto no encontrado"}</p>
      <Link href="/admin/products" className="text-[#fa6e83] hover:underline text-sm">← Volver</Link>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold bg-gradient-to-r from-[#fa6e83] to-[#326b83] bg-clip-text text-transparent truncate">
            {product.name}
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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Image */}
        <label className="h-48 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center relative cursor-pointer group overflow-hidden block">
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
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium">+ Agregar imagen</span>
            </div>
          )}
          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </label>

        {/* Fields */}
        <div className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className={labelCls}>Nombre</label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del producto" />
          </div>

          {/* Price + Category */}
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
                <div className="flex gap-1 mt-1">
                  <input autoFocus value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddRootCat(); if (e.key === "Escape") { setAddingCat(false); setNewCatName(""); } }}
                    placeholder="Nueva categoría..." className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-[#fa6e83] placeholder:text-black" />
                  <button type="button" onClick={handleAddRootCat} className="text-[#fa6e83] hover:text-[#e55a72] px-2 text-xs font-medium">✓</button>
                  <button type="button" onClick={() => { setAddingCat(false); setNewCatName(""); }} className="text-gray-400 hover:text-gray-600 px-1 text-xs">✕</button>
                </div>
              )}
            </div>
          </div>

          {/* Subcategory */}
          {category && (
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
                <div className="flex gap-1 mt-1">
                  <input autoFocus value={newSubName} onChange={(e) => setNewSubName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddSub(); if (e.key === "Escape") { setAddingSub(false); setNewSubName(""); } }}
                    placeholder="Nueva subcategoría..." className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-[#fa6e83] placeholder:text-black" />
                  <button type="button" onClick={handleAddSub} className="text-[#fa6e83] hover:text-[#e55a72] px-2 text-xs font-medium">✓</button>
                  <button type="button" onClick={() => { setAddingSub(false); setNewSubName(""); }} className="text-gray-400 hover:text-gray-600 px-1 text-xs">✕</button>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <label className={labelCls}>Descripción</label>
            <textarea className={`${inputCls} resize-none`} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción del producto" />
          </div>

          {/* Order + Stock */}
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

          {/* Variants */}
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

        {/* Save */}
        <button
          onClick={save}
          disabled={saving}
          className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 z-50 ${
            saved
              ? "bg-green-500 text-white"
              : "bg-gradient-to-r from-[#fa6e83] to-[#fa6e83] text-white hover:from-[#e55a72] hover:to-[#e55a72]"
          }`}
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Delete */}
        <button
          onClick={() => setConfirmDelete(true)}
          className="fixed bottom-6 left-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center bg-white border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-500 hover:border-red-300 transition-all duration-200 z-50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar producto</h3>
            <p className="text-sm text-gray-500 mb-6">
              ¿Seguro que querés eliminar <span className="font-medium text-gray-900">{product?.name}</span>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {deleting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
