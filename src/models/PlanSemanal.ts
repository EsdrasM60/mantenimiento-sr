import mongoose, { Schema } from "mongoose";

const AsignacionSchema = new Schema(
  {
    congregacion: { type: String, required: true }, // nombre o id
    semana: { type: Number, enum: [1, 2, 3, 4, 5], required: true },
    year: { type: Number, required: true, index: true },
    month: { type: Number, required: true, index: true }, // 1..12
    completado: { type: Boolean, default: false, index: true },
    notas: { type: String },
  },
  { _id: false }
);

const PlanSemanalSchema = new Schema(
  {
    year: { type: Number, required: true, index: true },
    month: { type: Number, required: true, index: true },
    congregaciones: { type: [String], default: [] },
    asignaciones: { type: [AsignacionSchema], default: [] },
  },
  { timestamps: true }
);

PlanSemanalSchema.index({ year: 1, month: 1 }, { unique: true });

export default (mongoose.models.PlanSemanal as mongoose.Model<any>) || mongoose.model("PlanSemanal", PlanSemanalSchema);
