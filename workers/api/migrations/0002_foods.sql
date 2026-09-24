CREATE TABLE IF NOT EXISTS foods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  grp TEXT NOT NULL,
  aliases TEXT NOT NULL,
  kcal100 REAL NOT NULL,
  protein100 REAL NOT NULL,
  carbs100 REAL NOT NULL,
  fat100 REAL NOT NULL,
  serving_g REAL NOT NULL,
  serving_label TEXT NOT NULL,
  aisle TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS foods_by_group ON foods (grp);

CREATE TABLE IF NOT EXISTS backups (
  id TEXT PRIMARY KEY,
  owner_pk TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  ct TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS backups_by_owner ON backups (owner_pk, created_at);
