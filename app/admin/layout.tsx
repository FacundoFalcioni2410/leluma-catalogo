import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AdminHeader from "./AdminHeader";

export const metadata: Metadata = {
  title: "Admin - Leluma",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}