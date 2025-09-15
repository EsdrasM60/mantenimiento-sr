import mongoose, { Schema } from "mongoose";

const ProgramaSchema = new Schema(
  {
    fichaId: { type: Schema.Types.ObjectId, ref: "Ficha", required: true, index: true },
    voluntarioId: { type: Schema.Types.ObjectId, ref: "Volunteer", required: true, index: true },
    ayudanteId: { type: Schema.Types.ObjectId, ref: "Volunteer", required: false, index: true },
    asignadoFecha: { type: Date, required: true },
    completadoFecha: { type: Date },
    notas: { type: String },
    fotos: [{ type: String }],
    created_by: { type: String },
  },
  { timestamps: true }
);

// compound index for assigned/completed dates (keep instead of per-field duplicate)
ProgramaSchema.index({ asignadoFecha: 1, completadoFecha: 1 });
ProgramaSchema.index({ createdAt: -1 });

export default (mongoose.models.Programa as mongoose.Model<any>) || mongoose.model("Programa", ProgramaSchema);
