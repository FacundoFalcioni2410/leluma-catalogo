"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

export default function AdminHeader() {
  return (
    <header className="bg-[#fa6e83] text-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center gap-4">
        <Link href="/admin" className="flex items-center gap-2 shrink-0">
          <Image src="/logo.png" alt="Leluma" width={32} height={32} className="h-8 w-auto" />
          <span className="text-lg font-semibold text-white">Leluma</span>
        </Link>
        <div className="flex items-center gap-3 flex-wrap justify-end text-sm">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-white hover:text-white/70 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}
