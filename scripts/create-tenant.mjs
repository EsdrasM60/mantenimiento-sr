import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const slug = process.argv[2] || process.env.TENANT_SLUG || "jeg";
const name = process.argv[3] || process.env.TENANT_NAME || "JEG";
const dbName = process.argv[4] || process.env.TENANT_DBNAME || `mantenimiento_${slug}`;
// optional admin args: node ./scripts/create-tenant.mjs <slug> <name> <dbName> <adminEmail> <adminPassword>
const adminEmailArg = process.argv[5] || process.env.ADMIN_EMAIL;
const adminPasswordArg = process.argv[6] || process.env.ADMIN_PASSWORD;

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_URI_TEMPLATE = process.env.MONGODB_URI_TEMPLATE; // e.g. mongodb+srv://user:pass@host/{db}?retryWrites=true&w=majority

if (!MONGODB_URI && !MONGODB_URI_TEMPLATE) {
  console.error("Falta MONGODB_URI o MONGODB_URI_TEMPLATE en el entorno. No puedo crear el tenant.");
  process.exit(1);
}

const globalUri = MONGODB_URI || (MONGODB_URI_TEMPLATE && MONGODB_URI_TEMPLATE.replace("{db}", "admin"));
const tenantDbUri = MONGODB_URI_TEMPLATE ? MONGODB_URI_TEMPLATE.replace("{db}", dbName) : MONGODB_URI;

async function main() {
  try {
    await mongoose.connect(globalUri, { dbName: "admin", autoIndex: false });
    console.log("Conectado a la DB global para crear el tenant...");

    const TenantSchema = new mongoose.Schema({
      slug: { type: String, required: true, unique: true },
      name: { type: String, required: true },
      dbName: { type: String },
      dbUri: { type: String },
      domains: { type: [String], default: [] },
      active: { type: Boolean, default: true },
      created_by: { type: String, default: "script" },
    }, { timestamps: true });

    const Tenant = mongoose.models.Tenant || mongoose.model("Tenant", TenantSchema, "tenants");

    const existing = await Tenant.findOne({ slug }).lean();
    if (existing) {
      console.log(`Tenant with slug '${slug}' already exists. Updating fields...`);
      await Tenant.updateOne({ slug }, { $set: { name, dbName, dbUri: tenantDbUri, active: true } });
      console.log("Tenant updated.");
    } else {
      const t = new Tenant({ slug, name, dbName, dbUri: tenantDbUri, domains: [], active: true, created_by: "script" });
      await t.save();
      console.log(`Tenant '${slug}' created.`);
    }

    // Show connection info for tenant DB
    console.log("Tenant DB URI:", tenantDbUri);

    // If admin credentials provided, create/update admin user in tenant DB
    const adminEmail = adminEmailArg;
    const adminPassword = adminPasswordArg;
    if (adminEmail && adminPassword) {
      console.log("Creando/actualizando admin en la DB del tenant...");
      // connect to tenant DB (reusing mongoose global connection for simplicity)
      await mongoose.disconnect();
      await mongoose.connect(tenantDbUri, { dbName, autoIndex: false });

      // use a permissive model so we can upsert without importing the app schema
      const UserSchema = new mongoose.Schema({}, { strict: false });
      const User = mongoose.models.User || mongoose.model('User', UserSchema, 'users');

      const passwordHash = bcrypt.hashSync(adminPassword, 10);
      const updated = await User.findOneAndUpdate(
        { email: adminEmail },
        { name: "Administrador", email: adminEmail, passwordHash, role: "ADMIN", emailVerified: true },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();

      const adminId = updated && updated._id ? String(updated._id) : null;
      console.log(`Admin upserted in tenant DB: ${adminEmail} (id=${adminId})`);

      await mongoose.disconnect();
      // reconnect to global to leave state clean
      await mongoose.connect(globalUri, { dbName: "admin", autoIndex: false });
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Error creating tenant:", err);
    try { await mongoose.disconnect(); } catch (e) {}
    process.exit(1);
  }
}

main();
