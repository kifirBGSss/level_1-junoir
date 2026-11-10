import { readFile } from "node:fs/promises";
import { createPool } from "../src/db.js";

let pool;
try {
  pool = createPool();
  await pool.query(
    await readFile(new URL("../../database/init.sql", import.meta.url), "utf8"),
  );
  console.log("Таблица tasks готова.");
} catch (error) {
  console.error("Не удалось создать таблицу:", error.message);
  process.exitCode = 1;
} finally {
  if (pool) await pool.end();
}
