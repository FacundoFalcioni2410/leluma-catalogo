"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";

export default function AdminHeader({ email }: { email?: string | null }) {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/admin" className="text-xl font-semibold text-[#8b5e3c]">
          Admin Leluma
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{email}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm text-gray-600 hover:text-[#8b5e3c]"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}