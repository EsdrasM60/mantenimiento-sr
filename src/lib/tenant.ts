import { NextRequest } from "next/server";
import Tenant, { TTenant } from "@/models/Tenant";
import mongoose from "mongoose";
import { connectMongo } from "@/lib/mongo";

// Small in-memory cache to avoid adding node-cache as a dependency for builds.
const CACHE_TTL_MS = 60 * 5 * 1000; // 5 minutes
type CacheEntry = { value: TTenant; expiresAt: number };
const cache = new Map<string, CacheEntry>();

export function slugFromHostOrPath(req: NextRequest): string | null {
  try {
    const host = req.headers.get("host") || "";
    // Subdominio: slug.example.com
    const parts = host.split(".");
    if (parts.length > 2) return parts[0];
    // Path: /t/slug/...
    const p = req.nextUrl.pathname;
    const m = p.match(/^\/t\/(?:([^/]+))/);
    if (m) return m[1];
    return null;
  } catch {
    return null;
  }
}

export async function getTenantBySlug(slug: string): Promise<TTenant | null> {
  const key = `tenant:${slug}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  await ensureGlobalConnection();
  const t = await Tenant.findOne({ slug }).lean();
  if (!t) return null;
  cache.set(key, { value: t as TTenant, expiresAt: Date.now() + CACHE_TTL_MS });
  return t as TTenant;
}

let _globalConn: mongoose.Connection | null = null;
async function ensureGlobalConnection() {
  if (_globalConn && _globalConn.readyState === 1) return _globalConn;
  const uri = process.env.MONGODB_URI || "";
  if (!uri) throw new Error("MONGODB_URI no definido para resolver tenants");
  const m = await mongoose.createConnection(uri, { bufferCommands: false }).asPromise();
  _globalConn = m;
  // Conectar modelo Tenant a esa conexión
  try {
    m.model('Tenant', (await import('@/models/Tenant')).default.schema);
  } catch {}
  return _globalConn;
}

export async function connectTenantDb(tenant: TTenant) {
  // si tenant.dbUri está presente, usarla; si no usar plantilla
  const tenantUri = tenant.dbUri || (process.env.MONGODB_URI_TEMPLATE ? process.env.MONGODB_URI_TEMPLATE.replace('{db}', tenant.dbName || tenant.slug) : undefined);
  if (!tenantUri) throw new Error('No tenant db uri');
  // crear conexión y devolverla
  const conn = await mongoose.createConnection(tenantUri, { bufferCommands: false }).asPromise();
  return conn;
}

// Obtener un modelo ya ligado a la conexión correspondiente (tenant o global)
export async function getModelForTenant(modelImportPath: string, modelName: string, tenantSlug?: string) {
  if (tenantSlug) {
    // intentar resolver tenant y devolver modelo ligado a su conexión
    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) throw new Error('Tenant no encontrado');
    const conn = await connectTenantDb(tenant as any);
    const m = await import(modelImportPath);
    // @ts-ignore
    return conn.model(modelName, (m.default as any).schema);
  }
  // global
  await connectMongo();
  const mg = await import(modelImportPath);
  // @ts-ignore
  return (mg.default as any);
}
