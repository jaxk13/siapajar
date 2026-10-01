-- 002_admin_panel
-- Admin team accounts for /super-admin (docs/DECISIONS.md ADR-016).
-- `users` holds ADMIN TEAM accounts only. Teachers never have accounts (ADR-003).

CREATE TYPE user_role AS ENUM ('super_admin', 'admin');

CREATE TABLE users (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 varchar(100) NOT NULL,
  email                varchar(254) NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash        text         NOT NULL,
  role                 user_role    NOT NULL DEFAULT 'admin',
  is_active            boolean      NOT NULL DEFAULT true,
  must_change_password boolean      NOT NULL DEFAULT true,
  last_login_at        timestamptz,
  created_by           uuid REFERENCES users (id),
  created_at           timestamptz  NOT NULL DEFAULT now(),
  updated_at           timestamptz  NOT NULL DEFAULT now()
);

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Admin sessions are separate from teacher sessions (table `sessions`).
CREATE TABLE user_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid         NOT NULL REFERENCES users (id),
  token_hash   char(64)     NOT NULL UNIQUE,
  user_agent   varchar(255),
  created_at   timestamptz  NOT NULL DEFAULT now(),
  last_seen_at timestamptz  NOT NULL DEFAULT now(),
  expires_at   timestamptz  NOT NULL,
  revoked_at   timestamptz
);
CREATE INDEX user_sessions_user_revoked_idx ON user_sessions (user_id, revoked_at);

-- Who did what in the admin panel.
CREATE TABLE audit_logs (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     uuid REFERENCES users (id),
  action      varchar(50)  NOT NULL,
  target_type varchar(30),
  target_id   uuid,
  metadata    jsonb,
  created_at  timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_created_idx ON audit_logs (created_at);
CREATE INDEX audit_logs_user_idx ON audit_logs (user_id);

-- Track which admin created or changed records. NULL = created from the CLI.
ALTER TABLE orders ADD COLUMN created_by uuid REFERENCES users (id);
ALTER TABLE access_codes ADD COLUMN created_by uuid REFERENCES users (id);
ALTER TABLE access_codes ADD COLUMN disabled_by uuid REFERENCES users (id);
