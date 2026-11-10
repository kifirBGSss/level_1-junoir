export function createTaskRepository(db) {
  return {
    async list() {
      const { rows } = await db.query(
        "SELECT * FROM tasks ORDER BY created_at DESC, id DESC",
      );
      return rows;
    },
    async create({ title, description }) {
      const { rows } = await db.query(
        "INSERT INTO tasks (title, description) VALUES ($1, $2) RETURNING *",
        [title, description],
      );
      return rows[0];
    },
    async updateStatus(id, status) {
      const { rows } = await db.query(
        "UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *",
        [status, id],
      );
      return rows[0];
    },
    async remove(id) {
      const { rowCount } = await db.query("DELETE FROM tasks WHERE id = $1", [
        id,
      ]);
      return rowCount > 0;
    },
  };
}
