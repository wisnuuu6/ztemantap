import { validate as isValidUUID } from 'uuid';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

export async function projectRoutes(app) {
  app.get('/', requireAuth(async (request, reply) => {
    const rows = db.prepare(
      `SELECT id, name, provider, start_date, target_date, status, notes, created_by, created_at, updated_at
       FROM projects
       ORDER BY created_at DESC`
    ).all();

    if (request.user.role !== 'admin') {
      return reply.code(200).send({
        projects: rows.map(({ contract_value, ...rest }) => rest),
      });
    }

    return reply.code(200).send({ projects: rows });
  }));

  app.get('/:id', requireAuth(async (request, reply) => {
    const { id } = request.params;

    if (!isValidUUID(id)) {
      return reply.code(400).send({ message: 'ID project tidak valid.' });
    }

    const project = db
      .prepare(
        `SELECT id, name, provider, contract_value, start_date, target_date, status, notes, created_by, created_at, updated_at
         FROM projects
         WHERE id = ?`
      )
      .get(id);

    if (!project) {
      return reply.code(404).send({ message: 'Project tidak ditemukan.' });
    }

    if (request.user.role !== 'admin') {
      const safeProject = { ...project };
      delete safeProject.contract_value;
      return reply.code(200).send({ project: safeProject });
    }

    return reply.code(200).send({ project });
  }));
}
