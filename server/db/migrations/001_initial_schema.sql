-- 001_initial_schema
-- Mirrors docs/ERD.dbml and docs/DATABASE.md. Update all three together.

CREATE TYPE access_code_status AS ENUM ('unused', 'active', 'expired', 'disabled');
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'fulfilled', 'cancelled');
CREATE TYPE payment_method AS ENUM ('bank_transfer', 'qris');
CREATE TYPE usage_event_type AS ENUM (
  'access_activated',
  'session_created',
  'prompt_generated',
  'output_parsed',
  'export_word',
  'export_print'
);

-- Keeps updated_at current without relying on every query to set it.
CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE plans (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          varchar(50)  NOT NULL UNIQUE,
  name          varchar(100) NOT NULL,
  description   text,
  price_idr     integer      NOT NULL CHECK (price_idr >= 0),
  duration_days integer      NOT NULL CHECK (duration_days > 0),
  max_devices   integer      CHECK (max_devices IS NULL OR max_devices > 0),
  is_active     boolean      NOT NULL DEFAULT true,
  sort_order    integer      NOT NULL DEFAULT 0,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id            uuid         NOT NULL REFERENCES plans (id),
  status             order_status NOT NULL DEFAULT 'pending',
  amount_idr         integer      NOT NULL CHECK (amount_idr >= 0),
  payment_method     payment_method,
  payment_reference  varchar(100),
  payment_proof_path varchar(255),
  buyer_name         varchar(150) NOT NULL,
  buyer_whatsapp     varchar(20)  NOT NULL,
  provider           varchar(50),
  provider_ref       varchar(150) UNIQUE,
  note               text,
  paid_at            timestamptz,
  fulfilled_at       timestamptz,
  created_at         timestamptz  NOT NULL DEFAULT now(),
  updated_at         timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX orders_status_idx ON orders (status);
CREATE INDEX orders_created_at_idx ON orders (created_at);
CREATE INDEX orders_buyer_whatsapp_idx ON orders (buyer_whatsapp);

CREATE TABLE access_codes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash       char(64)           NOT NULL UNIQUE,
  code_hint       varchar(4)         NOT NULL,
  plan_id         uuid               NOT NULL REFERENCES plans (id),
  order_id        uuid               UNIQUE REFERENCES orders (id),
  status          access_code_status NOT NULL DEFAULT 'unused',
  duration_days   integer            NOT NULL CHECK (duration_days > 0),
  max_devices     integer            CHECK (max_devices IS NULL OR max_devices > 0),
  activated_at    timestamptz,
  expires_at      timestamptz,
  disabled_at     timestamptz,
  disabled_reason text,
  created_at      timestamptz        NOT NULL DEFAULT now(),
  updated_at      timestamptz        NOT NULL DEFAULT now(),
  -- An activated code always has both timestamps.
  CHECK ((activated_at IS NULL) = (expires_at IS NULL))
);
CREATE INDEX access_codes_status_idx ON access_codes (status);
CREATE INDEX access_codes_expires_at_idx ON access_codes (expires_at);
CREATE INDEX access_codes_plan_id_idx ON access_codes (plan_id);

CREATE TABLE sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_code_id uuid         NOT NULL REFERENCES access_codes (id),
  token_hash     char(64)     NOT NULL UNIQUE,
  user_agent     varchar(255),
  created_at     timestamptz  NOT NULL DEFAULT now(),
  last_seen_at   timestamptz  NOT NULL DEFAULT now(),
  expires_at     timestamptz  NOT NULL,
  revoked_at     timestamptz
);
CREATE INDEX sessions_access_code_revoked_idx ON sessions (access_code_id, revoked_at);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

CREATE TABLE usage_logs (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event          usage_event_type NOT NULL,
  access_code_id uuid REFERENCES access_codes (id),
  session_id     uuid REFERENCES sessions (id),
  metadata       jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX usage_logs_event_created_idx ON usage_logs (event, created_at);
CREATE INDEX usage_logs_access_code_idx ON usage_logs (access_code_id);

CREATE TABLE system_settings (
  key         varchar(100) PRIMARY KEY,
  value       jsonb        NOT NULL,
  description text,
  updated_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE TRIGGER plans_set_updated_at BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER access_codes_set_updated_at BEFORE UPDATE ON access_codes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER system_settings_set_updated_at BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
