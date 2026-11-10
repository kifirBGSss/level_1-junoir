import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

export const rootPath = fileURLToPath(new URL("../../", import.meta.url));
dotenv.config({
  path: fileURLToPath(new URL("../../.env", import.meta.url)),
  quiet: true,
});

export function getDatabaseUrl(name = "DATABASE_URL") {
  const value = process.env[name];
  if (!value)
    throw new Error(`Задайте ${name} в .env или переменных окружения.`);
  return value;
}
