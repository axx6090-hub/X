CREATE TABLE products (id TEXT PRIMARY KEY, payload TEXT NOT NULL CHECK(json_valid(payload)));
CREATE TABLE categories (
  id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
  image TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE settings (id INTEGER PRIMARY KEY CHECK(id = 1), payload TEXT NOT NULL CHECK(json_valid(payload)));
CREATE TABLE images (id TEXT PRIMARY KEY, mime TEXT NOT NULL, data BLOB NOT NULL);
CREATE TABLE admin_sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
CREATE INDEX sessions_expiry ON admin_sessions(expires_at);
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE orders (
  id TEXT PRIMARY KEY, request_hash TEXT NOT NULL,
  payload TEXT NOT NULL CHECK(json_valid(payload)),
  status TEXT NOT NULL DEFAULT 'new', created_at TEXT NOT NULL
);
CREATE INDEX orders_created ON orders(created_at DESC);
