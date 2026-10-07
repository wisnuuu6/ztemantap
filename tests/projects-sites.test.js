import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const testDirectory = mkdtempSync(join(tmpdir(), 'tim-bts-project-sites-'));
process.env.DB_PATH = join(testDirectory, 'test.db');
process.env.NODE_ENV = 'production';
process.env.TRUST_PROXY = '127.0.0.1,::1';

const [{ buildApp }, { db }, { hashPassword }] = await Promise.all([
  import('../src/server/app.js'),
  import('../src/server/db/index.js'),
  import('../src/server/utils/password.js'),
]);

test('Module 2 provides project/site CRUD, member permissions, filters, and status history', async (t) => {
  const app = await buildApp();
  t.after(async () => {
    await app.close();
    db.close();
    rmSync(testDirectory, { recursive: true, force: true });
  });

  const adminId = randomUUID();
  const memberId = randomUUID();
  db.prepare(
    `INSERT INTO users (id, username, name, role, password_hash, is_active)
     VALUES (?, ?, ?, 'admin', ?, 1), (?, ?, ?, 'member', ?, 1)`
  ).run(
    adminId, 'module2_admin', 'Admin Modul 2', hashPassword('AdminPassword123!'),
    memberId, 'module2_member', 'Anggota Modul 2', hashPassword('MemberPassword123!'),
  );

  const adminLogin = await app.inject({
    method: 'POST', url: '/login',
    payload: { username: 'module2_admin', password: 'AdminPassword123!' },
  });
  const memberLogin = await app.inject({
    method: 'POST', url: '/login',
    payload: { username: 'module2_member', password: 'MemberPassword123!' },
  });
  assert.equal(adminLogin.statusCode, 200);
  assert.equal(memberLogin.statusCode, 200);
  const adminCookie = adminLogin.headers['set-cookie'].split(';')[0];
  const memberCookie = memberLogin.headers['set-cookie'].split(';')[0];

  const projectId = randomUUID();
  const projectPayload = {
    id: projectId,
    name: 'Swap MW ZTE',
    provider: 'Indosat',
    contract_value: 125000000,
    start_date: '2026-01-01',
    target_date: '2026-06-30',
    status: 'Aktif',
    notes: 'Project tes',
  };
  const projectCreate = await app.inject({
    method: 'POST', url: '/api/projects', headers: { cookie: adminCookie }, payload: projectPayload,
  });
  assert.equal(projectCreate.statusCode, 201);
  assert.equal(projectCreate.json().project.contract_value, 125000000);

  const projectUpdate = await app.inject({
    method: 'PATCH', url: `/api/projects/${projectId}`, headers: { cookie: adminCookie },
    payload: { name: 'Swap MW ZTE Updated', contract_value: 130000000 },
  });
  assert.equal(projectUpdate.statusCode, 200);
  assert.equal(projectUpdate.json().project.name, 'Swap MW ZTE Updated');

  const siteId = randomUUID();
  const sitePayload = {
    id: siteId,
    project_id: projectId,
    site_code: 'ABC-001',
    name: 'Roof Jakarta',
    address: 'Jakarta',
    maps_url: 'https://maps.google.com/?q=Jakarta',
    site_type: 'rooftop',
    status: 'Belum mulai',
    site_value: 2500000,
    notes: 'Catatan awal',
  };
  const siteCreate = await app.inject({
    method: 'POST', url: '/api/sites', headers: { cookie: adminCookie }, payload: sitePayload,
  });
  assert.equal(siteCreate.statusCode, 201);
  assert.equal(siteCreate.json().site.site_value, 2500000);

  const repeatedSiteCreate = await app.inject({
    method: 'POST', url: '/api/sites', headers: { cookie: adminCookie }, payload: sitePayload,
  });
  assert.equal(repeatedSiteCreate.statusCode, 200);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM sites WHERE id = ?').get(siteId).count, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM site_status_history WHERE site_id = ?').get(siteId).count, 1);

  const siteUpdate = await app.inject({
    method: 'PATCH', url: `/api/sites/${siteId}`, headers: { cookie: adminCookie },
    payload: { name: 'Roof Jakarta Updated', site_value: 3000000 },
  });
  assert.equal(siteUpdate.statusCode, 200);
  assert.equal(siteUpdate.json().site.name, 'Roof Jakarta Updated');
  assert.equal(siteUpdate.json().site.site_value, 3000000);

  const memberProjectList = await app.inject({
    method: 'GET', url: '/api/projects', headers: { cookie: memberCookie },
  });
  const memberProjectDetail = await app.inject({
    method: 'GET', url: `/api/projects/${projectId}`, headers: { cookie: memberCookie },
  });
  const memberSitesList = await app.inject({
    method: 'GET', url: `/api/sites?project_id=${projectId}`, headers: { cookie: memberCookie },
  });
  const memberSiteDetail = await app.inject({
    method: 'GET', url: `/api/sites/${siteId}`, headers: { cookie: memberCookie },
  });
  const memberSiteSearch = await app.inject({
    method: 'GET', url: '/api/sites?q=ABC-001', headers: { cookie: memberCookie },
  });
  const memberSiteNameSearch = await app.inject({
    method: 'GET', url: '/api/sites?q=Roof%20Jakarta', headers: { cookie: memberCookie },
  });
  const memberSiteHistory = await app.inject({
    method: 'GET', url: `/api/sites/${siteId}/history`, headers: { cookie: memberCookie },
  });

  for (const response of [
    memberProjectList, memberProjectDetail, memberSitesList, memberSiteDetail,
    memberSiteSearch, memberSiteNameSearch, memberSiteHistory,
  ]) {
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.includes('contract_value'), false);
    assert.equal(response.body.includes('site_value'), false);
  }
  assert.equal(memberSiteSearch.json().sites.length, 1);
  assert.equal(memberSiteNameSearch.json().sites.length, 1);

  const memberCreateProject = await app.inject({
    method: 'POST', url: '/api/projects', headers: { cookie: memberCookie },
    payload: { ...projectPayload, id: randomUUID() },
  });
  const memberDeleteProject = await app.inject({
    method: 'DELETE', url: `/api/projects/${projectId}`, headers: { cookie: memberCookie },
  });
  const memberChangeProject = await app.inject({
    method: 'PATCH', url: `/api/projects/${projectId}`, headers: { cookie: memberCookie },
    payload: { name: 'Changed by member' },
  });
  const memberCreateSite = await app.inject({
    method: 'POST', url: '/api/sites', headers: { cookie: memberCookie },
    payload: { ...sitePayload, id: randomUUID(), site_code: 'MEMBER-NEW' },
  });
  const memberDeleteSite = await app.inject({
    method: 'DELETE', url: `/api/sites/${siteId}`, headers: { cookie: memberCookie },
  });
  assert.equal(memberCreateProject.statusCode, 403);
  assert.equal(memberDeleteProject.statusCode, 403);
  assert.equal(memberChangeProject.statusCode, 403);
  assert.equal(memberCreateSite.statusCode, 403);
  assert.equal(memberDeleteSite.statusCode, 403);

  const deniedInvoiced = await app.inject({
    method: 'PATCH', url: `/api/sites/${siteId}`, headers: { cookie: memberCookie },
    payload: { status: 'Ditagih', notes: 'Update anggota' },
  });
  const deniedPaid = await app.inject({
    method: 'PATCH', url: `/api/sites/${siteId}`, headers: { cookie: memberCookie },
    payload: { status: 'Dibayar' },
  });
  assert.equal(deniedInvoiced.statusCode, 403);
  assert.equal(deniedPaid.statusCode, 403);

  const memberStatusUpdate = await app.inject({
    method: 'PATCH', url: `/api/sites/${siteId}`, headers: { cookie: memberCookie },
    payload: { status: 'Survey', notes: 'Sudah disurvey' },
  });
  assert.equal(memberStatusUpdate.statusCode, 200);
  assert.equal(memberStatusUpdate.json().site.status, 'Survey');
  assert.equal(memberStatusUpdate.json().site.notes, 'Sudah disurvey');
  assert.equal(memberStatusUpdate.body.includes('site_value'), false);

  const history = await app.inject({
    method: 'GET', url: `/api/sites/${siteId}/history`, headers: { cookie: memberCookie },
  });
  assert.equal(history.statusCode, 200);
  assert.deepEqual(history.json().history.map(({ from_status, to_status }) => [from_status, to_status]), [
    [null, 'Belum mulai'],
    ['Belum mulai', 'Survey'],
  ]);
  assert.equal(history.json().history[1].changed_by, memberId);

  const filteredByStatus = await app.inject({
    method: 'GET', url: '/api/sites?status=Survey', headers: { cookie: memberCookie },
  });
  const filteredByDifferentStatus = await app.inject({
    method: 'GET', url: '/api/sites?status=Ditagih', headers: { cookie: memberCookie },
  });
  assert.equal(filteredByStatus.statusCode, 200);
  assert.equal(filteredByStatus.json().sites.length, 1);
  assert.equal(filteredByDifferentStatus.statusCode, 200);
  assert.equal(filteredByDifferentStatus.json().sites.length, 0);

  const adminSiteDelete = await app.inject({
    method: 'DELETE', url: `/api/sites/${siteId}`, headers: { cookie: adminCookie },
  });
  assert.equal(adminSiteDelete.statusCode, 200);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM site_status_history WHERE site_id = ?').get(siteId).count, 0);

  const adminProjectDelete = await app.inject({
    method: 'DELETE', url: `/api/projects/${projectId}`, headers: { cookie: adminCookie },
  });
  assert.equal(adminProjectDelete.statusCode, 200);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM projects WHERE id = ?').get(projectId).count, 0);
});
