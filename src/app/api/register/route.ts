import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/sqlite";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { connectMongo } from "@/lib/mongo";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { name, email, password } = parsed.data;

  const password_hash = await bcrypt.hash(password, 10);

  try {
    if (process.env.MONGODB_URI) {
      await connectMongo();
      const { default: User } = await import("@/models/User");
      const exists = await User.findOne({ email }).lean();
      if (exists) return NextResponse.json({ error: "El correo ya está registrado" }, { status: 409 });
      await User.create({ name, email, passwordHash: password_hash, role: "VOLUNTARIO", emailVerified: false });
    } else {
      db.prepare(
        `INSERT INTO users (id, name, email, password_hash, role, email_verified)
         VALUES (@id, @name, @email, @password_hash, @role, 0)`
      ).run({ id: crypto.randomUUID(), name, email, password_hash, role: "VOLUNTARIO" });
    }
  } catch (e: any) {
    if (String(e?.message || e).includes("UNIQUE")) {
      return NextResponse.json({ error: "El correo ya está registrado" }, { status: 409 });
    }
    return NextResponse.json({ error: "Error registrando" }, { status: 500 });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    const admin = process.env.ADMIN_EMAIL;
    if (admin) {
      await transporter.sendMail({
        from: `Mantenimiento SR <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: admin,
        subject: "Nuevo registro pendiente de aprobación",
        text: `Nombre: ${name}\nEmail: ${email}`,
      });
    }
  } catch {}

  return NextResponse.json({ ok: true });
}
