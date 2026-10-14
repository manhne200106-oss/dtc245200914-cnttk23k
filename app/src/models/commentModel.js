const db = require('../db');

const commentModel = {
  async findByTaskId(taskId) {
    const sql = `
      SELECT
        c.id,
        c.task_id,
        c.user_id,
        c.content,
        c.created_at,
        u.username,
        u.full_name,
        u.role
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.task_id = $1
      ORDER BY c.created_at ASC;
    `;
    const { rows } = await db.query(sql, [taskId]);
    return rows;
  },

  async create({ task_id, user_id, content }) {
    const sql = `
      INSERT INTO comments (task_id, user_id, content)
      VALUES ($1, $2, $3)
      RETURNING id, task_id, user_id, content, created_at;
    `;
    const { rows } = await db.query(sql, [
      task_id,
      user_id ? parseInt(user_id, 10) : null,
      content,
    ]);
    return rows[0];
  },

  async delete(id) {
    const sql = `
      DELETE FROM comments
      WHERE id = $1
      RETURNING id, task_id;
    `;
    const { rows } = await db.query(sql, [id]);
    return rows[0] || null;
  }
};

module.exports = commentModel;
