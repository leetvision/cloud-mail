CREATE TABLE IF NOT EXISTS gro_webhook_outbox (
 event_id TEXT PRIMARY KEY NOT NULL,
 payload TEXT NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0,
 next_attempt INTEGER NOT NULL DEFAULT 0,
 delivered_at INTEGER,
 last_error TEXT
);
CREATE INDEX IF NOT EXISTS gro_webhook_due ON gro_webhook_outbox(delivered_at,next_attempt);
CREATE TABLE IF NOT EXISTS gro_send_receipt (
 delivery_id TEXT PRIMARY KEY NOT NULL,
 payload_hash TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('sending','sent','indeterminate','pending')),
 attempted_at INTEGER NOT NULL,
 message_id TEXT,
 email_id INTEGER
);
CREATE TABLE IF NOT EXISTS gro_webhook_attachment (
 event_id TEXT NOT NULL REFERENCES gro_webhook_outbox(event_id) ON DELETE CASCADE,
 position INTEGER NOT NULL,
 content TEXT NOT NULL,
 PRIMARY KEY(event_id,position)
);
