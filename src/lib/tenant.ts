import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectMongo } from "@/lib/mongo";

// Tenant model may be present only in WIP branch. Do not import at top-level to avoid build errors.
type TTenant = any;

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
  // Try to resolve Tenant model from the connection. If it's not registered, attempt to import and register it.
  let TenantModel: any = null;
  try {
    if (_globalConn && (_globalConn as any).models && ("Tenant" in (_globalConn as any).models)) {
      TenantModel = _globalConn!.model('Tenant');
    } else {
      // try dynamic import and register
      const mod = await import('@/models/Tenant').catch(() => null);
      if (mod && mod.default && mod.default.schema) {
        try { _globalConn!.model('Tenant', mod.default.schema); } catch {}
        TenantModel = _globalConn!.model('Tenant');
      }
    }
  } catch (e) {
    TenantModel = null;
  }
  if (!TenantModel) return null;
  const t = await TenantModel.findOne({ slug }).lean();
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
  // Try to register Tenant model if module exists, but don't fail if it doesn't
  try {
    const mod = await import('@/models/Tenant');
    if (mod && mod.default && mod.default.schema) {
      try { m.model('Tenant', mod.default.schema); } catch {}
    }
  } catch {
    // module not present — that's fine on main branch
  }
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
export async function getModelForTenant(modelImportPath: string, modelName: string, tenantSlug?: string): Promise<any> {
  // If tenantSlug provided, resolve tenant and use tenant-specific connection
  if (tenantSlug) {
    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) throw new Error(`Tenant not found: ${tenantSlug}`);
    const conn = await connectTenantDb(tenant);
    // If model already registered on this connection, return it
    if ((conn as any).models && modelName in (conn as any).models) return conn.model(modelName);
    // Otherwise, try dynamic import and register schema on this connection
    const mod = await import(modelImportPath).catch(() => null);
    if (mod && mod.default && mod.default.schema) {
      try { (conn as any).model(modelName, mod.default.schema); } catch {}
      return conn.model(modelName);
    }
    throw new Error(`Model ${modelName} not found for tenant ${tenantSlug}`);
  }

  // Use global connection
  await ensureGlobalConnection();
  if (!_globalConn) throw new Error('No global connection');
  if ((_globalConn as any).models && modelName in (_globalConn as any).models) return _globalConn.model(modelName);
  const mod = await import(modelImportPath).catch(() => null);
  if (mod && mod.default && mod.default.schema) {
    try { _globalConn.model(modelName, mod.default.schema); } catch {}
    return _globalConn.model(modelName);
  }
  throw new Error(`Model ${modelName} not found on global connection`);
}
