"use client";

import { useEffect, useState, useRef } from "react";

type Category = {
  id: string;
  name: string;
  parentId: string | null;
  parent: { id: string; name: string } | null;
  children: { id: string; name: string }[];
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  // new root
  const [newRoot, setNewRoot] = useState("");

  // new sub: keyed by parentId
  const [newSub, setNewSub] = useState<Record<string, string>>({});

  // inline edit
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // confirm delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const roots = categories.filter((c) => !c.parentId);
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);

  const load = async () => {
    const res = await fetch("/api/admin/categories");
    if (res.ok) setCategories(await res.json());
  };

  useEffect(() => { load(); }, []);

  const createRoot = async () => {
    if (!newRoot.trim()) return;
    setLoading(true);
    await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newRoot.trim(), parentId: null }),
    });
    setNewRoot("");
    await load();
    setLoading(false);
  };

  const createSub = async (parentId: string) => {
    const name = newSub[parentId]?.trim();
    if (!name) return;
    setLoading(true);
    await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parentId }),
    });
    setNewSub((prev) => ({ ...prev, [parentId]: "" }));
    await load();
    setLoading(false);
  };

  const saveEdit = async () => {
    if (!editId || !editName.trim()) return;
    setLoading(true);
    await fetch(`/api/admin/categories/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setEditId(null);
    await load();
    setLoading(false);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setLoading(true);
    await fetch(`/api/admin/categories/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    await load();
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[#fa6e83] to-[#326b83] bg-clip-text text-transparent">
          Categorías
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Organizá las categorías y subcategorías del catálogo</p>
      </div>

      {/* Add root category */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm max-w-md">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Nueva categoría principal</p>
        <div className="flex gap-2">
          <input
            value={newRoot}
            onChange={(e) => setNewRoot(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createRoot()}
            placeholder="Ej: Sahumerios"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#fa6e83]/20 focus:border-[#fa6e83] transition-all"
          />
          <button
            onClick={createRoot}
            disabled={loading || !newRoot.trim()}
            className="bg-gradient-to-r from-[#fa6e83] to-[#fa6e83]/90 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-[#e55a72] hover:to-[#e55a72]/90 disabled:opacity-50 transition-all"
          >
            Agregar
          </button>
        </div>
      </div>

      {/* Category tree */}
      <div className="space-y-4 max-w-2xl">
        {roots.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-400 text-sm">No hay categorías todavía.</p>
          </div>
        )}

        {roots.map((root) => {
          const subs = childrenOf(root.id);
          return (
            <div key={root.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Root row */}
              <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#fa6e83]/5 to-[#326b83]/5 border-b border-gray-100">
                <span className="w-2 h-2 rounded-full bg-[#fa6e83] shrink-0" />
                {editId === root.id ? (
                  <EditInput
                    value={editName}
                    onChange={setEditName}
                    onSave={saveEdit}
                    onCancel={() => setEditId(null)}
                    loading={loading}
                  />
                ) : (
                  <>
                    <span className="flex-1 font-semibold text-gray-800 text-sm">{root.name}</span>
                    <ActionButtons
                      onEdit={() => { setEditId(root.id); setEditName(root.name); }}
                      onDelete={() => setDeleteId(root.id)}
                    />
                  </>
                )}
              </div>

              {/* Children */}
              {subs.map((child) => (
                <div key={child.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 pl-8">
                  <span className="text-gray-300 text-xs shrink-0">└</span>
                  {editId === child.id ? (
                    <EditInput
                      value={editName}
                      onChange={setEditName}
                      onSave={saveEdit}
                      onCancel={() => setEditId(null)}
                      loading={loading}
                    />
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-gray-700">{child.name}</span>
                      <ActionButtons
                        onEdit={() => { setEditId(child.id); setEditName(child.name); }}
                        onDelete={() => setDeleteId(child.id)}
                      />
                    </>
                  )}
                </div>
              ))}

              {/* Add subcategory */}
              <div className="flex items-center gap-2 px-4 py-2.5 pl-8 bg-gray-50/50">
                <span className="text-gray-200 text-xs shrink-0">└</span>
                <input
                  value={newSub[root.id] ?? ""}
                  onChange={(e) => setNewSub((prev) => ({ ...prev, [root.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && createSub(root.id)}
                  placeholder="+ Nueva subcategoría..."
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#fa6e83]/20 focus:border-[#fa6e83] transition-all"
                />
                <button
                  onClick={() => createSub(root.id)}
                  disabled={loading || !newSub[root.id]?.trim()}
                  className="text-xs font-medium text-[#fa6e83] hover:text-[#e55a72] disabled:opacity-40 hover:underline transition-all"
                >
                  Agregar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h2 className="font-semibold text-gray-800 mb-2">¿Eliminar categoría?</h2>
            <p className="text-sm text-gray-500 mb-5">
              Las subcategorías (si las hay) se moverán al nivel superior. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-all"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditInput({ value, onChange, onSave, onCancel, loading }: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  return (
    <>
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onSave(); if (e.key === "Escape") onCancel(); }}
        className="flex-1 border border-[#fa6e83] rounded-lg px-3 py-1 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#fa6e83]/20 transition-all"
      />
      <button onClick={onSave} disabled={loading || !value.trim()} className="text-xs font-medium text-[#fa6e83] hover:underline disabled:opacity-40">
        Guardar
      </button>
      <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600 hover:underline">
        Cancelar
      </button>
    </>
  );
}

function ActionButtons({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-3 shrink-0">
      <button
        onClick={onEdit}
        className="text-xs text-gray-400 hover:text-[#fa6e83] transition-colors"
      >
        Editar
      </button>
      <button
        onClick={onDelete}
        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
      >
        Eliminar
      </button>
    </div>
  );
}
