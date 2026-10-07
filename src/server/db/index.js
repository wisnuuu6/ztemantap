import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from '../config.js';

mkdirSync(dirname(config.dbPath), { recursive: true });

export const db = new Database(config.dbPath, { fileMustExist: false });
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

export function initializeDatabase() {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'member')) DEFAULT 'member',
      phone TEXT,
      emergency_contact TEXT,
      password_hash TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      provider TEXT,
      contract_value REAL,
      start_date TEXT,
      target_date TEXT,
      status TEXT NOT NULL DEFAULT 'Belum mulai',
      notes TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sites (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      site_code TEXT NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      maps_url TEXT,
      site_type TEXT NOT NULL CHECK(site_type IN ('tower', 'rooftop')),
      status TEXT NOT NULL CHECK(status IN (
        'Belum mulai', 'Survey', 'Menunggu izin', 'Siap eksekusi', 'Eksekusi',
        'Selesai', 'Dokumen/BAST', 'Ditagih', 'Dibayar'
      )),
      site_value REAL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS site_status_history (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT NOT NULL CHECK(to_status IN (
        'Belum mulai', 'Survey', 'Menunggu izin', 'Siap eksekusi', 'Eksekusi',
        'Selesai', 'Dokumen/BAST', 'Ditagih', 'Dibayar'
      )),
      changed_by TEXT NOT NULL,
      changed_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
      FOREIGN KEY (changed_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS cash_flow_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cash_flows (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      transaction_date TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      category_id TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      created_by TEXT NOT NULL,
      attachment_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (category_id) REFERENCES cash_flow_categories(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_cash_flows_created_by ON cash_flows(created_by);
    CREATE INDEX IF NOT EXISTS idx_cash_flows_project ON cash_flows(project_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_project_code ON sites(project_id, site_code);
    CREATE INDEX IF NOT EXISTS idx_sites_project_status ON sites(project_id, status);
    CREATE INDEX IF NOT EXISTS idx_sites_name ON sites(name);
    CREATE INDEX IF NOT EXISTS idx_site_status_history_site_date ON site_status_history(site_id, changed_at);
  `;

  db.exec(schema);
}
