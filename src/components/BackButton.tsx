"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function BackButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      // show if there's history to go back or path is not root
      const hasHistory = typeof window !== "undefined" && window.history.length > 1;
      const notRoot = !!pathname && pathname !== "/";
      setShow(hasHistory || notRoot);
    } catch (e) {
      setShow(false);
    }
  }, [pathname]);

  if (!show) return null;

  return (
    <div className="mb-4">
      <button type="button" className="btn btn-ghost" onClick={() => router.back()} aria-label="Regresar">
        ← Volver
      </button>
    </div>
  );
}
