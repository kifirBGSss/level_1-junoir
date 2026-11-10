import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronRight,
  Circle,
  CircleCheck,
  Clock3,
  LayoutGrid,
  ListTodo,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { api } from "./api.js";

const statuses = [
  {
    value: "new",
    label: "Новая",
    plural: "Новые",
    icon: Circle,
    color: "blue",
  },
  {
    value: "in_progress",
    label: "В работе",
    plural: "В работе",
    icon: Clock3,
    color: "amber",
  },
  {
    value: "done",
    label: "Готово",
    plural: "Завершённые",
    icon: CircleCheck,
    color: "green",
  },
];
const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
});
const today = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(new Date());

function EmptyState({ filtered, onReset, onCreate }) {
  return (
    <div className="empty-state">
      <div className="empty-art" aria-hidden="true">
        <ListTodo size={35} strokeWidth={1.4} />
        <span>
          <Check size={14} />
        </span>
      </div>
      <h3>
        {filtered ? "Ничего не нашлось" : "Большие дела начинаются с задачи"}
      </h3>
      <p>
        {filtered
          ? "Измените запрос или сбросьте фильтры."
          : "Добавьте первую задачу — и освободите место для главного."}
      </p>
      <button className="text-button" onClick={filtered ? onReset : onCreate}>
        {filtered ? "Сбросить фильтры" : "Создать первую задачу"}
        <ArrowUpRight size={16} />
      </button>
    </div>
  );
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyIds, setBusyIds] = useState(new Set());
  const [deleteTask, setDeleteTask] = useState(null);
  const [toast, setToast] = useState("");
  const titleRef = useRef(null);
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const loadRequestRef = useRef(0);

  async function load() {
    const requestId = ++loadRequestRef.current;
    setLoading(true);
    setLoadError("");
    try {
      const result = await api.list();
      if (requestId === loadRequestRef.current) setTasks(result);
    } catch (error) {
      if (requestId === loadRequestRef.current) setLoadError(error.message);
    } finally {
      if (requestId === loadRequestRef.current) setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (deleteTask) {
      dialogRef.current.showModal();
      cancelRef.current?.focus();
    } else dialogRef.current.close();
  }, [deleteTask]);

  const counts = Object.fromEntries(
    statuses.map(({ value }) => [
      value,
      tasks.filter((task) => task.status === value).length,
    ]),
  );
  const completed = tasks.length
    ? Math.round((counts.done / tasks.length) * 100)
    : 0;
  const query = search.trim().toLocaleLowerCase("ru-RU");
  const filteredTasks = tasks.filter(
    (task) =>
      (filter === "all" || task.status === filter) &&
      `${task.title} ${task.description}`
        .toLocaleLowerCase("ru-RU")
        .includes(query),
  );
  const filtered = filter !== "all" || query !== "";
  const isDeleting = deleteTask && busyIds.has(deleteTask.id);
  const lock = (id, busy) =>
    setBusyIds((previous) => {
      const next = new Set(previous);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  const focusCreate = () => {
    titleRef.current?.focus();
    titleRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const resetFilters = () => {
    setFilter("all");
    setSearch("");
  };

  async function createTask(event) {
    event.preventDefault();
    if (creating) return;
    setCreating(true);
    setActionError("");
    try {
      const task = await api.create({ title, description });
      setTasks((previous) => [task, ...previous]);
      setTitle("");
      setDescription("");
      resetFilters();
      setToast("Задача создана. Первый шаг сделан!");
      titleRef.current?.focus();
    } catch (error) {
      setActionError(error.message);
    } finally {
      setCreating(false);
    }
  }

  async function updateStatus(task, status) {
    lock(task.id, true);
    setActionError("");
    try {
      const updated = await api.updateStatus(task.id, status);
      setTasks((previous) =>
        previous.map((item) => (item.id === updated.id ? updated : item)),
      );
      setToast(
        status === "done"
          ? "Отличная работа! Задача завершена."
          : "Статус задачи обновлён.",
      );
    } catch (error) {
      setActionError(error.message);
    } finally {
      lock(task.id, false);
    }
  }

  async function confirmDelete() {
    if (!deleteTask || isDeleting) return;
    lock(deleteTask.id, true);
    setActionError("");
    try {
      await api.remove(deleteTask.id);
      setTasks((previous) =>
        previous.filter((item) => item.id !== deleteTask.id),
      );
      setDeleteTask(null);
      setToast("Задача удалена.");
    } catch (error) {
      setDeleteTask(null);
      setActionError(error.message);
    } finally {
      lock(deleteTask.id, false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Taskly — главная">
          <span className="brand-mark">
            <CheckCheck size={25} />
          </span>
          taskly<span className="brand-dot">.</span>
        </a>
        <div className="workspace">
          <span className="workspace-avatar">ЛП</span>
          <div>
            <strong>Личное пространство</strong>
            <span>Всё начинается с идеи</span>
          </div>
        </div>
        <span className="nav-caption">РАБОЧИЙ СТОЛ</span>
        <nav aria-label="Фильтры задач">
          <button
            className={`nav-item ${filter === "all" ? "active" : ""}`}
            onClick={resetFilters}
          >
            <LayoutGrid size={19} />
            Все задачи<span className="nav-count">{tasks.length}</span>
          </button>
          <div className="nav-divider" />
          {statuses.map(({ value, plural, color }) => (
            <button
              key={value}
              className={`nav-item ${filter === value ? "active" : ""}`}
              onClick={() => {
                setFilter(value);
                setSearch("");
              }}
            >
              <span className={`status-dot ${color}`} />
              {plural}
              <span className="nav-count">{counts[value]}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="focus-note">
            <Sparkles size={20} />
            <strong>
              Маленькие шаги.
              <br />
              Большие результаты.
            </strong>
            <p>
              Выберите одну задачу
              <br />и начните с неё.
            </p>
            <span className="note-line" />
          </div>
          <div className="sidebar-footer">
            <span className="online-dot" />
            Ваш ритм. Ваши задачи.<span>v1.0</span>
          </div>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <span className="breadcrumb">Рабочий стол</span>
            <ChevronRight size={14} />
            <strong>Мои задачи</strong>
          </div>
          <time dateTime={new Date().toISOString().slice(0, 10)}>{today}</time>
        </header>
        <div className="page-content">
          <section className="page-heading">
            <div>
              <div className="eyebrow">
                <span /> МЕНЬШЕ ХАОСА, БОЛЬШЕ ЯСНОСТИ
              </div>
              <h1>
                Мои задачи<span>.</span>
              </h1>
              <p>Освободите мысли. Всё важное — здесь.</p>
            </div>
            <button
              className="primary-button heading-create"
              onClick={focusCreate}
            >
              <Plus size={18} />
              Новая задача
            </button>
          </section>

          <section className="stats-grid" aria-label="Статистика задач">
            <div className="stat-card">
              <div>
                <span>Всего задач</span>
                <strong>{loading || loadError ? "—" : tasks.length}</strong>
              </div>
              <span className="stat-icon purple">
                <ListTodo size={23} />
              </span>
              <small>Всё под контролем</small>
            </div>
            {statuses.map(({ value, plural, icon: Icon, color }) => (
              <button
                key={value}
                className={`stat-card ${filter === value ? "selected" : ""}`}
                aria-pressed={filter === value}
                onClick={() => {
                  setFilter(value);
                  setSearch("");
                }}
              >
                <div>
                  <span>{plural}</span>
                  <strong>{loading || loadError ? "—" : counts[value]}</strong>
                </div>
                <span className={`stat-icon ${color}`}>
                  <Icon size={22} />
                </span>
                <small>
                  {value === "new"
                    ? "Ждут своего момента"
                    : value === "in_progress"
                      ? "На пути к результату"
                      : "Можно гордиться собой"}
                </small>
              </button>
            ))}
          </section>

          {actionError && (
            <div className="error-banner" role="alert">
              <span>{actionError}</span>
              <button
                className="icon-button"
                aria-label="Скрыть ошибку"
                onClick={() => setActionError("")}
              >
                <X size={18} />
              </button>
            </div>
          )}

          <div className="work-grid">
            <section className="task-panel" aria-labelledby="task-list-title">
              <div className="panel-heading">
                <div>
                  <h2 id="task-list-title">
                    Список задач <span>{filteredTasks.length}</span>
                  </h2>
                  <p>От идеи до галочки «готово».</p>
                </div>
                <button
                  className="icon-button refresh-button"
                  onClick={load}
                  disabled={loading || creating || busyIds.size > 0}
                  aria-label="Обновить задачи"
                >
                  <RefreshCw size={17} className={loading ? "spin" : ""} />
                </button>
              </div>
              <div className="task-toolbar">
                <div className="tabs" role="group" aria-label="Статус задачи">
                  <button
                    className={filter === "all" ? "selected" : ""}
                    onClick={() => setFilter("all")}
                  >
                    Все
                  </button>
                  {statuses.map(({ value, plural }) => (
                    <button
                      key={value}
                      className={filter === value ? "selected" : ""}
                      onClick={() => setFilter(value)}
                    >
                      {value === "done" ? "Готово" : plural}
                    </button>
                  ))}
                </div>
                <label className="search-field">
                  <Search size={16} />
                  <input
                    aria-label="Поиск задач"
                    placeholder="Найти задачу…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  {search && (
                    <button
                      className="clear-search"
                      aria-label="Очистить поиск"
                      onClick={() => setSearch("")}
                    >
                      <X size={14} />
                    </button>
                  )}
                </label>
              </div>
              {loading ? (
                <div className="loading-state" role="status">
                  <LoaderCircle size={24} className="spin" />
                  <span>Загружаем ваши задачи…</span>
                </div>
              ) : loadError ? (
                <div className="empty-state load-error" role="alert">
                  <div className="empty-art">
                    <RefreshCw size={30} />
                  </div>
                  <h3>Не удалось загрузить задачи</h3>
                  <p>{loadError}</p>
                  <button className="text-button" onClick={load}>
                    Попробовать снова
                    <RefreshCw size={15} />
                  </button>
                </div>
              ) : filteredTasks.length === 0 ? (
                <EmptyState
                  filtered={filtered}
                  onReset={resetFilters}
                  onCreate={focusCreate}
                />
              ) : (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>ЗАДАЧА</th>
                        <th>СТАТУС</th>
                        <th className="date-column">
                          СОЗДАНА <ArrowDown size={11} />
                        </th>
                        <th>
                          <span className="sr-only">Действия</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTasks.map((task) => (
                        <tr
                          key={task.id}
                          className={task.status === "done" ? "task-done" : ""}
                        >
                          <td>
                            <div className="task-name">
                              <span
                                className={`task-checkbox ${task.status === "done" ? "checked" : ""}`}
                                aria-hidden="true"
                              >
                                {task.status === "done" && <Check size={12} />}
                              </span>
                              <div>
                                <strong>{task.title}</strong>
                                {task.description && <p>{task.description}</p>}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className={`status-select ${task.status}`}>
                              <span className="status-dot" />
                              <select
                                aria-label={`Статус задачи «${task.title}»`}
                                value={task.status}
                                disabled={busyIds.has(task.id)}
                                onChange={(event) =>
                                  updateStatus(task, event.target.value)
                                }
                              >
                                {statuses.map(({ value, label }) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td className="date-column">
                            <time dateTime={task.created_at}>
                              {dateFormat.format(new Date(task.created_at))}
                            </time>
                          </td>
                          <td>
                            <button
                              className="icon-button delete-button"
                              disabled={busyIds.has(task.id)}
                              aria-label={`Удалить задачу «${task.title}»`}
                              onClick={() => setDeleteTask(task)}
                            >
                              {busyIds.has(task.id) ? (
                                <LoaderCircle size={17} className="spin" />
                              ) : (
                                <Trash2 size={17} />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="table-footer">
                <span>
                  {loading
                    ? "Загрузка…"
                    : `Показано ${filteredTasks.length} из ${tasks.length}`}
                </span>
                <span>
                  <span className="tiny-dot" />
                  Сначала новые
                </span>
              </div>
            </section>

            <aside className="create-panel" aria-labelledby="create-title">
              <div className="create-heading">
                <span className="create-icon">
                  <Plus size={22} />
                </span>
                <div>
                  <h2 id="create-title">Новая задача</h2>
                  <p>Запишите, чтобы не забыть.</p>
                </div>
              </div>
              <form onSubmit={createTask}>
                <label htmlFor="task-title">
                  Название <span className="required">*</span>
                </label>
                <input
                  ref={titleRef}
                  id="task-title"
                  placeholder="Что нужно сделать?"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  maxLength={200}
                  disabled={creating || loading || !!loadError}
                />
                <div className="label-row">
                  <label htmlFor="task-description">Описание</label>
                  <span>необязательно</span>
                </div>
                <textarea
                  id="task-description"
                  placeholder="Детали, ссылки или первый шаг…"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={5000}
                  rows={5}
                  disabled={creating || loading || !!loadError}
                />
                <div className="form-hint">
                  <span className="status-dot blue" />
                  Новая задача получит статус «Новая»
                </div>
                <button
                  className="primary-button create-button"
                  type="submit"
                  disabled={creating || loading || !!loadError || !title.trim()}
                >
                  {creating ? (
                    <LoaderCircle size={17} className="spin" />
                  ) : (
                    <Plus size={17} />
                  )}
                  {creating ? "Создаём…" : "Создать задачу"}
                </button>
              </form>
              <div className="create-bottom">
                <Check size={14} />
                Один шаг ближе к результату
              </div>
            </aside>
          </div>

          <section className="progress-panel" aria-label="Прогресс выполнения">
            <span className="progress-icon">
              <CheckCheck size={23} />
            </span>
            <div className="progress-copy">
              <h3>
                {completed === 100 && tasks.length
                  ? "Всё готово. Отличная работа!"
                  : "Каждая завершённая задача — маленькая победа."}
              </h3>
              <p>
                {tasks.length
                  ? `Завершено ${counts.done} из ${tasks.length}. Продолжайте в своём темпе.`
                  : "Добавьте задачу, чтобы начать свой путь к результату."}
              </p>
            </div>
            <div className="progress-meter">
              <div>
                <span>Ваш прогресс</span>
                <strong>{completed}%</strong>
              </div>
              <progress max="100" value={completed}>
                {completed}%
              </progress>
            </div>
          </section>
          <footer className="page-footer">
            <span>
              taskly<span className="brand-dot">.</span>{" "}
              <span className="footer-divider">/</span> Пространство для важных
              дел
            </span>
            <span>Сделано с фокусом на простоту</span>
          </footer>
        </div>
      </main>

      <div
        className={`toast ${toast ? "visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {toast && (
          <>
            <span>
              <Check size={16} />
            </span>
            {toast}
            <button
              className="icon-button"
              aria-label="Скрыть уведомление"
              onClick={() => setToast("")}
            >
              <X size={16} />
            </button>
          </>
        )}
      </div>
      <dialog
        ref={dialogRef}
        aria-labelledby="delete-title"
        aria-describedby="delete-description"
        onCancel={(event) => {
          event.preventDefault();
          if (!isDeleting) setDeleteTask(null);
        }}
      >
        <div className="dialog-icon">
          <Trash2 size={24} />
        </div>
        <h2 id="delete-title">Удалить задачу?</h2>
        <p id="delete-description">
          «{deleteTask?.title}» будет удалена без возможности восстановления.
        </p>
        <div className="dialog-actions">
          <button
            ref={cancelRef}
            className="secondary-button"
            disabled={isDeleting}
            onClick={() => setDeleteTask(null)}
          >
            Отмена
          </button>
          <button
            className="danger-button"
            disabled={isDeleting}
            onClick={confirmDelete}
          >
            {isDeleting ? "Удаляем…" : "Удалить"}
          </button>
        </div>
      </dialog>
    </div>
  );
}
