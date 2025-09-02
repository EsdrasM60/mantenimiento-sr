import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = [
  "/signin",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/api/health",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (token) return NextResponse.next();

  // Permitir páginas públicas y recursos estáticos
  if (isPublic) return NextResponse.next();

  // Redirigir a login si no hay sesión
  const signin = new URL("/signin", req.url);
  const cb = req.nextUrl.pathname + req.nextUrl.search;
  signin.searchParams.set("callbackUrl", cb);
  return NextResponse.redirect(signin);
}

export const config = {
  matcher: [
    // Todas las rutas excepto api, estáticos y assets
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(png|jpg|jpeg|svg|ico|webp|gif|css|js|map)).*)",
  ],
};
