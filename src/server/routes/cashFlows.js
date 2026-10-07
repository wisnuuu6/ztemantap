import { validate as isValidUUID } from 'uuid';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

export async function cashFlowRoutes(app) {
  app.get('/', requireAuth(async (request, reply) => {
    const rows = db
      .prepare(
        `SELECT cf.id, cf.project_id, cf.transaction_date, cf.type, cf.category_id, cf.amount, cf.description, cf.created_by, cf.attachment_path, cf.created_at, cf.updated_at
         FROM cash_flows cf
         ${request.user.role === 'admin' ? '' : 'WHERE cf.created_by = ?'}
         ORDER BY cf.transaction_date DESC`
      )
      .all(request.user.role === 'admin' ? [] : [request.user.id]);

    return reply.code(200).send({ cashFlows: rows });
  }));

  app.post('/', requireAuth(async (request, reply) => {
    const body = request.body || {};
    const { id, project_id, transaction_date, type, category_id, amount, description, attachment_path } = body;

    if (!id || !isValidUUID(id)) {
      return reply.code(400).send({ message: 'ID wajib berformat UUID valid.' });
    }

    if (!transaction_date || !type || !category_id || !amount) {
      return reply.code(400).send({ message: 'transaction_date, type, category_id, dan amount wajib diisi.' });
    }

    if (type !== 'income' && type !== 'expense') {
      return reply.code(400).send({ message: 'Tipe transaksi hanya income atau expense.' });
    }

    if (request.user.role !== 'admin' && request.user.id !== body.created_by) {
      return reply.code(403).send({ message: 'Anggota hanya dapat melihat atau menambah pengeluaran miliknya sendiri.' });
    }

    if (project_id && !isValidUUID(project_id)) {
      return reply.code(400).send({ message: 'project_id tidak valid.' });
    }

    db.prepare(
      `INSERT INTO cash_flows (id, project_id, transaction_date, type, category_id, amount, description, created_by, attachment_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      project_id || null,
      transaction_date,
      type,
      category_id,
      Number(amount),
      description || null,
      request.user.id,
      attachment_path || null
    );

    return reply.code(201).send({ message: 'Transaksi berhasil dibuat.' });
  }));
}
