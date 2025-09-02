import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const signin = new URL("/signin", req.url);
    const cb = req.nextUrl.pathname + req.nextUrl.search;
    signin.searchParams.set("callbackUrl", cb);
    return NextResponse.redirect(signin);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/tareas/:path*",
    "/plan-semanal",
    "/usuarios/:path*",
    "/fotos",
    "/actividad",
    "/voluntarios/:path*",
  ],
};
