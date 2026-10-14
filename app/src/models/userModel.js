const db = require('../db');
const bcrypt = require('bcryptjs');

const userModel = {
  async findAll() {
    const sql = `
      SELECT id, username, email, full_name, role, created_at, updated_at
      FROM users
      ORDER BY id ASC;
    `;
    const { rows } = await db.query(sql);
    return rows;
  },

  async findById(id) {
    const sql = `
      SELECT id, username, email, full_name, role, created_at, updated_at
      FROM users
      WHERE id = $1;
    `;
    const { rows } = await db.query(sql, [id]);
    return rows[0] || null;
  },

  async findByUsername(username) {
    const sql = `
      SELECT * FROM users
      WHERE username = $1;
    `;
    const { rows } = await db.query(sql, [username]);
    return rows[0] || null;
  },

  async findByEmail(email) {
    const sql = `
      SELECT * FROM users
      WHERE email = $1;
    `;
    const { rows } = await db.query(sql, [email]);
    return rows[0] || null;
  },

  async create({ username, email, password, full_name, role }) {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const sql = `
      INSERT INTO users (username, email, password_hash, full_name, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, email, full_name, role, created_at;
    `;
    const { rows } = await db.query(sql, [username, email, password_hash, full_name, role || 'Developer']);
    return rows[0];
  },

  async update(id, { full_name, email, role, password }) {
    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);
      const sql = `
        UPDATE users
        SET full_name = $1, email = $2, role = $3, password_hash = $4
        WHERE id = $5
        RETURNING id, username, email, full_name, role, updated_at;
      `;
      const { rows } = await db.query(sql, [full_name, email, role, password_hash, id]);
      return rows[0] || null;
    } else {
      const sql = `
        UPDATE users
        SET full_name = $1, email = $2, role = $3
        WHERE id = $4
        RETURNING id, username, email, full_name, role, updated_at;
      `;
      const { rows } = await db.query(sql, [full_name, email, role, id]);
      return rows[0] || null;
    }
  },

  async delete(id) {
    const sql = `
      DELETE FROM users
      WHERE id = $1
      RETURNING id;
    `;
    const { rows } = await db.query(sql, [id]);
    return rows[0] || null;
  },

  async count() {
    const sql = `SELECT COUNT(*)::int as count FROM users;`;
    const { rows } = await db.query(sql);
    return rows[0].count;
  }
};

module.exports = userModel;
