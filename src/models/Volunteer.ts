import { Schema, models, model } from "mongoose";

const VolunteerSchema = new Schema(
  {
    nombre: { type: String, required: true },
    apellido: { type: String, required: true },
    telefono: { type: String },
    congregacion: { type: String },
    a2: { type: Boolean, default: false },
    trabajo_altura: { type: Boolean, default: false },
    created_by: { type: String },
    shortId: { type: String, index: true, unique: true },
  },
  { timestamps: true }
);

const Volunteer = models.Volunteer || model("Volunteer", VolunteerSchema);
export default Volunteer;
