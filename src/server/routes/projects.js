import { validate as isValidUUID } from 'uuid';
import { db } from '../db/index.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const ADMIN_FIELDS = new Set([
  'id', 'name', 'provider', 'contract_value', 'start_date', 'target_date', 'status', 'notes',
]);
const MEMBER_SAFE_COLUMNS = 'id, name, provider, start_date, target_date, status, notes, created_by, created_at, updated_at';
const ADMIN_COLUMNS = 'id, name, provider, contract_value, start_date, target_date, status, notes, created_by, created_at, updated_at';

function validDate(value) {
  return value === null || (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  );
}

function validateProjectFields(body, { creating = false } = {}) {
  const unknown = Object.keys(body).find((field) => !ADMIN_FIELDS.has(field));
  if (unknown) return `Kolom project '${unknown}' tidak dikenali.`;
  if (creating && (!body.id || !isValidUUID(body.id))) return 'ID wajib berupa UUID valid.';
  if (creating && (typeof body.name !== 'string' || !body.name.trim())) return 'Nama project wajib diisi.';
  if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) return 'Nama project wajib diisi.';
  if (body.name?.length > 200) return 'Nama project maksimal 200 karakter.';
  if (body.provider !== undefined && body.provider !== null && (typeof body.provider !== 'string' || body.provider.length > 120)) {
    return 'Provider maksimal 120 karakter.';
  }
  if (body.contract_value !== undefined && body.contract_value !== null &&
      (typeof body.contract_value !== 'number' || !Number.isFinite(body.contract_value) || body.contract_value < 0)) {
    return 'Nilai kontrak harus berupa angka nol atau lebih.';
  }
  for (const field of ['start_date', 'target_date']) {
    if (body[field] !== undefined && !validDate(body[field])) return `${field} harus berformat YYYY-MM-DD.`;
  }
  if (body.status !== undefined && (typeof body.status !== 'string' || !body.status.trim() || body.status.length > 40)) {
    return 'Status project wajib diisi dan maksimal 40 karakter.';
  }
  if (body.notes !== undefined && body.notes !== null && typeof body.notes !== 'string') return 'Catatan harus berupa teks.';
  return null;
}

function getProject(id, role) {
  return db.prepare(`SELECT ${role === 'admin' ? ADMIN_COLUMNS : MEMBER_SAFE_COLUMNS} FROM projects WHERE id = ?`).get(id);
}

export async function projectRoutes(app) {
  app.get('/', requireAuth(async (request, reply) => {
    const projects = db.prepare(
      `SELECT ${request.user.role === 'admin' ? ADMIN_COLUMNS : MEMBER_SAFE_COLUMNS}
       FROM projects ORDER BY created_at DESC`
    ).all();
    return reply.code(200).send({ projects });
  }));

  app.get('/:id', requireAuth(async (request, reply) => {
    const { id } = request.params;
    if (!isValidUUID(id)) return reply.code(400).send({ message: 'ID project tidak valid.' });

    const project = getProject(id, request.user.role);
    if (!project) return reply.code(404).send({ message: 'Project tidak ditemukan.' });
    return reply.code(200).send({ project });
  }));

  app.post('/', requireAdmin(async (request, reply) => {
    const body = request.body || {};
    const validationError = validateProjectFields(body, { creating: true });
    if (validationError) return reply.code(400).send({ message: validationError });

    const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(body.id);
    if (existing) {
      return reply.code(200).send({ project: getProject(body.id, request.user.role), message: 'Project sudah pernah dibuat.' });
    }

    db.prepare(
      `INSERT INTO projects (id, name, provider, contract_value, start_date, target_date, status, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      body.id, body.name.trim(), body.provider ?? null, body.contract_value ?? null,
      body.start_date ?? null, body.target_date ?? null, body.status ?? 'Aktif',
      body.notes ?? null, request.user.id,
    );
    return reply.code(201).send({ project: getProject(body.id, request.user.role), message: 'Project berhasil dibuat.' });
  }));

  app.patch('/:id', requireAdmin(async (request, reply) => {
    const { id } = request.params;
    const body = request.body || {};
    if (!isValidUUID(id)) return reply.code(400).send({ message: 'ID project tidak valid.' });
    const validationError = validateProjectFields(body);
    if (validationError) return reply.code(400).send({ message: validationError });
    if (!Object.keys(body).length) return reply.code(400).send({ message: 'Tidak ada perubahan project.' });
    if (!db.prepare('SELECT id FROM projects WHERE id = ?').get(id)) {
      return reply.code(404).send({ message: 'Project tidak ditemukan.' });
    }

    const updates = Object.keys(body);
    const assignments = updates.map((field) => `${field} = ?`);
    const values = updates.map((field) => field === 'name' ? body[field].trim() : body[field]);
    assignments.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE projects SET ${assignments.join(', ')} WHERE id = ?`).run(...values);
    return reply.code(200).send({ project: getProject(id, request.user.role), message: 'Project berhasil diperbarui.' });
  }));

  app.delete('/:id', requireAdmin(async (request, reply) => {
    const { id } = request.params;
    if (!isValidUUID(id)) return reply.code(400).send({ message: 'ID project tidak valid.' });
    const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    if (!result.changes) return reply.code(404).send({ message: 'Project tidak ditemukan.' });
    return reply.code(200).send({ message: 'Project berhasil dihapus.' });
  }));
}
