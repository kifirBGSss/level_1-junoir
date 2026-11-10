import { createApp } from "./app.js";
import { createPool } from "./db.js";
import { createTaskRepository } from "./tasks/repository.js";

let pool;
try {
  pool = createPool();
  await pool.query("SELECT 1 FROM tasks LIMIT 1");
  const app = createApp({
    repository: createTaskRepository(pool),
    checkHealth: () => pool.query("SELECT 1"),
  });
  const server = app.listen(
    Number(process.env.PORT || 3001),
    process.env.HOST || "127.0.0.1",
    () => {
      console.log(
        `Task Manager API: http://${process.env.HOST || "127.0.0.1"}:${process.env.PORT || 3001}`,
      );
    },
  );
  server.on("error", async (error) => {
    console.error("Не удалось запустить сервер:", error.message);
    await pool.end();
    process.exitCode = 1;
  });
  let stopping = false;
  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    server.close(async () => {
      await pool.end();
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
} catch (error) {
  console.error(
    "Ошибка запуска. Проверьте DATABASE_URL и выполните npm run db:init.",
  );
  console.error(error.message);
  if (pool) await pool.end();
  process.exitCode = 1;
}
