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
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Import Products from CSV</h1>

      <div className="bg-white p-6 rounded-lg shadow-sm border max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-medium
                file:bg-[#8b5e3c] file:text-white
                hover:file:bg-[#6d4a2f]
                cursor-pointer"
            />
          </div>

          <button
            type="submit"
            disabled={!file || loading}
            className="w-full bg-[#8b5e3c] text-white py-2 px-4 rounded-md hover:bg-[#6d4a2f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Importing..." : "Import Products"}
          </button>
        </form>

        {result && (
          <div
            className={`mt-6 p-4 rounded-md ${
              result.success
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            {result.success ? (
              <p>Successfully imported {result.count} products.</p>
            ) : (
              <p>{result.error}</p>
            )}
          </div>
        )}

        <div className="mt-8 text-sm text-gray-600">
          <h3 className="font-medium text-gray-900 mb-2">Expected CSV format:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Hash</strong> - Unique product identifier</li>
            <li><strong>Nombre del producto</strong> - Product name</li>
            <li><strong>Precio</strong> - Regular price</li>
            <li><strong>Oferta</strong> - Offer price (optional)</li>
            <li><strong>Descripción</strong> - Description</li>
            <li><strong>Categorías &gt; Subcategorías &gt; …</strong> - Category path (e.g., &quot;Velas &gt; Aromáticas&quot;)</li>
            <li><strong>Nombre de variante #1</strong> - Variant name (e.g., &quot;Tamaño&quot;)</li>
            <li><strong>Opción de variante #1</strong> - Variant option (e.g., &quot;S&quot;, &quot;M&quot;, &quot;L&quot;)</li>
            <li><strong>Stock</strong> - Stock quantity</li>
            <li><strong>Visibilidad (Visible o Oculto)</strong> - Visibility status</li>
          </ul>
        </div>
      </div>
    </div>
  );
}