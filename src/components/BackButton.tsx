"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function BackButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      // Hide on specific top-level routes where back should not appear
      const excluded = ["/", "/signin", "/register", "/forgot-password", "/reset-password"];
      const isExcluded = !!pathname && (excluded.includes(pathname) || pathname.startsWith("/dashboard") || pathname.startsWith("/api/auth"));
      if (isExcluded) {
        setShow(false);
        return;
      }
      // show if there's history to go back or path is not root
      const hasHistory = typeof window !== "undefined" && window.history.length > 1;
      const notRoot = !!pathname && pathname !== "/";
      setShow(hasHistory || notRoot);
    } catch (e) {
      setShow(false);
    }
  }, [pathname, mounted]);

  if (!mounted || !show) return null;

  return (
    <div className="mb-4">
      <button type="button" className="btn btn-ghost" onClick={() => router.back()} aria-label="Regresar">
        ← Volver
      </button>
    </div>
  );
}
