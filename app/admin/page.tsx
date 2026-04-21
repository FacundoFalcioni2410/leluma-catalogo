import Link from "next/link";

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-[#f5f5f5] p-6">
      <h1 className="text-2xl font-semibold text-[#326b83] mb-6">Panel de Administración</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <Link
          href="/admin/products"
          className="bg-white p-6 rounded-lg shadow-md border border-[#326b83] hover:shadow-lg transition-shadow"
        >
          <h2 className="text-lg font-medium text-[#326b83]">Productos</h2>
          <p className="text-sm text-black mt-1">Gestionar productos del catálogo</p>
        </Link>

        <Link
          href="/admin/import"
          className="bg-white p-6 rounded-lg shadow-md border border-[#326b83] hover:shadow-lg transition-shadow"
        >
          <h2 className="text-lg font-medium text-[#326b83]">Importar CSV</h2>
          <p className="text-sm text-black mt-1">Importar productos desde CSV</p>
        </Link>

        <Link
          href="/catalogo"
          className="bg-white p-6 rounded-lg shadow-md border border-[#fa6e83] hover:shadow-lg transition-shadow"
        >
          <h2 className="text-lg font-medium text-[#fa6e83]">Ver Catálogo</h2>
          <p className="text-sm text-black mt-1">Ver el catálogo público</p>
        </Link>
      </div>
    </div>
  );
}