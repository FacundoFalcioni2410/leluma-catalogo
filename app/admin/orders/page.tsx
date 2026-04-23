/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type OrderStatus = "PENDING" | "CONFIRMED" | "REJECTED";

type OrderItem = {
  id?: string;
  productId: string;
  productName: string;
  variantId: string | null;
  variantName: string | null;
  price: number;
  quantity: number;
};

type Order = {
  id: string;
  customerName: string;
  status: OrderStatus;
  total: number;
  notes: string | null;
  items: OrderItem[];
  createdAt: string;
};

type ProductVariant = { id: string; option: string; price: number | null; stock: number };
type ProductResult = { id: string; name: string; price: number; variants: ProductVariant[] };

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  REJECTED: "Rechazado",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedItems, setEditedItems] = useState<OrderItem[]>([]);
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<ProductResult[]>([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [pickingVariant, setPickingVariant] = useState<ProductResult | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const url = new URL("/api/admin/orders", window.location.origin);
    if (statusFilter) url.searchParams.set("status", statusFilter);
    const res = await fetch(url.toString());
    if (res.ok) {
      const data = await res.json();
      setOrders(data.items);
      setTotal(data.total);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [statusFilter]);

  const selectOrder = (order: Order) => {
    setSelectedOrder(order);
    setEditMode(false);
    setEditedItems([]);
    setEditNotes(order.notes ?? "");
  };

  const startEdit = () => {
    if (!selectedOrder) return;
    setEditedItems(selectedOrder.items.map((i) => ({ ...i })));
    setEditNotes(selectedOrder.notes ?? "");
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditedItems([]);
  };

  const updateItemQty = (idx: number, delta: number) => {
    setEditedItems((prev) =>
      prev.map((item, i) => i === idx ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item)
    );
  };

  const removeItem = (idx: number) => {
    setEditedItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveOrder = async (overrides?: Partial<{ status: OrderStatus; items: OrderItem[]; notes: string }>) => {
    if (!selectedOrder) return;
    setSaving(true);
    const body: Record<string, unknown> = {};
    if (overrides?.status !== undefined) body.status = overrides.status;
    if (overrides?.items !== undefined) {
      body.items = overrides.items;
      body.notes = overrides.notes ?? editNotes;
    } else if (overrides?.notes !== undefined) {
      body.notes = overrides.notes;
    }

    const res = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const updated: Order = await res.json();
      setOrders((prev) => prev.map((o) => o.id === updated.id ? updated : o));
      setSelectedOrder(updated);
      setEditMode(false);
      setEditedItems([]);
    }
    setSaving(false);
  };

  const changeStatus = (status: OrderStatus) => saveOrder({ status });

  const searchProducts = useCallback(async (q: string) => {
    if (!q.trim()) { setProductResults([]); return; }
    setProductSearchLoading(true);
    const url = new URL("/api/admin/products", window.location.origin);
    url.searchParams.set("search", q);
    url.searchParams.set("perPage", "10");
    const res = await fetch(url.toString());
    if (res.ok) {
      const data = await res.json();
      setProductResults(data.items ?? []);
    }
    setProductSearchLoading(false);
  }, []);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchProducts(productSearch), 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [productSearch, searchProducts]);

  const addProductToOrder = (product: ProductResult, variant: ProductVariant | null) => {
    const price = variant?.price ?? product.price;
    const existing = editedItems.findIndex(
      (i) => i.productId === product.id && i.variantId === (variant?.id ?? null)
    );
    if (existing >= 0) {
      setEditedItems((prev) =>
        prev.map((item, i) => i === existing ? { ...item, quantity: item.quantity + 1 } : item)
      );
    } else {
      setEditedItems((prev) => [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          variantId: variant?.id ?? null,
          variantName: variant?.option ?? null,
          price,
          quantity: 1,
        },
      ]);
    }
    setPickingVariant(null);
    setShowAddProduct(false);
    setProductSearch("");
    setProductResults([]);
  };

  const closeAddProduct = () => {
    setShowAddProduct(false);
    setPickingVariant(null);
    setProductSearch("");
    setProductResults([]);
  };

  const editedTotal = editedItems.reduce((s, i) => s + i.price * i.quantity, 0);

  const statusTabs = [
    { value: "", label: "Todos" },
    { value: "PENDING", label: "Pendientes" },
    { value: "CONFIRMED", label: "Confirmados" },
    { value: "REJECTED", label: "Rechazados" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-[#fa6e83]">Pedidos ({total})</h1>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatusFilter(tab.value); setSelectedOrder(null); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === tab.value
                ? "bg-[#fa6e83] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Orders list */}
        <div className={`lg:w-96 shrink-0 ${selectedOrder ? "hidden lg:block" : "block"}`}>
          {loading ? (
            <div className="text-center py-12 text-gray-400">Cargando...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No hay pedidos</div>
          ) : (
            <div className="space-y-2">
              {orders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => selectOrder(order)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedOrder?.id === order.id
                      ? "border-[#fa6e83] bg-pink-50 shadow-sm"
                      : "border-gray-200 bg-white hover:border-[#fa6e83]/40 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-semibold text-black text-sm">{order.customerName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatDate(order.createdAt)}</span>
                    <span className="font-semibold text-black">${order.total.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {order.items.length} {order.items.length === 1 ? "producto" : "productos"}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Order detail */}
        {selectedOrder ? (
          <div className="flex-1 bg-white rounded-xl border border-gray-200 p-4 lg:p-6 flex flex-col gap-4">
            {/* Back button on mobile */}
            <button
              onClick={() => setSelectedOrder(null)}
              className="flex items-center gap-1 text-sm text-[#fa6e83] lg:hidden self-start"
            >
              ← Volver
            </button>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">{formatDate(selectedOrder.createdAt)}</p>
                <h2 className="text-lg font-semibold text-black">{selectedOrder.customerName}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[selectedOrder.status]}`}>
                  {STATUS_LABELS[selectedOrder.status]}
                </span>
              </div>
              {!editMode && (
                <div className="flex flex-wrap gap-2">
                  {selectedOrder.status === "PENDING" && (
                    <>
                      <button
                        onClick={() => changeStatus("CONFIRMED")}
                        disabled={saving}
                        className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 disabled:opacity-50"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => changeStatus("REJECTED")}
                        disabled={saving}
                        className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                    </>
                  )}
                  {selectedOrder.status !== "PENDING" && (
                    <button
                      onClick={() => changeStatus("PENDING")}
                      disabled={saving}
                      className="px-4 py-2 bg-yellow-500 text-white text-sm font-medium rounded-lg hover:bg-yellow-600 disabled:opacity-50"
                    >
                      Marcar pendiente
                    </button>
                  )}
                  <button
                    onClick={startEdit}
                    className="px-4 py-2 border border-gray-300 text-black text-sm font-medium rounded-lg hover:bg-gray-50"
                  >
                    Modificar
                  </button>
                </div>
              )}
            </div>

            {/* Items */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Productos</h3>
              <div className="space-y-2">
                {(editMode ? editedItems : selectedOrder.items).map((item, idx) => (
                  <div
                    key={`${item.productId}-${item.variantId}-${idx}`}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-black truncate">{item.productName}</p>
                      {item.variantName && (
                        <p className="text-xs text-[#fa6e83]">{item.variantName}</p>
                      )}
                      <p className="text-xs text-gray-500">${item.price.toFixed(2)} c/u</p>
                    </div>
                    {editMode ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => updateItemQty(idx, -1)}
                          className="w-7 h-7 rounded border border-gray-300 text-black font-bold flex items-center justify-center hover:bg-gray-100"
                        >
                          -
                        </button>
                        <span className="w-7 text-center text-sm font-medium text-black">{item.quantity}</span>
                        <button
                          onClick={() => updateItemQty(idx, 1)}
                          className="w-7 h-7 rounded border border-gray-300 text-black font-bold flex items-center justify-center hover:bg-gray-100"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeItem(idx)}
                          className="ml-1 w-7 h-7 rounded border border-red-200 text-red-500 flex items-center justify-center hover:bg-red-50 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-black">x{item.quantity}</p>
                        <p className="text-xs text-gray-500">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {editMode && (
                <button
                  onClick={() => setShowAddProduct(true)}
                  className="mt-3 w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-[#fa6e83] hover:text-[#fa6e83] transition-colors"
                >
                  + Agregar producto
                </button>
              )}
            </div>

            {/* Notes */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Notas</h3>
              {editMode ? (
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Agregar notas..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-[#fa6e83] resize-none"
                />
              ) : (
                <p className="text-sm text-gray-600">{selectedOrder.notes || "—"}</p>
              )}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <span className="font-semibold text-black">Total</span>
              <span className="text-xl font-bold text-black">
                ${(editMode ? editedTotal : selectedOrder.total).toFixed(2)}
              </span>
            </div>

            {/* Edit actions */}
            {editMode && (
              <div className="flex gap-3">
                <button
                  onClick={cancelEdit}
                  className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-black hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => saveOrder({ items: editedItems, notes: editNotes })}
                  disabled={saving || editedItems.length === 0}
                  className="flex-1 py-2.5 bg-[#fa6e83] text-white rounded-lg text-sm font-semibold hover:bg-[#e55a72] disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200 min-h-64">
            Seleccioná un pedido para ver el detalle
          </div>
        )}
      </div>

      {/* Add product modal */}
      {showAddProduct && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={closeAddProduct}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-black">
                  {pickingVariant ? `Seleccioná aroma — ${pickingVariant.name}` : "Agregar producto"}
                </h3>
                <button onClick={closeAddProduct} className="text-gray-400 hover:text-black text-lg">✕</button>
              </div>
              {!pickingVariant && (
                <input
                  autoFocus
                  type="text"
                  placeholder="Buscar producto..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-[#fa6e83]"
                />
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {pickingVariant ? (
                <div className="space-y-1">
                  {pickingVariant.variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => addProductToOrder(pickingVariant, v)}
                      disabled={v.stock === 0}
                      className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-pink-50 text-black disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {v.option}{v.stock === 0 && " (Agotado)"} — ${(v.price ?? pickingVariant.price).toFixed(2)}
                    </button>
                  ))}
                  <button
                    onClick={() => setPickingVariant(null)}
                    className="w-full text-center px-3 py-2 text-xs text-gray-400 hover:text-black"
                  >
                    ← Volver
                  </button>
                </div>
              ) : productSearchLoading ? (
                <div className="text-center py-8 text-gray-400 text-sm">Buscando...</div>
              ) : productResults.length === 0 && productSearch ? (
                <div className="text-center py-8 text-gray-400 text-sm">Sin resultados</div>
              ) : productResults.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Escribí para buscar un producto</div>
              ) : (
                <div className="space-y-1">
                  {productResults.map((product) => (
                    <button
                      key={product.id}
                      onClick={() =>
                        product.variants.length > 0
                          ? setPickingVariant(product)
                          : addProductToOrder(product, null)
                      }
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-pink-50 transition-colors"
                    >
                      <p className="text-sm font-medium text-black">{product.name}</p>
                      <p className="text-xs text-gray-500">
                        ${product.price.toFixed(2)}
                        {product.variants.length > 0 && ` · ${product.variants.length} aromas`}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
