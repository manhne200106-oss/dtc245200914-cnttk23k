const db = require('../db');

const projectModel = {
  async findAll({ status, search } = {}) {
    let sql = `
      SELECT
        p.id,
        p.name,
        p.description,
        p.status,
        p.created_at,
        p.updated_at,
        COUNT(DISTINCT pm.user_id)::int AS member_count,
        COUNT(DISTINCT t.id)::int AS task_count
      FROM projects p
      LEFT JOIN project_members pm ON p.id = pm.project_id
      LEFT JOIN tasks t ON p.id = t.project_id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'ALL') {
      params.push(status);
      sql += ` AND p.status = $${params.length}`;
    }

    if (search && search.trim() !== '') {
      params.push(`%${search.trim()}%`);
      sql += ` AND (p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`;
    }

    sql += `
      GROUP BY p.id
      ORDER BY p.updated_at DESC;
    `;

    const { rows } = await db.query(sql, params);
    return rows;
  },

  async findById(id) {
    const sql = `
      SELECT
        p.id,
        p.name,
        p.description,
        p.status,
        p.created_at,
        p.updated_at,
        COUNT(DISTINCT pm.user_id)::int AS member_count,
        COUNT(DISTINCT t.id)::int AS task_count
      FROM projects p
      LEFT JOIN project_members pm ON p.id = pm.project_id
      LEFT JOIN tasks t ON p.id = t.project_id
      WHERE p.id = $1
      GROUP BY p.id;
    `;
    const { rows } = await db.query(sql, [id]);
    return rows[0] || null;
  },

  async create({ name, description, status }) {
    const sql = `
      INSERT INTO projects (name, description, status)
      VALUES ($1, $2, $3)
      RETURNING id, name, description, status, created_at, updated_at;
    `;
    const { rows } = await db.query(sql, [name, description || '', status || 'PLANNING']);
    return rows[0];
  },

  async update(id, { name, description, status }) {
    const sql = `
      UPDATE projects
      SET name = $1, description = $2, status = $3
      WHERE id = $4
      RETURNING id, name, description, status, updated_at;
    `;
    const { rows } = await db.query(sql, [name, description || '', status, id]);
    return rows[0] || null;
  },

  async delete(id) {
    const sql = `
      DELETE FROM projects
      WHERE id = $1
      RETURNING id;
    `;
    const { rows } = await db.query(sql, [id]);
    return rows[0] || null;
  },

  async getRecent(limit = 5) {
    const sql = `
      SELECT
        p.id,
        p.name,
        p.description,
        p.status,
        p.created_at,
        p.updated_at,
        COUNT(DISTINCT pm.user_id)::int AS member_count,
        COUNT(DISTINCT t.id)::int AS task_count
      FROM projects p
      LEFT JOIN project_members pm ON p.id = pm.project_id
      LEFT JOIN tasks t ON p.id = t.project_id
      GROUP BY p.id
      ORDER BY p.updated_at DESC
      LIMIT $1;
    `;
    const { rows } = await db.query(sql, [limit]);
    return rows;
  },

  async count() {
    const sql = `SELECT COUNT(*)::int as count FROM projects;`;
    const { rows } = await db.query(sql);
    return rows[0].count;
  }
};

module.exports = projectModel;
