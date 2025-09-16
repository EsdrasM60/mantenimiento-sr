import mongoose from "mongoose";
import { connectMongo } from "./mongo";
import { connectMedia } from "./media";
import { connectTenantDb } from "@/lib/tenant";

// Cache de buckets por nombre
const _buckets: Record<string, any> = {};

export async function getGridFSBucket(bucketName = "uploads") {
  // Si hay base separada para media, úsala
  const hasMedia = !!process.env.MONGODB_MEDIA_URI;
  if (hasMedia) {
    const conn = await connectMedia();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const GridFSBucket = (mongoose as any).mongo.GridFSBucket;
    const key = `${bucketName}__media`;
    if (!_buckets[key]) {
      _buckets[key] = new GridFSBucket(conn.db, { bucketName });
    }
    return _buckets[key];
  }
  await connectMongo();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const GridFSBucket = (mongoose as any).mongo.GridFSBucket;
  if (!_buckets[bucketName]) {
    _buckets[bucketName] = new GridFSBucket(mongoose.connection.db, { bucketName });
  }
  return _buckets[bucketName];
}

// Obtener bucket forzando la fuente (principal o media)
export async function getGridFSBucketFrom(bucketName = "uploads", source: "main" | "media") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const GridFSBucket = (mongoose as any).mongo.GridFSBucket;
  if (source === "media") {
    const conn = await connectMedia();
    const key = `${bucketName}__media`;
    if (!_buckets[key]) _buckets[key] = new GridFSBucket(conn.db, { bucketName });
    return _buckets[key];
  }
  await connectMongo();
  if (!_buckets[bucketName]) _buckets[bucketName] = new GridFSBucket(mongoose.connection.db, { bucketName });
  return _buckets[bucketName];
}

// Obtener bucket usando la DB del tenant (DB-per-tenant)
export async function getGridFSBucketForTenant(bucketName = "uploads", tenantSlug?: string) {
  if (tenantSlug) {
    const key = `${bucketName}__tenant__${tenantSlug}`;
    if (_buckets[key]) return _buckets[key];
    // connectTenantDb acepta un objeto tenant; pasamos el slug para construir la URI
    const conn = await connectTenantDb({ slug: tenantSlug } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const GridFSBucket = (mongoose as any).mongo.GridFSBucket;
    _buckets[key] = new GridFSBucket(conn.db, { bucketName });
    return _buckets[key];
  }
  return getGridFSBucket(bucketName);
}

export function toObjectId(id: string) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}
