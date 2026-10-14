const db = require('../db');

const memberModel = {
  async findByProjectId(projectId) {
    const sql = `
      SELECT
        pm.id,
        pm.project_id,
        pm.user_id,
        pm.role,
        pm.joined_at,
        u.username,
        u.full_name,
        u.email,
        u.role AS user_global_role
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = $1
      ORDER BY pm.joined_at ASC;
    `;
    const { rows } = await db.query(sql, [projectId]);
    return rows;
  },

  async add(projectId, userId, role = 'Member') {
    const sql = `
      INSERT INTO project_members (project_id, user_id, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (project_id, user_id)
      DO UPDATE SET role = EXCLUDED.role
      RETURNING id, project_id, user_id, role, joined_at;
    `;
    const { rows } = await db.query(sql, [projectId, userId, role]);
    return rows[0];
  },

  async remove(projectId, userId) {
    const sql = `
      DELETE FROM project_members
      WHERE project_id = $1 AND user_id = $2
      RETURNING id;
    `;
    const { rows } = await db.query(sql, [projectId, userId]);
    return rows[0] || null;
  },

  async findNonMembers(projectId) {
    const sql = `
      SELECT u.id, u.username, u.full_name, u.email, u.role
      FROM users u
      WHERE u.id NOT IN (
        SELECT user_id FROM project_members WHERE project_id = $1
      )
      ORDER BY u.full_name ASC;
    `;
    const { rows } = await db.query(sql, [projectId]);
    return rows;
  }
};

module.exports = memberModel;
