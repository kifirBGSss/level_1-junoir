import { Router } from "express";
import { HttpError } from "../errors.js";
import { parseId, parseTask, parseStatus } from "../validation.js";

export function taskRoutes(repository) {
  const router = Router();
  router.get("/", async (req, res) => res.json(await repository.list()));
  router.post("/", async (req, res) => {
    const task = await repository.create(parseTask(req.body));
    res.status(201).json(task);
  });
  router.put("/:id", async (req, res) => {
    const task = await repository.updateStatus(
      parseId(req.params.id),
      parseStatus(req.body),
    );
    if (!task) throw new HttpError(404, "Задача не найдена.");
    res.json(task);
  });
  router.delete("/:id", async (req, res) => {
    if (!(await repository.remove(parseId(req.params.id))))
      throw new HttpError(404, "Задача не найдена.");
    res.status(204).end();
  });
  return router;
}
