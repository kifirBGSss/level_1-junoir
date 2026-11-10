import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import pg from "pg";
import request from "supertest";
import { getDatabaseUrl } from "../src/config.js";
import { createApp } from "../src/app.js";
import { createTaskRepository } from "../src/tasks/repository.js";

test("CRUD с настоящим PostgreSQL, сохранение и ограничения SQL", async () => {
  // Нужна отдельная TEST_DATABASE_URL. Данные приложения не изменяются.
  const connectionString = getDatabaseUrl("TEST_DATABASE_URL");
  const schema = `test_${randomUUID().replaceAll("-", "")}`;
  const admin = new pg.Pool({
    connectionString,
    connectionTimeoutMillis: 5000,
  });
  let pool;
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    pool = new pg.Pool({
      connectionString,
      options: `-c search_path=${schema}`,
      connectionTimeoutMillis: 5000,
    });
    await pool.query(
      await readFile(
        new URL("../../database/init.sql", import.meta.url),
        "utf8",
      ),
    );
    const repository = createTaskRepository(pool);
    const api = request(createApp({ repository }));
    const title = "Изучить React 🚀 '); DROP TABLE tasks; --";
    const created = await api
      .post("/tasks")
      .send({ title, description: "Первая строка\nВторая, с запятой" })
      .expect(201);
    assert.equal(created.body.status, "new");
    assert.equal(created.body.title, title);
    assert.ok(Number.isInteger(created.body.id));
    // Новый экземпляр хранилища читает сохранённые в БД данные.
    assert.equal(
      (await createTaskRepository(pool).list())[0].id,
      created.body.id,
    );
    for (const status of ["in_progress", "done", "new"]) {
      const result = await api
        .put(`/tasks/${created.body.id}`)
        .send({ status })
        .expect(200);
      assert.equal(result.body.status, status);
    }
    await assert.rejects(
      pool.query("INSERT INTO tasks (title, status) VALUES ('x', 'invalid')"),
      { code: "23514" },
    );
    await assert.rejects(
      pool.query("INSERT INTO tasks (title) VALUES ('   ')"),
      { code: "23514" },
    );
    await assert.rejects(
      pool.query("INSERT INTO tasks (title) VALUES (NULL)"),
      { code: "23502" },
    );
    const list = await api.get("/tasks").expect(200);
    assert.equal(list.body.length, 1);
    await api.delete(`/tasks/${created.body.id}`).expect(204);
    await api.get("/tasks").expect(200, []);
  } finally {
    if (pool) await pool.end();
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.end();
  }
});
