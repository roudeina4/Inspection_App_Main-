require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and set your PostgreSQL connection string.",
  );
}

/** @type {import("drizzle-kit").Config} */
module.exports = {
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
};
