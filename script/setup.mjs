import { spawnSync } from "node:child_process";
import pg from "pg";
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "..", ".env") });

async function checkDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env and set your PostgreSQL connection string.");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query("SELECT 1");
    console.log("Database connection OK");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Cannot connect to PostgreSQL:", message);
    console.error("");
    console.error("1. Make sure PostgreSQL is running");
    console.error('2. Create the database: psql -U postgres -c "CREATE DATABASE inspection_app;"');
    console.error("3. Update .env with your postgres password:");
    console.error("   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/inspection_app");
    process.exit(1);
  } finally {
    await pool.end();
  }
}

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: true });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

await checkDatabase();
console.log("Applying database schema...");
run("npx", ["drizzle-kit", "push", "--config=drizzle.config.cjs"]);
console.log("Seeding demo data...");
run("npx", ["tsx", "script/seed-cli.ts"]);
console.log("Setup complete. Run npm run dev and use Demo Inspector login.");
