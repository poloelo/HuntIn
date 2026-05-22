const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'talentradar.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS searches (
      id TEXT PRIMARY KEY,
      company_name TEXT NOT NULL,
      job_title TEXT NOT NULL,
      required_skills TEXT NOT NULL,
      nice_to_have_skills TEXT,
      min_experience INTEGER,
      max_experience INTEGER,
      location TEXT,
      is_remote INTEGER DEFAULT 0,
      job_description TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY,
      search_id TEXT NOT NULL,
      name TEXT NOT NULL,
      headline TEXT,
      current_company TEXT,
      location TEXT,
      skills TEXT,
      experience_years INTEGER,
      profile_url TEXT,
      avatar_url TEXT,
      score INTEGER DEFAULT 0,
      explanation TEXT,
      matching_skills TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (search_id) REFERENCES searches(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_candidates_search_id ON candidates(search_id);
    CREATE INDEX IF NOT EXISTS idx_candidates_score ON candidates(score DESC);
  `);
}

module.exports = { getDb };
