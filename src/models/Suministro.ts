import mongoose, { Schema } from "mongoose";

const SuministroSchema = new Schema(
  {
    nombre: { type: String, required: true, index: true },
    proveedor: { type: String },
    idArticulo: { type: String },
    costo: { type: Number },
    cantidadComprada: { type: Number, required: true, default: 0 },
    cantidadExistencia: { type: Number, required: true, default: 0 },
    created_by: { type: String },
  },
  { timestamps: true }
);

SuministroSchema.index({ nombre: 1 });

export default (mongoose.models.Suministro as mongoose.Model<any>) || mongoose.model("Suministro", SuministroSchema);
