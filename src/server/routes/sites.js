import { randomUUID } from 'node:crypto';
import { validate as isValidUUID } from 'uuid';
import { db } from '../db/index.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

export const SITE_STATUSES = [
  'Belum mulai',
  'Survey',
  'Menunggu izin',
  'Siap eksekusi',
  'Eksekusi',
  'Selesai',
  'Dokumen/BAST',
  'Ditagih',
  'Dibayar',
];

const PROTECTED_MEMBER_STATUSES = new Set(['Ditagih', 'Dibayar']);
const ADMIN_FIELDS = new Set([
  'id', 'project_id', 'site_code', 'name', 'address', 'maps_url', 'site_type',
  'status', 'site_value', 'notes',
]);
const MEMBER_UPDATE_FIELDS = new Set(['status', 'notes']);
const ADMIN_COLUMNS = 'id, project_id, site_code, name, address, maps_url, site_type, status, site_value, notes, created_at, updated_at';
const MEMBER_SAFE_COLUMNS = 'id, project_id, site_code, name, address, maps_url, site_type, status, notes, created_at, updated_at';

function validMoney(value) {
  return value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0);
}

function validateSiteFields(body, { creating = false } = {}) {
  const unknown = Object.keys(body).find((field) => !ADMIN_FIELDS.has(field));
  if (unknown) return `Kolom site '${unknown}' tidak dikenali.`;
  if (creating && (!body.id || !isValidUUID(body.id))) return 'ID wajib berupa UUID valid.';
  if (creating && (!body.project_id || !isValidUUID(body.project_id))) return 'Project wajib dipilih.';
  if (creating && (typeof body.site_code !== 'string' || !body.site_code.trim())) return 'Kode site wajib diisi.';
  if (creating && (typeof body.name !== 'string' || !body.name.trim())) return 'Nama site wajib diisi.';
  if (creating && !['tower', 'rooftop'].includes(body.site_type)) return 'Tipe site harus tower atau rooftop.';

  if (body.project_id !== undefined && !isValidUUID(body.project_id)) return 'ID project tidak valid.';
  if (body.site_code !== undefined && (typeof body.site_code !== 'string' || !body.site_code.trim() || body.site_code.length > 100)) {
    return 'Kode site wajib diisi dan maksimal 100 karakter.';
  }
  if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 200)) {
    return 'Nama site wajib diisi dan maksimal 200 karakter.';
  }
  if (body.address !== undefined && body.address !== null && (typeof body.address !== 'string' || body.address.length > 2000)) {
    return 'Alamat maksimal 2000 karakter.';
  }
  if (body.maps_url !== undefined && body.maps_url !== null) {
    if (typeof body.maps_url !== 'string' || body.maps_url.length > 2048) return 'Link Google Maps tidak valid.';
    try {
      const url = new URL(body.maps_url);
      if (url.protocol !== 'https:' || !['maps.google.com', 'www.google.com', 'google.com', 'maps.app.goo.gl'].includes(url.hostname)) {
        return 'Link harus berupa URL Google Maps dengan HTTPS.';
      }
    } catch {
      return 'Link Google Maps tidak valid.';
    }
  }
  if (body.site_type !== undefined && !['tower', 'rooftop'].includes(body.site_type)) return 'Tipe site harus tower atau rooftop.';
  if (body.status !== undefined && !SITE_STATUSES.includes(body.status)) return 'Status site tidak valid.';
  if (body.site_value !== undefined && !validMoney(body.site_value)) return 'Nilai site harus berupa angka nol atau lebih.';
  if (body.notes !== undefined && body.notes !== null && typeof body.notes !== 'string') return 'Catatan harus berupa teks.';
  return null;
}

function getSite(id, role) {
  return db.prepare(`SELECT ${role === 'admin' ? ADMIN_COLUMNS : MEMBER_SAFE_COLUMNS} FROM sites WHERE id = ?`).get(id);
}

function recordStatusChange(siteId, fromStatus, toStatus, userId) {
  db.prepare(
    `INSERT INTO site_status_history (id, site_id, from_status, to_status, changed_by)
     VALUES (?, ?, ?, ?, ?)`
  ).run(randomUUID(), siteId, fromStatus, toStatus, userId);
}

export async function siteRoutes(app) {
  app.get('/', requireAuth(async (request, reply) => {
    const { project_id: projectId, status, q } = request.query || {};
    if (projectId && !isValidUUID(projectId)) return reply.code(400).send({ message: 'ID project tidak valid.' });
    if (status && !SITE_STATUSES.includes(status)) return reply.code(400).send({ message: 'Status site tidak valid.' });
    if (q !== undefined && (typeof q !== 'string' || q.length > 200)) return reply.code(400).send({ message: 'Pencarian maksimal 200 karakter.' });

    const conditions = [];
    const values = [];
    if (projectId) {
      conditions.push('project_id = ?');
      values.push(projectId);
    }
    if (status) {
      conditions.push('status = ?');
      values.push(status);
    }
    if (q) {
      conditions.push('(instr(lower(site_code), lower(?)) > 0 OR instr(lower(name), lower(?)) > 0)');
      values.push(q, q);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sites = db.prepare(
      `SELECT ${request.user.role === 'admin' ? ADMIN_COLUMNS : MEMBER_SAFE_COLUMNS}
       FROM sites ${where} ORDER BY created_at DESC`
    ).all(...values);
    return reply.code(200).send({ sites });
  }));

  app.get('/:id/history', requireAuth(async (request, reply) => {
    const { id } = request.params;
    if (!isValidUUID(id)) return reply.code(400).send({ message: 'ID site tidak valid.' });
    if (!db.prepare('SELECT id FROM sites WHERE id = ?').get(id)) {
      return reply.code(404).send({ message: 'Site tidak ditemukan.' });
    }
    const history = db.prepare(
      `SELECT h.id, h.site_id, h.from_status, h.to_status, h.changed_by, u.username, u.name AS changed_by_name, h.changed_at
       FROM site_status_history h
       INNER JOIN users u ON u.id = h.changed_by
       WHERE h.site_id = ?
       ORDER BY h.changed_at ASC, h.rowid ASC`
    ).all(id);
    return reply.code(200).send({ history });
  }));

  app.get('/:id', requireAuth(async (request, reply) => {
    const { id } = request.params;
    if (!isValidUUID(id)) return reply.code(400).send({ message: 'ID site tidak valid.' });
    const site = getSite(id, request.user.role);
    if (!site) return reply.code(404).send({ message: 'Site tidak ditemukan.' });
    return reply.code(200).send({ site });
  }));

  app.post('/', requireAdmin(async (request, reply) => {
    const body = request.body || {};
    const validationError = validateSiteFields(body, { creating: true });
    if (validationError) return reply.code(400).send({ message: validationError });
    if (!SITE_STATUSES.includes(body.status ?? 'Belum mulai')) return reply.code(400).send({ message: 'Status site tidak valid.' });
    if (!db.prepare('SELECT id FROM projects WHERE id = ?').get(body.project_id)) {
      return reply.code(404).send({ message: 'Project tidak ditemukan.' });
    }

    const existing = db.prepare('SELECT id FROM sites WHERE id = ?').get(body.id);
    if (existing) {
      return reply.code(200).send({ site: getSite(body.id, request.user.role), message: 'Site sudah pernah dibuat.' });
    }
    if (db.prepare('SELECT id FROM sites WHERE project_id = ? AND site_code = ?').get(body.project_id, body.site_code.trim())) {
      return reply.code(409).send({ message: 'Kode site sudah digunakan di project ini.' });
    }

    const status = body.status ?? 'Belum mulai';
    const createSite = db.transaction(() => {
      db.prepare(
        `INSERT INTO sites (id, project_id, site_code, name, address, maps_url, site_type, status, site_value, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        body.id, body.project_id, body.site_code.trim(), body.name.trim(),
        body.address ?? null, body.maps_url ?? null, body.site_type, status,
        body.site_value ?? null, body.notes ?? null,
      );
      recordStatusChange(body.id, null, status, request.user.id);
    });
    createSite();
    return reply.code(201).send({ site: getSite(body.id, request.user.role), message: 'Site berhasil dibuat.' });
  }));

  app.patch('/:id', requireAuth(async (request, reply) => {
    const { id } = request.params;
    const body = request.body || {};
    if (!isValidUUID(id)) return reply.code(400).send({ message: 'ID site tidak valid.' });
    const current = db.prepare('SELECT id, project_id, site_code, status FROM sites WHERE id = ?').get(id);
    if (!current) return reply.code(404).send({ message: 'Site tidak ditemukan.' });

    if (request.user.role !== 'admin') {
      const forbiddenField = Object.keys(body).find((field) => !MEMBER_UPDATE_FIELDS.has(field));
      if (forbiddenField) return reply.code(403).send({ message: 'Anggota hanya dapat mengubah status dan catatan site.' });
      if (PROTECTED_MEMBER_STATUSES.has(body.status)) {
        return reply.code(403).send({ message: 'Status Ditagih dan Dibayar hanya dapat diubah Admin.' });
      }
    }

    const validationError = validateSiteFields(body);
    if (validationError) return reply.code(400).send({ message: validationError });
    if (!Object.keys(body).length) return reply.code(400).send({ message: 'Tidak ada perubahan site.' });
    if (body.project_id && !db.prepare('SELECT id FROM projects WHERE id = ?').get(body.project_id)) {
      return reply.code(404).send({ message: 'Project tidak ditemukan.' });
    }

    if (body.project_id !== undefined || body.site_code !== undefined) {
      const nextProjectId = body.project_id ?? current.project_id;
      const nextCode = body.site_code?.trim() ?? current.site_code;
      const duplicate = db.prepare(
        'SELECT id FROM sites WHERE project_id = ? AND site_code = ? AND id != ?'
      ).get(nextProjectId, nextCode, id);
      if (duplicate) return reply.code(409).send({ message: 'Kode site sudah digunakan di project ini.' });
    }

    const fields = Object.keys(body);
    const assignments = fields.map((field) => `${field} = ?`);
    const values = fields.map((field) => ['site_code', 'name'].includes(field) ? body[field].trim() : body[field]);
    assignments.push("updated_at = datetime('now')");
    values.push(id);

    const updateSite = db.transaction(() => {
      db.prepare(`UPDATE sites SET ${assignments.join(', ')} WHERE id = ?`).run(...values);
      if (body.status !== undefined && body.status !== current.status) {
        recordStatusChange(id, current.status, body.status, request.user.id);
      }
    });
    updateSite();
    return reply.code(200).send({ site: getSite(id, request.user.role), message: 'Site berhasil diperbarui.' });
  }));

  app.delete('/:id', requireAdmin(async (request, reply) => {
    const { id } = request.params;
    if (!isValidUUID(id)) return reply.code(400).send({ message: 'ID site tidak valid.' });
    const result = db.prepare('DELETE FROM sites WHERE id = ?').run(id);
    if (!result.changes) return reply.code(404).send({ message: 'Site tidak ditemukan.' });
    return reply.code(200).send({ message: 'Site berhasil dihapus.' });
  }));
}
