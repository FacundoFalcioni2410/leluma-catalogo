"use client";

import { useState } from "react";

const ERROR_MESSAGES: Record<string, string> = {
  "Too many requests": "Demasiados intentos. Esperá un momento e intentá de nuevo.",
  "No file provided": "No se seleccionó ningún archivo.",
  "Failed to parse CSV": "El archivo no es un CSV válido. Revisá el formato.",
  "Failed to import": "Ocurrió un error al importar. Revisá el archivo e intentá de nuevo.",
  "Unauthorized": "No tenés permiso para realizar esta acción.",
};

function friendlyError(error?: string): string {
  if (!error) return "Ocurrió un error inesperado.";
  return ERROR_MESSAGES[error] ?? error;
}

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
      setResult({ error: "No se pudo conectar con el servidor. Intentá de nuevo." });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    window.location.href = "/api/admin/products/export";
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-[#fa6e83]">Importar / Exportar productos</h1>
        <button
          onClick={handleExport}
          className="bg-[#fa6e83] text-white py-2 px-4 rounded-md hover:bg-[#e55a72] transition-colors text-sm"
        >
          Exportar CSV
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-black mb-2">Archivo CSV</label>
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
            className="w-full bg-[#fa6e83] text-white py-2.5 px-4 rounded-md hover:bg-[#e55a72] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {loading ? "Importando..." : "Importar Productos"}
          </button>
        </form>

        {result && (
          <div
            className={`mt-4 p-3 rounded-md text-sm ${
              result.success ? "bg-green-100 text-black" : "bg-red-100 text-black"
            }`}
          >
            {result.success ? (
              <p>Se importaron / actualizaron {result.count} productos correctamente.</p>
            ) : (
              <p>{friendlyError(result.error)}</p>
            )}
          </div>
        )}

        <div className="mt-6 text-xs text-black">
          <h3 className="font-medium text-black mb-2">Comportamiento al importar:</h3>
          <ul className="list-disc list-inside space-y-1 mb-4">
            <li>Si la fila tiene <strong>id</strong>, actualiza ese producto existente.</li>
            <li>Si no tiene <strong>id</strong>, busca por <strong>Hash</strong> y actualiza, o crea uno nuevo.</li>
            <li>Los productos no incluidos en el CSV no se borran.</li>
          </ul>
          <h3 className="font-medium text-black mb-2">Columnas del CSV:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>id</strong> — ID del producto (del exportado)</li>
            <li><strong>Hash</strong> — Identificador único alternativo</li>
            <li><strong>Nombre del producto</strong></li>
            <li><strong>Precio</strong></li>
            <li><strong>Oferta</strong> (opcional)</li>
            <li><strong>Descripción</strong></li>
            <li><strong>Categorías &gt; Subcategorías</strong></li>
            <li><strong>Nombre de variante #1</strong></li>
            <li><strong>Opción de variante #1</strong></li>
            <li><strong>Stock</strong></li>
            <li><strong>Visibilidad (Visible o Oculto)</strong></li>
          </ul>
        </div>
      </div>
    </>
  );
}
