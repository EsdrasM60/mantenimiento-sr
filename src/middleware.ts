import { NextResponse } from "next/server";

export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/tareas", "/plan-semanal", "/usuarios", "/fotos", "/actividad", "/voluntarios", "/usuarios/admin"],
};
