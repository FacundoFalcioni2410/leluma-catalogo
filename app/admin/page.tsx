import Link from "next/link";

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Panel de Administración</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <Link
          href="/admin/productos"
          className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
        >
          <h2 className="text-lg font-medium text-[#8b5e3c]">Productos</h2>
          <p className="text-sm text-gray-500 mt-1">Gestionar productos del catálogo</p>
        </Link>

        <Link
          href="/admin/import"
          className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
        >
          <h2 className="text-lg font-medium text-[#8b5e3c]">Import CSV</h2>
          <p className="text-sm text-gray-500 mt-1">Import products from CSV file</p>
        </Link>

        {/* <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-medium text-[#8b5e3c]">Pedidos</h2>
          <p className="text-sm text-gray-500 mt-1">Ver pedidos recibidos (próximamente)</p>
        </div> */}
      </div>
    </div>
  );
}