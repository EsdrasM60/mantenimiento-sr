import mongoose, { Schema, models, model } from "mongoose";

const TenantSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    dbName: { type: String },
    dbUri: { type: String },
    domains: { type: [String], default: [] },
    active: { type: Boolean, default: true },
    created_by: { type: String },
  },
  { timestamps: true }
);

const Tenant = models.Tenant || model("Tenant", TenantSchema);
export default Tenant;
export type TTenant = {
  _id?: any;
  slug: string;
  name: string;
  dbName?: string;
  dbUri?: string;
  domains?: string[];
  active?: boolean;
};
