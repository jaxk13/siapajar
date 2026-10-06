-- 003_automatic_payment
-- Automatic payment via Midtrans, access code delivery by email, ad attribution (docs/DECISIONS.md ADR-017).
-- Mirrors docs/ERD.dbml and docs/DATABASE.md. Update all three together.

-- Checkout that was never paid, or a payment that was refused / cancelled by the provider.
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'expired';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'failed';

-- Payment channels reported by Midtrans (qris and bank_transfer already exist for manual orders).
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'virtual_account';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'e_wallet';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'card';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'other';

-- Personal data. Never log.
ALTER TABLE orders ADD COLUMN buyer_email varchar(254) CHECK (buyer_email IS NULL OR buyer_email = lower(buyer_email));

-- Where the buyer came from (utm_*, fbclid) and Meta browser identifiers (fbp, fbc, IP, user agent)
-- used once for the Conversions API Purchase event. Personal data. Never log.
ALTER TABLE orders ADD COLUMN attribution jsonb;

-- Pending checkouts are listed by status; lookups by provider go through provider_ref (already unique).
CREATE INDEX orders_status_created_idx ON orders (status, created_at);

-- Delivery attempts of the access code to the buyer. Never stores the code itself.
CREATE TABLE order_deliveries (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id   uuid         NOT NULL REFERENCES orders (id),
  channel    varchar(20)  NOT NULL CHECK (channel IN ('email')),
  status     varchar(20)  NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  error      varchar(255),
  created_by uuid REFERENCES users (id),
  created_at timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX order_deliveries_order_idx ON order_deliveries (order_id, created_at);
