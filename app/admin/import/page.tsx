"use client";

import { useState } from "react";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; count?: number; error?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ error: "Error importing" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-black mb-6">Importar productos desde CSV</h1>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-[#326b83] max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Archivo CSV
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-black file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-[#fa6e83] file:text-white hover:file:bg-[#e55a72] cursor-pointer"
            />
          </div>

          <button
            type="submit"
            disabled={!file || loading}
            className="w-full bg-[#fa6e83] text-white py-2 px-4 rounded-md hover:bg-[#e55a72] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Importando..." : "Importar Productos"}
          </button>
        </form>

        {result && (
          <div className={`mt-6 p-4 rounded-md ${result.success ? "bg-green-100 text-black" : "bg-red-100 text-black"}`}>
            {result.success ? (
              <p>Se importaron {result.count} productos.</p>
            ) : (
              <p>{result.error}</p>
            )}
          </div>
        )}

        <div className="mt-8 text-sm text-black">
          <h3 className="font-medium text-black mb-2">Formato esperado del CSV:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Hash</strong> - Identificador único del producto</li>
            <li><strong>Nombre del producto</strong> - Nombre del producto</li>
            <li><strong>Precio</strong> - Precio regular</li>
            <li><strong>Oferta</strong> - Precio de oferta (opcional)</li>
            <li><strong>Descripción</strong> - Descripción</li>
            <li><strong>Categorías &gt; Subcategorías &gt; …</strong> - Ruta de categorías</li>
            <li><strong>Nombre de variante #1</strong> - Nombre de la variante</li>
            <li><strong>Opción de variante #1</strong> - Opción de la variante</li>
            <li><strong>Stock</strong> - Stock</li>
            <li><strong>Visibilidad</strong> - Visible/Oculto</li>
          </ul>
        </div>
      </div>
    </div>
  );
}