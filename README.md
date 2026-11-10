# Taskly — AI Task Manager · Junior

Практическая работа уровня 1: веб-приложение для управления задачами на **React + JavaScript, Node.js / Express и PostgreSQL**. Дополнительный Python-скрипт выгружает задачи в CSV.

Приложение позволяет создать задачу, посмотреть список, изменить статус через select и удалить задачу с подтверждением. Есть поиск по названию и описанию, фильтры, счётчики статусов и прогресс. Интерфейс адаптирован для телефона, ошибки API отображаются на экране.

Название практики — AI Task Manager; уровень 1 не требует интеграции с AI, поэтому внешний AI API и ключи не используются.

![Интерфейс Taskly с тестовой задачей](docs/screenshot.jpg)

Скриншот сделан при ручной проверке. При первом запуске база задач пустая.

## Быстрый запуск через Docker

Нужны Docker Desktop с Compose и Git. Выполните в терминале:

```sh
git clone https://github.com/kifirBGSss/level_1-junoir.git
cd level_1-junoir
docker compose up --build -d
```

Откройте **http://localhost:3001**. Таблица создаётся автоматически SQL-скриптом при первом запуске PostgreSQL. Node.js и Python на компьютере для этого варианта не нужны.

```sh
docker compose logs -f app
docker compose down
```

Задачи сохраняются в именованном томе `postgres_data` и остаются после `docker compose down`. Не добавляйте `-v`, если хотите сохранить данные. Учебные реквизиты БД приведены в `compose.yaml`; приложение и PostgreSQL доступны только на локальном компьютере.

Если установленный PostgreSQL уже использует порт 5432, замените проброс **слева** в `compose.yaml` на `127.0.0.1:5433:5432` либо уберите `ports` у сервиса `db`. Приложение и Docker-экспорт продолжат обращаться к `db:5432`. Для доступа с компьютера используйте выбранный внешний порт в `.env`.

Экспорт через Docker:

```sh
docker compose --profile tools run --rm --build export
```

Файл появится на компьютере в `exports/tasks.csv`. Для первого экспорта может потребоваться создание каталога: `mkdir exports`.

## Локальный запуск без Docker

Нужны **Node.js 22.12+** (рекомендуется 24), npm, **PostgreSQL 16+**, Git. Для экспорта — **Python 3.10+** и pip.

### 1. Зависимости и конфигурация

```sh
git clone https://github.com/kifirBGSss/level_1-junoir.git
cd level_1-junoir
npm ci
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Linux / macOS:

```sh
cp .env.example .env
```

### 2. PostgreSQL

Подключитесь под администратором PostgreSQL через psql или Query Tool в pgAdmin и выполните:

```sql
CREATE USER task_manager WITH PASSWORD 'task_manager_dev';
CREATE DATABASE task_manager OWNER task_manager;
```

`CREATE DATABASE` выполните отдельно, вне транзакции. Если используете существующего пользователя, укажите его реквизиты в `.env`. PostgreSQL должен быть запущен. Строка подключения:

```dotenv
DATABASE_URL=postgresql://task_manager:task_manager_dev@127.0.0.1:5432/task_manager
PORT=3001
HOST=127.0.0.1
NODE_ENV=development
```

Замените логин, пароль и порт своими значениями. Специальные символы пароля в URL нужно кодировать (например, `@` → `%40`). `.env` игнорируется Git. Реальные реквизиты не добавляются в репозиторий.

Создайте таблицу из `database/init.sql`:

```sh
npm run db:init
```

Либо выполните этот SQL-файл через pgAdmin. Повторный `npm run db:init` не удаляет задачи.

### 3. Режим разработки

```sh
npm run dev
```

- Интерфейс: **http://localhost:5173**.
- API: **http://127.0.0.1:3001/tasks**.
- Проверка подключения к БД: **http://127.0.0.1:3001/health**.

Vite перенаправляет `/tasks` и `/health` на Express. При изменении `PORT` перезапустите `npm run dev`. Остановка обоих процессов — `Ctrl+C`.

### 4. Сборка и запуск

```sh
npm run build
npm start
```

Откройте **http://localhost:3001**. Express отдаёт собранный React-интерфейс и API с одного адреса. `npm start` требует предварительной сборки, заполненного `.env` и таблицы `tasks`.

## REST API

Все тела запросов и ответы, кроме успешного удаления, используют JSON. Для POST и PUT требуется `Content-Type: application/json`.

| Метод | Путь | Результат |
| --- | --- | --- |
| POST | `/tasks` | `201`, созданная задача со статусом `new` |
| GET | `/tasks` | `200`, массив задач, сначала новые |
| PUT | `/tasks/:id` | `200`, задача с обновлённым статусом |
| DELETE | `/tasks/:id` | `204`, пустое тело |
| GET | `/health` | `200`, `{"status":"ok"}` при доступной БД |

Создание задачи:

```json
{
  "title": "Изучить React",
  "description": "Пройти базовый курс"
}
```

Изменение статуса:

```json
{ "status": "in_progress" }
```

Статусы: `new`, `in_progress`, `done`. Название обязательно, 1–200 символов после удаления пробелов по краям. Описание необязательно, до 5000 символов. ID — положительное целое число. Поля `id`, `status`, `created_at` при создании назначает сервер.

Ответ с задачей:

```json
{
  "id": 1,
  "title": "Изучить React",
  "description": "Пройти базовый курс",
  "status": "new",
  "created_at": "2026-11-10T10:00:00.000Z"
}
```

Ошибки возвращаются как `{"error":"Описание ошибки"}`: `400` — неверные данные / JSON / ID, `404` — задача или маршрут не найдены, `413` — слишком большой запрос, `500` — внутренняя ошибка, `503` — временно недоступна БД. SQL-запросы параметризованы, детали БД клиенту не передаются.

PowerShell-пример:

```powershell
$body = @{title='Изучить React'; description='Пройти базовый курс'} | ConvertTo-Json
Invoke-RestMethod http://localhost:3001/tasks -Method Post -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body))
Invoke-RestMethod http://localhost:3001/tasks
Invoke-RestMethod http://localhost:3001/tasks/1 -Method Put -ContentType 'application/json' -Body '{"status":"done"}'
Invoke-RestMethod http://localhost:3001/tasks/1 -Method Delete
```

## Схема PostgreSQL

| Поле | Тип | Ограничения |
| --- | --- | --- |
| id | INTEGER IDENTITY | PRIMARY KEY, автоинкремент |
| title | VARCHAR(200) | NOT NULL, непустое |
| description | TEXT | NOT NULL, по умолчанию пустая строка, до 5000 символов |
| status | VARCHAR(20) | NOT NULL, DEFAULT `new`, CHECK по трём статусам |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

Схема: [`database/init.sql`](database/init.sql). Даты хранятся с часовым поясом, API отдаёт ISO 8601, интерфейс показывает локальную дату.

## Python: экспорт в CSV

Из корня проекта создайте виртуальное окружение и установите зависимости. Если в Windows Python доступен как `py`, используйте `py` вместо `python`.

Windows PowerShell (активация окружения не требуется):

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe export_tasks.py
.\.venv\Scripts\python.exe export_tasks.py --output exports/my_tasks.csv
```

Linux / macOS:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python export_tasks.py
```

Скрипт читает `DATABASE_URL` из корневого `.env` или окружения и работает независимо от запущенного Node.js. Выгружает все задачи в `exports/tasks.csv`, столбцы: `id,title,description,status,created_at`. Кодировка **UTF-8 с BOM**, разделитель — запятая. Кавычки, переносы строк и кириллица сохраняются; в Excel при необходимости выберите импорт CSV с разделителем «запятая». Для пустой таблицы создаётся CSV с заголовком.

Запись атомарная: существующий CSV заменяется после успешного завершения экспорта. При ошибке скрипт завершается с кодом 1 и выводит сообщение. Содержимое CSV, `.env`, виртуальное окружение и зависимости исключены из Git.

## Проверки

```sh
npm test
npm run build
```

HTTP-тесты проверяют полный CRUD, статусы, валидацию, некорректный JSON, ограничения размера и обработку ошибок. Они не требуют БД.

Интеграционные тесты требуют отдельную базу. Создайте её под администратором PostgreSQL:

```sql
CREATE DATABASE task_manager_test OWNER task_manager;
```

Добавьте в `.env` (не используйте рабочую БД):

```dotenv
TEST_DATABASE_URL=postgresql://task_manager:task_manager_dev@127.0.0.1:5432/task_manager_test
```

```sh
npm run test:integration
```

Python-тесты, Windows:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Linux / macOS:

```sh
.venv/bin/python -m unittest discover -s tests -v
```

Каждый интеграционный тест создаёт уникальную временную схему и удаляет её после выполнения. Проверяются реальный PostgreSQL, сохранение задач, SQL-ограничения, пустой CSV и экспорт кириллицы, кавычек, эмодзи и переносов строк. Эти же проверки запускаются GitHub Actions при push и pull request.

Ручная проверка интерфейса: создайте задачу, перезагрузите страницу, смените каждый статус через select, найдите задачу поиском, проверьте фильтры, отмените удаление и затем подтвердите его. Отключите API и нажмите кнопку обновления — должен появиться блок ошибки с повторной попыткой.

## Структура

```text
backend/
  src/                 # Express, подключение к БД, ошибки, валидация
    tasks/             # REST-маршруты и SQL-хранилище
  scripts/init-db.js   # Применение SQL-схемы
  test/               # HTTP и PostgreSQL-тесты
frontend/
  src/                 # React, API-клиент и стили
database/init.sql      # Создание таблицы
export_tasks.py        # Python → PostgreSQL → CSV
tests/test_export.py   # Интеграционные тесты CSV
compose.yaml           # Приложение, БД и экспорт
.github/workflows/ci.yml
```

## Если что-то не запускается

- `ECONNREFUSED`: проверьте, запущен ли PostgreSQL, и порт в `.env`.
- `password authentication failed`: проверьте пользователя и пароль в `DATABASE_URL`.
- `relation "tasks" does not exist`: выполните `npm run db:init`.
- `EADDRINUSE` / занятый 3001: измените `PORT` в `.env` и перезапустите dev-сервер.
- Занят 5173: остановите другой Vite или измените `server.port` в `frontend/vite.config.js`.
- `python` / `node` не найдены: установите соответствующий runtime и заново откройте терминал.
- В production возвращается JSON 404 на главной: сначала выполните `npm run build`.

## Git

Репозиторий: [kifirBGSss/level_1-junoir](https://github.com/kifirBGSss/level_1-junoir). История изменений: `git log --oneline`.

После собственных изменений:

```sh
git add .
git commit -m "Describe the change"
git push origin main
```
