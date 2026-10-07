import { createHash, randomBytes } from 'node:crypto';
import { db } from '../db/index.js';
import { config } from '../config.js';
import { verifyPassword } from '../utils/password.js';
import { requireAuth } from '../middleware/auth.js';

const USERNAME_LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 60_000;
const usernameAttempts = new Map();

function isUsernameRateLimited(username) {
  const key = username.trim().toLowerCase();
  const now = Date.now();
  const attempt = usernameAttempts.get(key);

  if (!attempt || now - attempt.startedAt >= LOGIN_WINDOW_MS) {
    if (usernameAttempts.size >= 10_000) {
      for (const [existingKey, existingAttempt] of usernameAttempts) {
        if (now - existingAttempt.startedAt >= LOGIN_WINDOW_MS) {
          usernameAttempts.delete(existingKey);
        }
      }
      if (usernameAttempts.size >= 10_000) {
        usernameAttempts.delete(usernameAttempts.keys().next().value);
      }
    }
    usernameAttempts.set(key, { startedAt: now, count: 1 });
    return false;
  }

  attempt.count += 1;
  return attempt.count > USERNAME_LOGIN_LIMIT;
}

export async function authRoutes(app) {
  app.post('/login', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    preHandler: async (request, reply) => {
      const username = request.body?.username;
      if (typeof username === 'string' && isUsernameRateLimited(username)) {
        return reply.code(429).send({ message: 'Terlalu banyak percobaan login. Coba lagi nanti.' });
      }
    },
  }, async (request, reply) => {
    const { username, password } = request.body || {};

    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
      return reply.code(400).send({ message: 'username dan password wajib diisi.' });
    }

    const user = db
      .prepare(
        `SELECT id, username, name, role, password_hash, is_active
         FROM users
         WHERE username = ?`
      )
      .get(username.trim());

    if (!user || !verifyPassword(password, user.password_hash) || !user.is_active) {
      return reply.code(401).send({ message: 'Username atau password salah.' });
    }

    const sessionId = randomBytes(32).toString('hex');
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + config.cookieMaxAgeSeconds * 1000).toISOString();

    db.prepare(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at)
       VALUES (?, ?, ?, ?)`
    ).run(sessionId, user.id, tokenHash, expiresAt);

    reply.setCookie('session', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: config.isProduction,
      maxAge: config.cookieMaxAgeSeconds,
    });

    return reply.code(200).send({
      message: 'Login berhasil.',
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });
  });

  app.post('/logout', requireAuth(async (request, reply) => {
    const sessionToken = request.cookies?.session;

    if (sessionToken) {
      const tokenHash = createHash('sha256').update(sessionToken).digest('hex');
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    }

    reply.clearCookie('session', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: config.isProduction,
    });
    return reply.code(200).send({ message: 'Berhasil logout.' });
  }));

  app.get('/me', requireAuth(async (request, reply) => {
    return reply.code(200).send({
      user: {
        id: request.user.id,
        username: request.user.username,
        name: request.user.name,
        role: request.user.role,
      },
    });
  }));
}
