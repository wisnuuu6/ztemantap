import { createHash } from 'node:crypto';
import { db } from '../db/index.js';

export function getSessionTokenFromRequest(request) {
  if (request.cookies?.session) {
    return request.cookies.session;
  }

  const rawCookie = request.headers.cookie || '';
  const match = rawCookie.split(';').find((cookie) => cookie.trim().startsWith('session='));
  return match ? decodeURIComponent(match.trim().split('=')[1]) : null;
}

export function requireAuth(handler) {
  return async function wrapped(request, reply) {
    const token = getSessionTokenFromRequest(request);
    if (!token) {
      return reply.code(401).send({ message: 'Sesi tidak valid atau sudah kedaluwarsa.' });
    }

    const session = db
      .prepare(
        `SELECT s.id, s.user_id, s.token_hash, s.expires_at, u.username, u.name, u.role
         FROM sessions s
         INNER JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ? AND julianday(s.expires_at) > julianday('now') AND u.is_active = 1`
      )
      .get(createHash('sha256').update(token).digest('hex'));

    if (!session) {
      return reply.code(401).send({ message: 'Sesi tidak valid atau sudah kedaluwarsa.' });
    }

    request.user = {
      id: session.user_id,
      username: session.username,
      name: session.name,
      role: session.role,
    };

    return handler.call(this, request, reply);
  };
}

export function requireAdmin(handler) {
  return requireAuth(async function wrapped(request, reply) {
    if (request.user.role !== 'admin') {
      return reply.code(403).send({ message: 'Akses dilarang untuk role anggota.' });
    }

    return handler.call(this, request, reply);
  });
}
