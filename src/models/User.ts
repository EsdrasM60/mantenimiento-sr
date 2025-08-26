import mongoose, { Schema, models, model } from "mongoose";

export type Role = "ADMIN" | "COORDINADOR" | "VOLUNTARIO";

const UserSchema = new Schema(
  {
    name: { type: String },
    email: { type: String, unique: true, index: true, required: true },
    passwordHash: { type: String },
    role: { type: String, enum: ["ADMIN", "COORDINADOR", "VOLUNTARIO"], default: "VOLUNTARIO" },
    emailVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = models.User || model("User", UserSchema);
export default User;
