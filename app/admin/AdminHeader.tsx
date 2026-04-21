"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";

export default function AdminHeader({ email }: { email?: string | null }) {
  return (
    <header className="bg-[#326b83] text-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/admin" className="text-xl font-semibold text-white">
          Admin Leluma
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/catalogo" className="text-sm text-white hover:text-[#fa6e83]">
            Ver catálogo
          </Link>
          <span className="text-sm text-black">{email}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm text-black hover:text-[#fa6e83]"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}