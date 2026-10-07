import { randomUUID } from 'node:crypto';
import { db, initializeDatabase } from './db/index.js';
import { hashPassword } from './utils/password.js';

initializeDatabase();

const { ADMIN_USERNAME: username, ADMIN_NAME: name, ADMIN_PASSWORD: password } = process.env;

if (!username || !name || !password) {
  console.error('Set ADMIN_USERNAME, ADMIN_NAME, dan ADMIN_PASSWORD sebelum menjalankan npm run create-admin.');
  process.exitCode = 1;
} else if (username.trim().length < 3 || password.length < 8) {
  console.error('Username minimal 3 karakter dan password minimal 8 karakter.');
  process.exitCode = 1;
} else {
  try {
    const createAdmin = db.transaction(() => {
      const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
      if (userCount !== 0) {
        throw new Error('Admin pertama hanya dapat dibuat saat tabel users masih kosong.');
      }

      db.prepare(
        `INSERT INTO users (id, username, name, role, password_hash, is_active)
         VALUES (?, ?, ?, 'admin', ?, 1)`
      ).run(randomUUID(), username.trim(), name.trim(), hashPassword(password));
    });

    createAdmin();
    console.log(`Admin '${username.trim()}' berhasil dibuat.`);
  } catch (error) {
    console.error(`Gagal membuat admin: ${error.message}`);
    process.exitCode = 1;
  }
}

db.close();
