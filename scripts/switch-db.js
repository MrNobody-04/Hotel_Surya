const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const mode = process.argv[2] || "sqlite";

const root = path.resolve(__dirname, "..");
const schemaPath = path.join(root, "prisma", "schema.prisma");
const postgresSchema = path.join(root, "prisma", "schema.postgresql.prisma");
const sqliteSchema = path.join(root, "prisma", "schema.sqlite.prisma");
const envPath = path.join(root, ".env");

const postgresEnvPath = path.join(root, ".env.postgres");

if (mode === "postgres") {
  console.log("Switching to PostgreSQL database mode...");
  if (fs.existsSync(postgresSchema)) {
    fs.copyFileSync(postgresSchema, schemaPath);
  }
  if (fs.existsSync(postgresEnvPath)) {
    fs.copyFileSync(postgresEnvPath, envPath);
  } else {
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
    if (!envContent.includes("DATABASE_URL") || envContent.includes("file:")) {
      envContent = `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hotelsurya?schema=public"\nAUTH_SECRET="surya-hotel-super-secret-jwt-key-minimum-32-chars-for-security"\n` + envContent;
      fs.writeFileSync(envPath, envContent);
    }
  }
  console.log("Generating Prisma client for PostgreSQL...");
  execSync("npx prisma generate", { stdio: "inherit", cwd: root });
  console.log("Done. PostgreSQL mode ready.");
} else if (mode === "sqlite") {
  console.log("Switching to SQLite local zero-config mode...");
  // Backup postgres schema first if it exists
  if (!fs.existsSync(postgresSchema) && fs.existsSync(schemaPath)) {
    fs.copyFileSync(schemaPath, postgresSchema);
  }
  if (fs.existsSync(sqliteSchema)) {
    fs.copyFileSync(sqliteSchema, schemaPath);
  }
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  // Backup postgres env
  if (envContent.includes("postgresql://") || envContent.includes("postgres://")) {
    fs.writeFileSync(postgresEnvPath, envContent);
  }
  // Update or set DATABASE_URL
  if (envContent.includes("DATABASE_URL=")) {
    envContent = envContent.replace(/DATABASE_URL=.*/, 'DATABASE_URL="file:./dev.db"');
  } else {
    envContent = `DATABASE_URL="file:./dev.db"\nAUTH_SECRET="surya-hotel-super-secret-jwt-key-minimum-32-chars-for-security"\n` + envContent;
  }
  fs.writeFileSync(envPath, envContent);
  console.log("Generating Prisma client for SQLite...");
  execSync("npx prisma generate", { stdio: "inherit", cwd: root });
  console.log("Pushing schema to dev.db...");
  execSync("npx prisma db push", { stdio: "inherit", cwd: root });
  console.log("Seeding database with demo data...");
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit", cwd: root });
  console.log("Done! Local database is ready with 7 rooms and seed accounts.");
} else {
  console.error("Unknown mode:", mode, "- use 'postgres' or 'sqlite'");
  process.exit(1);
}
