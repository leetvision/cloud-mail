import { or, sql } from 'drizzle-orm';
import email from '../entity/email';

// Search literal text; % and _ entered by the user are not SQL wildcards.
export function emailSearchFilter(query) {
  const term = String(query || '').trim().slice(0, 200);
  if (!term) return undefined;
  const pattern = `%${term.replace(/[\\%_]/g, '\\$&')}%`;
  return or(...[email.subject, email.name, email.sendEmail, email.recipient, email.text, email.content]
    .map(column => sql`${column} LIKE ${pattern} ESCAPE ${'\\'}`));
}
