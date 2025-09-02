import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  if (session) redirect("/dashboard");
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">Mantenimiento SR</h1>
      <p className="text-[color:var(--muted)] mb-6">Inicia sesión para continuar.</p>
      <Link href="/signin" className="btn btn-primary">Ingresar</Link>
    </main>
  );
}
