"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";

export function Navbar() {
	const pathname = usePathname();
	const session = useSession();
	const user = (session.data?.user ?? {}) as {
		name?: string | null;
		email?: string | null;
		role?: string | null;
	};
	// Cerrado por defecto
	const [open, setOpen] = useState(false);

	// Cerrar automáticamente al cambiar de ruta
	useEffect(() => {
		if (open) setOpen(false);
	}, [pathname]);

	return (
		<header className="sticky top-0 z-40 bg-gradient-to-r from-[color:var(--brand)] via-[color:var(--info)] to-[color:var(--warning)] text-white shadow-md">
			<div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
				<button
					className="p-2 rounded border border-white/30 inline-flex items-center justify-center hover:bg-white/10"
					onClick={() => setOpen((v) => !v)}
					aria-label={open ? "Cerrar menú" : "Abrir menú"}
					aria-controls="app-sidebar"
					aria-expanded={open}
				>
					<span className="relative block w-6 h-4 text-white">
						<span
							className={`absolute left-0 top-0 h-0.5 w-6 bg-current transition-transform duration-300 ${
								open ? "translate-y-1.5 rotate-45" : ""
							}`}
						/>
						<span
							className={`absolute left-0 top-1/2 h-0.5 w-6 bg-current -translate-y-1/2 transition-opacity duration-300 ${
								open ? "opacity-0" : "opacity-100"
							}`}
						/>
						<span
							className={`absolute left-0 bottom-0 h-0.5 w-6 bg-current transition-transform duration-300 ${
								open ? "-translate-y-1.5 -rotate-45" : ""
							}`}
						/>
					</span>
				</button>
				<Link
					href="/dashboard"
					className="font-semibold tracking-tight text-white"
				>
					Mantenimiento SR
				</Link>
				<div className="ml-auto flex items-center gap-3 text-sm">
					{session.status === "authenticated" ? (
						<>
							{user.name ? (
								<span className="hidden sm:inline text-white/90">
									{user.name}
								</span>
							) : null}
							<Link href="/perfil" className="btn btn-ghost">
								Perfil
							</Link>
						</>
					) : (
						<Link href="/signin" className="btn btn-primary">
							Ingresar
						</Link>
					)}
				</div>
			</div>
			<Sidebar open={open} onClose={() => setOpen(false)} />
		</header>
	);
}
