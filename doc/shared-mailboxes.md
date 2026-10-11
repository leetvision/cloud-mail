# Shared mailboxes

A mailbox such as `info@leet.uz` can be accessed by several people using their own logins.

## Set up access

1. Create each team member under **All Users**. Their account must be active.
2. Add the team address using **Add Email Address** while signed in as its intended owner. Multiple email addresses and adding addresses must be enabled in system settings.
3. Open the address's settings menu and choose **Mailbox access**.
4. Enter an existing user's primary login email, choose their access level, and select **Save access**.
5. The member refreshes their mailbox list to see the shared address. Select it to read its Inbox or Sent mail.

| Access | Read messages and attachments | Send and reply | Delete messages | Rename and manage members |
| --- | --- | --- | --- | --- |
| Reader | Yes | No | No | No |
| Sender | Yes | Yes | No | No |
| Manager | Yes | Yes | Yes | Yes |
| Owner | Yes | Yes | Yes | Yes |

User-role permissions, domain restrictions, sending quotas and the system sending switch still apply. For example, change a member's user role from the default sending-disabled role if they need to send. A Manager can grant access to other existing users; use Sender for staff who should only handle conversations.

Only the owner can delete the mailbox, pin it or change its aggregate-inbox setting. The configured administrator can manage membership through the API as well. Sharing an address does not share the owner's other mailboxes, password or settings.

## Behavior

- Received and sent messages belong to the mailbox owner, so all members see the same mailbox history. A delegate's sending quota is charged to the delegate.
- Read/unread and deletion state are shared. Stars remain personal. Drafts retain the application's existing browser-local behavior.
- Replies use the original message's mailbox as the sender. A Reader cannot send from that address.
- Removing a member immediately denies subsequent mailbox, message, star-list and attachment requests. Content already downloaded cannot be recalled.
- Deleted mailboxes and suspended/deleted mailbox owners are inaccessible to members.
- This release does not include conversation assignment, collision detection, shared drafts or per-agent activity history.

## Upgrade

Run the existing authenticated `POST /api/init` migration before serving traffic with the new code. It adds the idempotent `mailbox_member` table and user lookup index without modifying existing mailbox ownership. GitHub Actions applies `mail-worker/migrations/001-shared-mailboxes.sql` before deploying, then runs full database initialization. For manual deployment, apply that SQL file to D1 **before deployment** to avoid a brief missing-table window:

```sql
CREATE TABLE IF NOT EXISTS mailbox_member (
  account_id INTEGER NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES user(user_id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('reader', 'sender', 'manager')),
  PRIMARY KEY (account_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_mailbox_member_user ON mailbox_member(user_id, account_id);
```

The membership API uses authenticated sessions:

- `GET /api/account/members?accountId=...` lists members (owner/manager/admin).
- `PUT /api/account/members` accepts `{accountId, email, role}` to grant or update access.
- `DELETE /api/account/members?accountId=...&userId=...` removes access.
- `GET /api/account/access?accountId=...` checks current access and returns sender identity.
