"""Интеграционные проверки экспорта на изолированной временной схеме."""
import csv
import os
from pathlib import Path
import tempfile
import unittest
from uuid import uuid4

import psycopg
from dotenv import load_dotenv
from export_tasks import export_tasks, FIELDS

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


class ExportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        database_url = os.environ.get("TEST_DATABASE_URL")
        if not database_url:
            raise unittest.SkipTest("Задайте TEST_DATABASE_URL для интеграционных тестов CSV")
        cls.database_url = database_url

    def test_csv_round_trip_and_empty_table(self):
        schema = "test_" + uuid4().hex
        with psycopg.connect(self.database_url, autocommit=True) as admin:
            admin.execute(f'CREATE SCHEMA "{schema}"')
            try:
                conninfo = psycopg.conninfo.make_conninfo(self.database_url, options=f"-c search_path={schema}")
                with psycopg.connect(conninfo) as db:
                    db.execute((Path(__file__).resolve().parents[1] / "database/init.sql").read_text(encoding="utf-8"))
                with tempfile.TemporaryDirectory() as directory:
                    output = Path(directory) / "nested" / "tasks.csv"
                    self.assertEqual(export_tasks(conninfo, output), 0)
                    with output.open(encoding="utf-8-sig", newline="") as file:
                        self.assertEqual(list(csv.reader(file)), [list(FIELDS)])
                    title = 'Изучить "React", затем Python 🚀'
                    description = "Строка 1\nСтрока 2, с запятой"
                    with psycopg.connect(conninfo) as db:
                        db.execute("INSERT INTO tasks (title, description) VALUES (%s, %s)", (title, description))
                    self.assertEqual(export_tasks(conninfo, output), 1)
                    with output.open(encoding="utf-8-sig", newline="") as file:
                        rows = list(csv.DictReader(file))
                    self.assertEqual(rows[0]["title"], title)
                    self.assertEqual(rows[0]["description"], description)
                    self.assertEqual(rows[0]["status"], "new")
                    self.assertTrue(rows[0]["created_at"])
                    self.assertEqual(list(output.parent.glob("*.tmp")), [])
            finally:
                admin.execute(f'DROP SCHEMA "{schema}" CASCADE')


if __name__ == "__main__":
    unittest.main()
