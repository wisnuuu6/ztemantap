import { validate as isValidUUID } from 'uuid';
import { db } from '../db/index.js';
import { hashPassword } from '../utils/password.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

export async function userRoutes(app) {
  app.get('/', requireAuth(async (request, reply) => {
    const isAdmin = request.user.role === 'admin';
    const rows = isAdmin
      ? db.prepare(
          `SELECT id, username, name, role, phone, emergency_contact, is_active, created_at, updated_at
           FROM users
           ORDER BY created_at DESC`
        ).all()
      : db.prepare(
          `SELECT id, username, name, role, phone, emergency_contact, is_active, created_at, updated_at
           FROM users
           WHERE id = ?
           ORDER BY created_at DESC`
        ).all(request.user.id);

    return reply.code(200).send({ users: rows });
  }));

  app.get('/:id', requireAuth(async (request, reply) => {
    const { id } = request.params;

    if (!isValidUUID(id)) {
      return reply.code(400).send({ message: 'ID tidak valid.' });
    }

    const user = db
      .prepare(
        `SELECT id, username, name, role, phone, emergency_contact, is_active, created_at, updated_at
         FROM users
         WHERE id = ?`
      )
      .get(id);

    if (!user) {
      return reply.code(404).send({ message: 'User tidak ditemukan.' });
    }

    if (request.user.role !== 'admin' && user.id !== request.user.id) {
      return reply.code(403).send({ message: 'Anda tidak berhak melihat profil user lain.' });
    }

    return reply.code(200).send({ user });
  }));

  app.post('/', requireAdmin(async (request, reply) => {
    const body = request.body || {};
    const { id, username, name, role, phone, emergency_contact, password } = body;

    if (!id || !isValidUUID(id)) {
      return reply.code(400).send({ message: 'ID wajib berformat UUID valid.' });
    }

    if (!username || !name || !password) {
      return reply.code(400).send({ message: 'username, name, dan password wajib diisi.' });
    }

    if (typeof username !== 'string' || username.trim().length < 3) {
      return reply.code(400).send({ message: 'username minimal 3 karakter.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
    if (existing) {
      return reply.code(409).send({ message: 'Username sudah digunakan.' });
    }

    const insert = db.prepare(
      `INSERT INTO users (id, username, name, role, phone, emergency_contact, password_hash, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
    );

    insert.run(
      id,
      username.trim(),
      name.trim(),
      role === 'admin' ? 'admin' : 'member',
      phone || null,
      emergency_contact || null,
      hashPassword(password)
    );

    const created = db
      .prepare(
        `SELECT id, username, name, role, phone, emergency_contact, is_active, created_at, updated_at
         FROM users
         WHERE id = ?`
      )
      .get(id);

    return reply.code(201).send({ user: created, message: 'User berhasil dibuat.' });
  }));

  app.patch('/:id', requireAdmin(async (request, reply) => {
    const { id } = request.params;
    const body = request.body || {};

    if (!isValidUUID(id)) {
      return reply.code(400).send({ message: 'ID tidak valid.' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!existingUser) {
      return reply.code(404).send({ message: 'User tidak ditemukan.' });
    }

    const allowedFields = ['username', 'name', 'role', 'phone', 'emergency_contact', 'password', 'is_active'];
    if (!allowedFields.some((field) => Object.hasOwn(body, field))) {
      return reply.code(400).send({ message: 'Tidak ada perubahan user yang dikirim.' });
    }

    if (body.username !== undefined && (typeof body.username !== 'string' || body.username.trim().length < 3)) {
      return reply.code(400).send({ message: 'username minimal 3 karakter.' });
    }

    if (body.role !== undefined && !['admin', 'member'].includes(body.role)) {
      return reply.code(400).send({ message: 'role harus admin atau member.' });
    }

    if (body.is_active !== undefined && ![true, false, 0, 1].includes(body.is_active)) {
      return reply.code(400).send({ message: 'is_active harus bernilai boolean.' });
    }

    if (body.password !== undefined && (typeof body.password !== 'string' || body.password.length < 8)) {
      return reply.code(400).send({ message: 'Password minimal 8 karakter.' });
    }

    if (body.username !== undefined) {
      const duplicate = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?')
        .get(body.username.trim(), id);
      if (duplicate) {
        return reply.code(409).send({ message: 'Username sudah digunakan.' });
      }
    }

    const updates = [];
    const values = [];
    for (const field of ['username', 'name', 'role', 'phone', 'emergency_contact']) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(field === 'username' ? body[field].trim() : body[field]);
      }
    }
    if (body.password !== undefined) {
      updates.push('password_hash = ?');
      values.push(hashPassword(body.password));
    }
    if (body.is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(body.is_active === true || body.is_active === 1 ? 1 : 0);
    }
    updates.push("updated_at = datetime('now')");
    values.push(id);

    const updateUser = db.transaction(() => {
      db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
      if (body.password !== undefined || body.is_active === false || body.is_active === 0) {
        db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
      }
    });
    updateUser();

    const updated = db.prepare(
      `SELECT id, username, name, role, phone, emergency_contact, is_active, created_at, updated_at
       FROM users WHERE id = ?`
    ).get(id);

    return reply.code(200).send({ user: updated, message: 'User berhasil diperbarui.' });
  }));
}
