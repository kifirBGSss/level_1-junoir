import { HttpError } from "./errors.js";

export const STATUSES = ["new", "in_progress", "done"];

export function parseId(value) {
  if (!/^[1-9]\d*$/.test(value) || Number(value) > 2147483647) {
    throw new HttpError(
      400,
      "ID задачи должен быть положительным целым числом.",
    );
  }
  return Number(value);
}

function objectBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "Ожидается JSON-объект.");
  }
}

export function parseTask(body) {
  objectBody(body);
  const { title, description = "" } = body;
  if (
    typeof title !== "string" ||
    !title.trim() ||
    [...title.trim()].length > 200
  ) {
    throw new HttpError(400, "Название должно содержать от 1 до 200 символов.");
  }
  if (typeof description !== "string" || [...description].length > 5000) {
    throw new HttpError(
      400,
      "Описание должно быть строкой длиной до 5000 символов.",
    );
  }
  return { title: title.trim(), description: description.trim() };
}

export function parseStatus(body) {
  objectBody(body);
  if (!STATUSES.includes(body.status)) {
    throw new HttpError(400, "Допустимые статусы: new, in_progress, done.");
  }
  return body.status;
}
