import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const testDirectory = mkdtempSync(join(tmpdir(), 'tim-bts-auth-'));
process.env.DB_PATH = join(testDirectory, 'test.db');
process.env.NODE_ENV = 'production';
process.env.TRUST_PROXY = '127.0.0.1,::1';

const [{ buildApp }, { db }, { hashPassword, verifyPassword }] = await Promise.all([
  import('../src/server/app.js'),
  import('../src/server/db/index.js'),
  import('../src/server/utils/password.js'),
]);

test('Module 1 enforces authentication, roles, sessions, and login errors', async (t) => {
  const app = await buildApp();
  t.after(async () => {
    await app.close();
    db.close();
    rmSync(testDirectory, { recursive: true, force: true });
  });

  const adminId = randomUUID();
  const adminPassword = 'StrongPassword123!';
  db.prepare(
    `INSERT INTO users (id, username, name, role, password_hash, is_active)
     VALUES (?, ?, ?, 'admin', ?, 1)`
  ).run(adminId, 'admin_test', 'Admin Test', hashPassword(adminPassword));

  const wrongPassword = await app.inject({
    method: 'POST',
    url: '/login',
    payload: { username: 'admin_test', password: 'wrong-password' },
  });
  const unknownUsername = await app.inject({
    method: 'POST',
    url: '/login',
    payload: { username: 'not_a_user', password: 'wrong-password' },
  });

  assert.equal(wrongPassword.statusCode, 401);
  assert.equal(unknownUsername.statusCode, 401);
  assert.deepEqual(wrongPassword.json(), unknownUsername.json());
  assert.match(wrongPassword.json().message, /Username atau password salah/);

  const removedBootstrapEndpoint = await app.inject({
    method: 'POST',
    url: '/seed-admin',
    payload: { id: randomUUID(), username: 'unwanted', password: adminPassword, name: 'Nope' },
  });
  assert.equal(removedBootstrapEndpoint.statusCode, 404);

  const adminLogin = await app.inject({
    method: 'POST',
    url: '/login',
    payload: { username: 'admin_test', password: adminPassword },
  });
  assert.equal(adminLogin.statusCode, 200);
  assert.match(adminLogin.headers['set-cookie'], /HttpOnly/i);
  assert.match(adminLogin.headers['set-cookie'], /SameSite=Lax/i);
  assert.match(adminLogin.headers['set-cookie'], /Secure/i);
  const adminCookie = adminLogin.headers['set-cookie'].split(';')[0];

  const memberId = randomUUID();
  const memberCreate = await app.inject({
    method: 'POST',
    url: '/api/users',
    headers: { cookie: adminCookie },
    payload: {
      id: memberId,
      username: 'member_test',
      name: 'Member Test',
      role: 'member',
      password: 'MemberPass123',
    },
  });
  assert.equal(memberCreate.statusCode, 201);

  const memberLogin = await app.inject({
    method: 'POST',
    url: '/login',
    payload: { username: 'member_test', password: 'MemberPass123' },
  });
  assert.equal(memberLogin.statusCode, 200);
  const memberCookie = memberLogin.headers['set-cookie'].split(';')[0];

  const createDenied = await app.inject({
    method: 'POST',
    url: '/api/users',
    headers: { cookie: memberCookie },
    payload: {
      id: randomUUID(),
      username: 'member_created',
      name: 'Unauthorized',
      role: 'member',
      password: 'MemberPass123',
    },
  });
  const changeDenied = await app.inject({
    method: 'PATCH',
    url: `/api/users/${memberId}`,
    headers: { cookie: memberCookie },
    payload: { name: 'Changed by member' },
  });
  const deactivateDenied = await app.inject({
    method: 'PATCH',
    url: `/api/users/${memberId}`,
    headers: { cookie: memberCookie },
    payload: { is_active: false },
  });
  assert.equal(createDenied.statusCode, 403);
  assert.equal(changeDenied.statusCode, 403);
  assert.equal(deactivateDenied.statusCode, 403);

  const deactivateMember = await app.inject({
    method: 'PATCH',
    url: `/api/users/${memberId}`,
    headers: { cookie: adminCookie },
    payload: { is_active: false },
  });
  assert.equal(deactivateMember.statusCode, 200);

  const inactiveSession = await app.inject({
    method: 'GET',
    url: '/me',
    headers: { cookie: memberCookie },
  });
  assert.equal(inactiveSession.statusCode, 401);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM sessions WHERE user_id = ?').get(memberId).count, 0);

  const changeAdminPassword = await app.inject({
    method: 'PATCH',
    url: `/api/users/${adminId}`,
    headers: { cookie: adminCookie },
    payload: { password: 'NewAdminPass123!' },
  });
  assert.equal(changeAdminPassword.statusCode, 200);
  assert.equal((await app.inject({ method: 'GET', url: '/me', headers: { cookie: adminCookie } })).statusCode, 401);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM sessions WHERE user_id = ?').get(adminId).count, 0);

  const newPasswordLogin = await app.inject({
    method: 'POST',
    url: '/login',
    payload: { username: 'admin_test', password: 'NewAdminPass123!' },
  });
  assert.equal(newPasswordLogin.statusCode, 200);

  assert.equal(verifyPassword('NewAdminPass123!', db.prepare('SELECT password_hash FROM users WHERE id = ?').get(adminId).password_hash), true);

  const perUsernameAttempts = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    perUsernameAttempts.push(await app.inject({
      method: 'POST',
      url: '/login',
      remoteAddress: '127.0.0.1',
      headers: { 'x-forwarded-for': `198.51.100.${attempt + 1}` },
      payload: { username: 'rate_username_test', password: 'wrong-password' },
    }));
  }
  assert.deepEqual(perUsernameAttempts.slice(0, 5).map((response) => response.statusCode), [401, 401, 401, 401, 401]);
  assert.equal(perUsernameAttempts[5].statusCode, 429);

  const perIpAttempts = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    perIpAttempts.push(await app.inject({
      method: 'POST',
      url: '/login',
      remoteAddress: '127.0.0.1',
      headers: { 'x-forwarded-for': '198.51.100.77' },
      payload: { username: `rate_ip_test_${attempt}`, password: 'wrong-password' },
    }));
  }
  assert.deepEqual(perIpAttempts.slice(0, 5).map((response) => response.statusCode), [401, 401, 401, 401, 401]);
  assert.equal(perIpAttempts[5].statusCode, 429);
});
