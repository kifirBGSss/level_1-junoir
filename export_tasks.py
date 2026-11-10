"""Выгрузка всех задач из PostgreSQL в CSV (UTF-8 BOM для Excel)."""

import argparse
import csv
import os
from pathlib import Path
import sys
import tempfile

import psycopg
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
FIELDS = ("id", "title", "description", "status", "created_at")


def export_tasks(database_url: str, output: Path) -> int:
    """Атомарно записывает CSV; возвращает число выгруженных задач."""
    temporary_path = None
    try:
        with psycopg.connect(database_url, connect_timeout=5) as connection:
            # Серверный курсор не загружает всю таблицу в память.
            with connection.cursor(name="export_tasks") as cursor:
                cursor.execute("SELECT id, title, description, status, created_at FROM tasks ORDER BY created_at, id")
                output.parent.mkdir(parents=True, exist_ok=True)
                with tempfile.NamedTemporaryFile(
                    mode="w", encoding="utf-8-sig", newline="", dir=output.parent,
                    prefix=".tasks-", suffix=".tmp", delete=False
                ) as csv_file:
                    temporary_path = Path(csv_file.name)
                    writer = csv.writer(csv_file)
                    writer.writerow(FIELDS)
                    count = 0
                    for row in cursor:
                        writer.writerow((*row[:4], row[4].isoformat()))
                        count += 1
        os.replace(temporary_path, output)
        temporary_path = None
        return count
    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)


def main() -> int:
    load_dotenv(ROOT / ".env")
    parser = argparse.ArgumentParser(description="Экспорт задач PostgreSQL в CSV")
    parser.add_argument("--output", type=Path, default=ROOT / "exports" / "tasks.csv", help="Путь к CSV (по умолчанию exports/tasks.csv)")
    args = parser.parse_args()
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("Ошибка: задайте DATABASE_URL в .env или переменных окружения.", file=sys.stderr)
        return 1
    try:
        count = export_tasks(database_url, args.output.resolve())
    except psycopg.Error:
        print("Ошибка PostgreSQL: проверьте DATABASE_URL, доступность сервера и таблицу tasks.", file=sys.stderr)
        return 1
    except OSError as error:
        print(f"Не удалось записать CSV: {error}", file=sys.stderr)
        return 1
    print(f"Выгружено задач: {count}. Файл: {args.output.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
