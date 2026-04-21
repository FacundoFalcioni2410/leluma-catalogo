/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";

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
  const [newName, setNewName] = useState("");
  const [newParentId, setNewParentId] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editParentId, setEditParentId] = useState("");

  const roots = categories.filter((c) => !c.parentId);
  const children = (parentId: string) => categories.filter((c) => c.parentId === parentId);

  const load = async () => {
    const res = await fetch("/api/admin/categories");
    setCategories(await res.json());
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), parentId: newParentId || null }),
      });
      if (!res.ok) {
        console.error("Failed to create category:", await res.text());
      } else {
        setNewName("");
        setNewParentId("");
      }
    } catch (err) {
      console.error("Error creating category:", err);
    } finally {
      await load();
      setLoading(false);
    }
  };

  const startEdit = (c: Category) => {
    setEditId(c.id);
    setEditName(c.name);
    setEditParentId(c.parentId ?? "");
  };

  const saveEdit = async () => {
    if (!editId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/categories/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), parentId: editParentId || null }),
      });
      if (!res.ok) {
        console.error("Failed to update category:", await res.text());
      } else {
        setEditId(null);
      }
    } catch (err) {
      console.error("Error updating category:", err);
    } finally {
      await load();
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar esta categoría?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      if (!res.ok) {
        console.error("Failed to delete category:", await res.text());
      }
    } catch (err) {
      console.error("Error deleting category:", err);
    } finally {
      await load();
      setLoading(false);
    }
  };

  const parentOptions = categories.filter((c) => !c.parentId);

  return (
    <>
      <h1 className="text-xl font-semibold text-[#fa6e83] mb-4">Categorías</h1>

      {/* Create */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 flex flex-wrap gap-2 items-end max-w-lg">
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs text-black mb-1 block">Nombre</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            placeholder="Nueva categoría..."
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white text-black"
          />
        </div>
        <div className="min-w-[120px]">
          <label className="text-xs text-black mb-1 block">Padre (opcional)</label>
          <select
            value={newParentId}
            onChange={(e) => setNewParentId(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white text-black"
          >
            <option value="">— Ninguno —</option>
            {parentOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={create}
          disabled={loading || !newName.trim()}
          className="bg-[#fa6e83] text-white px-4 py-1.5 rounded text-sm hover:bg-[#e55a72] disabled:opacity-50"
        >
          Agregar
        </button>
      </div>

      {/* Tree */}
      <div className="space-y-3 max-w-lg">
        {roots.map((root) => (
          <div key={root.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <CategoryRow
              cat={root}
              editId={editId}
              editName={editName}
              editParentId={editParentId}
              parentOptions={parentOptions}
              onEdit={startEdit}
              onSave={saveEdit}
              onCancel={() => setEditId(null)}
              onDelete={remove}
              onEditName={setEditName}
              onEditParent={setEditParentId}
              loading={loading}
            />
            {children(root.id).map((child) => (
              <div key={child.id} className="border-t border-gray-100 pl-6">
                <CategoryRow
                  cat={child}
                  editId={editId}
                  editName={editName}
                  editParentId={editParentId}
                  parentOptions={parentOptions}
                  onEdit={startEdit}
                  onSave={saveEdit}
                  onCancel={() => setEditId(null)}
                  onDelete={remove}
                  onEditName={setEditName}
                  onEditParent={setEditParentId}
                  loading={loading}
                  isChild
                />
              </div>
            ))}
          </div>
        ))}
        {categories.length === 0 && (
          <p className="text-sm text-gray-400">No hay categorías todavía.</p>
        )}
      </div>
    </>
  );
}

function CategoryRow({
  cat, editId, editName, editParentId, parentOptions,
  onEdit, onSave, onCancel, onDelete, onEditName, onEditParent, loading, isChild,
}: {
  cat: Category;
  editId: string | null;
  editName: string;
  editParentId: string;
  parentOptions: Category[];
  onEdit: (c: Category) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
  onEditName: (v: string) => void;
  onEditParent: (v: string) => void;
  loading: boolean;
  isChild?: boolean;
}) {
  const isEditing = editId === cat.id;

  return (
    <div className="flex items-center gap-2 px-4 py-2.5">
      {isChild && <span className="text-gray-300 text-xs mr-1">└</span>}
      {isEditing ? (
        <>
          <input
            value={editName}
            onChange={(e) => onEditName(e.target.value)}
            className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm bg-white text-black"
            autoFocus
          />
          {!isChild && (
            <select
              value={editParentId}
              onChange={(e) => onEditParent(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm bg-white text-black"
            >
              <option value="">— Raíz —</option>
              {parentOptions.filter((p) => p.id !== cat.id).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          <button onClick={onSave} disabled={loading} className="text-xs text-[#fa6e83] hover:underline">Guardar</button>
          <button onClick={onCancel} className="text-xs text-gray-400 hover:underline">Cancelar</button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm text-black">{cat.name}</span>
          <button onClick={() => onEdit(cat)} className="text-xs text-gray-400 hover:text-[#fa6e83]">Editar</button>
          <button onClick={() => onDelete(cat.id)} className="text-xs text-red-400 hover:text-red-600">Eliminar</button>
        </>
      )}
    </div>
  );
}
