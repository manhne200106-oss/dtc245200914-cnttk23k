const db = require('../db');

const taskModel = {
  async findAll({ projectId, status, priority, search } = {}) {
    let sql = `
      SELECT
        t.id,
        t.project_id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.assigned_to,
        t.created_at,
        t.updated_at,
        p.name AS project_name,
        u.full_name AS assignee_name,
        u.username AS assignee_username,
        COUNT(DISTINCT c.id)::int AS comment_count
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN comments c ON t.id = c.task_id
      WHERE 1=1
    `;
    const params = [];

    if (projectId) {
      params.push(projectId);
      sql += ` AND t.project_id = $${params.length}`;
    }

    if (status && status !== 'ALL') {
      params.push(status);
      sql += ` AND t.status = $${params.length}`;
    }

    if (priority && priority !== 'ALL') {
      params.push(priority);
      sql += ` AND t.priority = $${params.length}`;
    }

    if (search && search.trim() !== '') {
      params.push(`%${search.trim()}%`);
      sql += ` AND (t.title ILIKE $${params.length} OR t.description ILIKE $${params.length})`;
    }

    sql += `
      GROUP BY t.id, p.name, u.full_name, u.username
      ORDER BY
        CASE
          WHEN t.priority = 'HIGH' THEN 1
          WHEN t.priority = 'MEDIUM' THEN 2
          WHEN t.priority = 'LOW' THEN 3
          ELSE 4
        END,
        t.updated_at DESC;
    `;

    const { rows } = await db.query(sql, params);
    return rows;
  },

  async findById(id) {
    const sql = `
      SELECT
        t.id,
        t.project_id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.assigned_to,
        t.created_at,
        t.updated_at,
        p.name AS project_name,
        u.full_name AS assignee_name,
        u.email AS assignee_email,
        u.username AS assignee_username,
        COUNT(DISTINCT c.id)::int AS comment_count
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN comments c ON t.id = c.task_id
      WHERE t.id = $1
      GROUP BY t.id, p.name, u.full_name, u.email, u.username;
    `;
    const { rows } = await db.query(sql, [id]);
    return rows[0] || null;
  },

  async findByProjectId(projectId) {
    const sql = `
      SELECT
        t.id,
        t.project_id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.assigned_to,
        t.created_at,
        t.updated_at,
        u.full_name AS assignee_name,
        COUNT(DISTINCT c.id)::int AS comment_count
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN comments c ON t.id = c.task_id
      WHERE t.project_id = $1
      GROUP BY t.id, u.full_name
      ORDER BY
        CASE
          WHEN t.priority = 'HIGH' THEN 1
          WHEN t.priority = 'MEDIUM' THEN 2
          WHEN t.priority = 'LOW' THEN 3
          ELSE 4
        END,
        t.id ASC;
    `;
    const { rows } = await db.query(sql, [projectId]);
    return rows;
  },

  async create({ project_id, title, description, status, priority, assigned_to }) {
    const sql = `
      INSERT INTO tasks (project_id, title, description, status, priority, assigned_to)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, project_id, title, description, status, priority, assigned_to, created_at, updated_at;
    `;
    const { rows } = await db.query(sql, [
      project_id,
      title,
      description || '',
      status || 'TODO',
      priority || 'MEDIUM',
      assigned_to ? parseInt(assigned_to, 10) : null,
    ]);
    return rows[0];
  },

  async update(id, { title, description, status, priority, assigned_to, project_id }) {
    const sql = `
      UPDATE tasks
      SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        priority = COALESCE($4, priority),
        assigned_to = $5,
        project_id = COALESCE($6, project_id)
      WHERE id = $7
      RETURNING id, project_id, title, description, status, priority, assigned_to, updated_at;
    `;
    const { rows } = await db.query(sql, [
      title,
      description,
      status,
      priority,
      assigned_to ? parseInt(assigned_to, 10) : null,
      project_id ? parseInt(project_id, 10) : null,
      id,
    ]);
    return rows[0] || null;
  },

  async delete(id) {
    const sql = `
      DELETE FROM tasks
      WHERE id = $1
      RETURNING id, project_id;
    `;
    const { rows } = await db.query(sql, [id]);
    return rows[0] || null;
  },

  async count() {
    const sql = `SELECT COUNT(*)::int as count FROM tasks;`;
    const { rows } = await db.query(sql);
    return rows[0].count;
  },

  async countByStatus(status) {
    const sql = `SELECT COUNT(*)::int as count FROM tasks WHERE status = $1;`;
    const { rows } = await db.query(sql, [status]);
    return rows[0].count;
  }
};

module.exports = taskModel;
