export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Некорректный JSON в теле запроса." });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ error: "Тело запроса слишком большое." });
  }
  if (error instanceof HttpError)
    return res.status(error.status).json({ error: error.message });
  console.error("Ошибка API:", error.message);
  const unavailable = [
    "ECONNREFUSED",
    "ETIMEDOUT",
    "57P01",
    "57P03",
    "53300",
  ].includes(error.code);
  return res.status(unavailable ? 503 : 500).json({
    error: unavailable
      ? "База данных временно недоступна. Повторите попытку."
      : "Внутренняя ошибка сервера.",
  });
}
