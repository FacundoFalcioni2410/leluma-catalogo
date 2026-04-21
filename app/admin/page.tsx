import Link from "next/link";

export default function AdminDashboard() {
  return (
    <>
      <h1 className="text-xl font-semibold text-[#fa6e83] mb-4">Panel de Administración</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/admin/products"
          className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <h2 className="font-medium text-[#fa6e83]">Productos</h2>
          <p className="text-sm text-gray-600 mt-1">Gestionar productos del catálogo</p>
        </Link>

        <Link
          href="/admin/import"
          className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <h2 className="font-medium text-[#fa6e83]">Importar CSV</h2>
          <p className="text-sm text-gray-600 mt-1">Importar productos desde CSV</p>
        </Link>

        <Link
          href="/catalogo"
          className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <h2 className="font-medium text-[#fa6e83]">Ver Catálogo</h2>
          <p className="text-sm text-gray-600 mt-1">Ver el catálogo público</p>
        </Link>
      </div>
    </>
  );
}