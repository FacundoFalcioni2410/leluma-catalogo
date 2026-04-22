"use client";

import { useState } from "react";

type CategoryOption = { id: string; name: string; children?: { id: string; name: string }[] };

type Props = {
  categories: CategoryOption[];
  expandedCategories: Set<string>;
  selectedCategory?: string;
  selectedSubCategory?: string;
  onCategoryChange: (category: string | undefined, subCategory?: string) => void;
  onToggleExpand: (categoryId: string) => void;
  onAddCategory?: (name: string, parentId?: string) => Promise<void>;
  variant?: "catalogo" | "admin";
};

export default function CategoryFilter({
  categories,
  expandedCategories,
  selectedCategory,
  selectedSubCategory,
  onCategoryChange,
  onToggleExpand,
  onAddCategory,
  variant = "catalogo",
}: Props) {
  const isAdmin = variant === "admin";
  const [addingFor, setAddingFor] = useState<"root" | string | null>(null); // "root" or parentId
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async (parentId?: string) => {
    if (!inputValue.trim() || !onAddCategory) return;
    setSaving(true);
    await onAddCategory(inputValue.trim(), parentId);
    setSaving(false);
    setAddingFor(null);
    setInputValue("");
  };

  const openAdd = (key: "root" | string) => {
    setAddingFor(key);
    setInputValue("");
  };

  const cancelAdd = () => { setAddingFor(null); setInputValue(""); };

  const parentCls = isAdmin
    ? "px-3 py-1.5 text-sm font-medium transition-colors"
    : "w-full text-left px-3 py-2 rounded-lg transition-colors";

  const parentActiveCls = "bg-[#fa6e83] text-white";
  const parentInactiveCls = isAdmin
    ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
    : "hover:bg-gray-100 text-black";

  const childActiveCls = "bg-[#fa6e83] text-white";
  const childInactiveCls = isAdmin
    ? "bg-gray-50 text-gray-600 border border-gray-200 hover:border-[#fa6e83]/50 hover:text-[#fa6e83]"
    : "hover:bg-gray-200 text-black";

  const InlineInput = ({ onSave }: { onSave: () => void }) => (
    <div className="flex items-center gap-1 mt-1">
      <input
        autoFocus
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onSave(); if (e.key === "Escape") cancelAdd(); }}
        placeholder="Nombre..."
        className="flex-1 min-w-0 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-[#fa6e83]"
      />
      <button
        type="button"
        onClick={onSave}
        disabled={saving || !inputValue.trim()}
        className="text-[#fa6e83] hover:text-[#e55a72] disabled:opacity-40 p-0.5"
      >
        {saving ? <div className="w-3 h-3 border border-[#fa6e83] border-t-transparent rounded-full animate-spin" /> : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <button type="button" onClick={cancelAdd} className="text-gray-400 hover:text-gray-600 p-0.5">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );

  return (
    <div className={isAdmin ? "flex flex-wrap gap-1.5" : "space-y-2"}>
      <button
        type="button"
        onClick={() => onCategoryChange(undefined)}
        className={`${parentCls} ${isAdmin ? "rounded-lg" : ""} ${
          !selectedCategory ? parentActiveCls : parentInactiveCls
        }`}
      >
        Todas
      </button>
      {categories.map((cat) => {
        const hasChildren = cat.children && cat.children.length > 0;
        const isActive = selectedCategory === cat.name;
        const isExpanded = expandedCategories.has(cat.id);

        return (
          <div key={cat.id} className={isAdmin ? "flex items-center" : ""}>
            <button
              type="button"
              onClick={() => {
                onCategoryChange(cat.name);
                if (hasChildren && !isExpanded) onToggleExpand(cat.id);
              }}
              className={`${parentCls} ${isAdmin && hasChildren ? "rounded-l-lg" : isAdmin ? "rounded-lg" : ""} ${
                isActive ? parentActiveCls : parentInactiveCls
              } ${isAdmin ? "" : "flex justify-between items-center"}`}
            >
              {cat.name}
              {hasChildren && (
                <span
                  onClick={(e) => { e.stopPropagation(); onToggleExpand(cat.id); }}
                  className={`text-xs ${isAdmin ? "" : "text-gray-500 hover:text-[#fa6e83]"}`}
                >
                  {isExpanded ? "▾" : "▸"}
                </span>
              )}
            </button>
            {isAdmin && onAddCategory && (
              <button
                type="button"
                title="Agregar subcategoría"
                onClick={() => openAdd(cat.id)}
                className="px-2 py-1.5 bg-gray-100 text-gray-400 hover:text-[#fa6e83] hover:bg-gray-200 rounded-r-lg text-sm transition-colors border-l border-gray-200"
              >
                +
              </button>
            )}
            {hasChildren && isExpanded && (
              <div className={`${isAdmin ? "w-full mt-1 flex flex-wrap gap-1.5 pl-2" : "ml-4 mt-1 space-y-1"}`}>
                {cat.children!.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => onCategoryChange(cat.name, child.name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      selectedCategory === cat.name && selectedSubCategory === child.name
                        ? childActiveCls
                        : childInactiveCls
                    } ${isAdmin ? "" : "w-full text-left"}`}
                  >
                    {child.name}
                  </button>
                ))}
                {isAdmin && addingFor === cat.id && (
                  <div className="w-full">
                    <InlineInput onSave={() => handleAdd(cat.id)} />
                  </div>
                )}
              </div>
            )}
            {isAdmin && addingFor === cat.id && !isExpanded && (
              <div className="w-full mt-1 pl-2">
                <InlineInput onSave={() => handleAdd(cat.id)} />
              </div>
            )}
          </div>
        );
      })}

      {isAdmin && onAddCategory && (
        <div className="w-full mt-1">
          {addingFor === "root" ? (
            <InlineInput onSave={() => handleAdd(undefined)} />
          ) : (
            <button
              type="button"
              onClick={() => openAdd("root")}
              className="text-xs text-[#fa6e83] hover:text-[#e55a72] font-medium transition-colors"
            >
              + Nueva categoría
            </button>
          )}
        </div>
      )}
    </div>
  );
}
