CREATE TABLE IF NOT EXISTS mailbox_member (
  account_id INTEGER NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES user(user_id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('reader', 'sender', 'manager')),
  PRIMARY KEY (account_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_mailbox_member_user ON mailbox_member(user_id, account_id);
