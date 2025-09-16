import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { slugFromHostOrPath } from "@/lib/tenant";

const PUBLIC_PATHS = [
  "/",
  "/signin",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/api/health",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Permitir recursos estáticos y API
  const isStatic =
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/api/") ||
    /\.(png|jpg|jpeg|svg|ico|webp|gif|css|js|map)$/.test(pathname);
  if (isStatic) return NextResponse.next();

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (isPublic) return NextResponse.next();

  // detectar tenant por subdominio o prefijo /t/:slug
  const tenantSlug = slugFromHostOrPath(req);
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (tenantSlug) {
    const res = NextResponse.next();
    // Exponer slug para handlers mediante header
    res.headers.set("x-tenant-slug", tenantSlug);
    if (token) return res;
    // si no hay token, seguir con redirección a signin incluyendo slug en callback
    const signin = new URL("/signin", req.url);
    const cb = req.nextUrl.pathname + req.nextUrl.search;
    signin.searchParams.set("callbackUrl", cb);
    signin.searchParams.set("tenant", tenantSlug);
    return NextResponse.redirect(signin);
  }

  if (token) return NextResponse.next();

  // Redirigir a login si no hay sesión
  const signin = new URL("/signin", req.url);
  const cb = req.nextUrl.pathname + req.nextUrl.search;
  signin.searchParams.set("callbackUrl", cb);
  return NextResponse.redirect(signin);
}

export const config = {
  matcher: ["/:path*"],
};
