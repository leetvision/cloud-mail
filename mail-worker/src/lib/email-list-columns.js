import { getTableColumns, sql } from 'drizzle-orm';
import email from '../entity/email';

export const EMAIL_LIST_TEXT_LEN = 300;

/** Remove line breaks and tabs, then collapse repeated spaces and whitespace between tags. */
function sqlStripWhitespace(column) {
	return sql`trim(replace(replace(replace(replace(replace(replace(
		coalesce(${column}, ''),
		char(13), ''),
		char(10), ''),
		char(9), ' '),
		'  ', ' '),
		'  ', ' '),
		'> <', '><'))`;
}

/** Full query: all fields. */
export const emailListColumns = getTableColumns(email);

/** Summary query for lists and detail headers; use text when available, otherwise read trimmed content without returning content. */
export const emailBriefColumns = {
	emailId: email.emailId,
	accountId: email.accountId,
	sendEmail: email.sendEmail,
	name: email.name,
	subject: email.subject,
	code: email.code,
	recipient: email.recipient,
	toEmail: email.toEmail,
	type: email.type,
	status: email.status,
	message: email.message,
	unread: email.unread,
	createTime: email.createTime,
	isDel: email.isDel,
	content: sql`CASE WHEN trim(coalesce(${email.text}, '')) != '' THEN NULL ELSE ${sqlStripWhitespace(email.content)} END`.as('content'),
	text: sql`substr(coalesce(${email.text}, ''), 1, ${EMAIL_LIST_TEXT_LEN})`.as('text'),
};
