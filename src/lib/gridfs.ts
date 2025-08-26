import mongoose from "mongoose";
import { connectMongo } from "./mongo";

// Cache de buckets por nombre
const _buckets: Record<string, any> = {};

export async function getGridFSBucket(bucketName = "uploads") {
  await connectMongo();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const GridFSBucket = (mongoose as any).mongo.GridFSBucket;
  if (!_buckets[bucketName]) {
    _buckets[bucketName] = new GridFSBucket(mongoose.connection.db, { bucketName });
  }
  return _buckets[bucketName];
}

export function toObjectId(id: string) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}
