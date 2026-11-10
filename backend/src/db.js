import pg from "pg";
import { getDatabaseUrl } from "./config.js";

export function createPool(connectionString = getDatabaseUrl()) {
  const pool = new pg.Pool({
    connectionString,
    connectionTimeoutMillis: 5000,
    max: 10,
  });
  pool.on("error", (error) =>
    console.error("Ошибка фонового соединения PostgreSQL:", error.message),
  );
  return pool;
}
