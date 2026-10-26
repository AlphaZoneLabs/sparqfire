-- Enforce single-owner bootstrap even when two setup requests race.
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_owner ON users(role) WHERE role = 'owner';
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_window ON login_attempts(window_start);
