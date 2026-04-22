CREATE TABLE IF NOT EXISTS ideas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  github_issue_number INTEGER,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  hari_response TEXT,
  status TEXT DEFAULT 'waiting',
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  total_ideas INTEGER DEFAULT 0,
  total_completed INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  updated_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO stats (total_ideas, total_completed, level) VALUES (0, 0, 1);
