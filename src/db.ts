import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ✅ v1.7: Singleton database instance
// Uses data.db from project root
let dbInstance: Database.Database | null = null;

export default function getDb(): Database.Database {
  if (!dbInstance) {
    const dbPath = path.join(process.cwd(), "data.db");
    dbInstance = new Database(dbPath);

    // Enable foreign keys
    dbInstance.pragma("journal_mode = WAL");
    console.log(`[DB] Connected to ${dbPath}`);
  }
  return dbInstance;
}
