/**
 * Must be imported first from index.ts so DATABASE_URL is set before db.ts loads.
 */
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(__dirname, "..", ".env");

config({ path: rootEnv });
