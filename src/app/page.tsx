import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">Mantenimiento SR</h1>
      <p className="text-[color:var(--muted)] mb-6">Inicia sesión para continuar. Elige a qué sistema quieres entrar:</p>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Link href="/signin?tenant=mantenimiento-sr" className="btn btn-primary">Entrar a Mantenimiento SR</Link>
        <Link href="/signin?tenant=jeg" className="btn btn-secondary">Entrar a JEG</Link>
      </div>

      <p className="text-sm text-[color:var(--muted)]">Sesión actual: {session?.user?.email ?? 'No autenticado'}</p>
    </main>
  );
}
