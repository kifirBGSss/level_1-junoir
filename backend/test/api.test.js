import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";

function setup() {
  let tasks = [];
  let id = 1;
  const repository = {
    list: async () => [...tasks].reverse(),
    create: async (data) => {
      const task = {
        id: id++,
        ...data,
        status: "new",
        created_at: new Date().toISOString(),
      };
      tasks.push(task);
      return task;
    },
    updateStatus: async (taskId, status) => {
      const task = tasks.find((item) => item.id === taskId);
      if (task) task.status = status;
      return task;
    },
    remove: async (taskId) => {
      const found = tasks.some((item) => item.id === taskId);
      tasks = tasks.filter((item) => item.id !== taskId);
      return found;
    },
  };
  return request(createApp({ repository }));
}

test("HTTP: создание, список, все статусы, удаление и повторное удаление", async () => {
  const api = setup();
  await api.get("/tasks").expect(200, []);
  const created = await api
    .post("/tasks")
    .send({ title: "  Изучить React  ", description: "Пройти базовый курс" })
    .expect(201);
  assert.equal(created.body.title, "Изучить React");
  assert.equal(created.body.status, "new");
  assert.ok(created.body.created_at);
  const list = await api.get("/tasks").expect(200);
  assert.equal(list.body.length, 1);
  for (const status of ["in_progress", "done", "new"]) {
    const updated = await api
      .put(`/tasks/${created.body.id}`)
      .send({ status })
      .expect(200);
    assert.equal(updated.body.status, status);
  }
  await api.delete(`/tasks/${created.body.id}`).expect(204, "");
  await api.get("/tasks").expect(200, []);
  await api.delete(`/tasks/${created.body.id}`).expect(404);
});

test("Описание необязательно, клиент не задаёт ID и исходный статус", async () => {
  const created = await setup()
    .post("/tasks")
    .send({ title: "Задача", id: 999, status: "done" })
    .expect(201);
  assert.equal(created.body.description, "");
  assert.equal(created.body.status, "new");
  assert.equal(created.body.id, 1);
});

for (const body of [
  {},
  { title: "" },
  { title: "   " },
  { title: 12 },
  { title: "a".repeat(201) },
  { title: "x", description: null },
  { title: "x", description: "a".repeat(5001) },
  [],
]) {
  test(`Невалидная задача: ${JSON.stringify(body).slice(0, 60)}`, async () => {
    const api = setup();
    const result = await api.post("/tasks").send(body).expect(400);
    assert.equal(typeof result.body.error, "string");
    await api.get("/tasks").expect(200, []);
  });
}

test("Невалидные статусы и ID возвращают 400", async () => {
  const api = setup();
  for (const id of ["0", "-1", "abc", "1.5", "2147483648", "1e2"]) {
    await api.put(`/tasks/${id}`).send({ status: "done" }).expect(400);
    await api.delete(`/tasks/${id}`).expect(400);
  }
  for (const status of ["unknown", null, 1])
    await api.put("/tasks/1").send({ status }).expect(400);
  await api.put("/tasks/1").send({}).expect(400);
  await api.put("/tasks/1").send({ status: "done" }).expect(404);
});

test("Ошибки JSON, размера тела и неизвестные маршруты", async () => {
  const api = setup();
  await api
    .post("/tasks")
    .set("Content-Type", "application/json")
    .send("{broken")
    .expect(400);
  await api
    .post("/tasks")
    .send({ title: "a".repeat(40000) })
    .expect(413);
  await api.get("/unknown").expect(404);
});

test("Ошибки хранилища скрывают детали; ошибка здоровья доходит до middleware", async () => {
  const app = createApp({
    repository: {
      list: async () => {
        throw new Error("sensitive database details");
      },
    },
    checkHealth: async () => {
      throw Object.assign(new Error("connection refused"), {
        code: "ECONNREFUSED",
      });
    },
  });
  const failed = await request(app).get("/tasks").expect(500);
  assert.equal(failed.body.error, "Внутренняя ошибка сервера.");
  await request(app).get("/health").expect(503);
});

test("Проверка здоровья API", async () => {
  await setup().get("/health").expect(200, { status: "ok" });
});
