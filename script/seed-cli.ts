import { ensureSeedData } from "../server/seed";

ensureSeedData()
  .then((result) => {
    console.log(result.message);
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
