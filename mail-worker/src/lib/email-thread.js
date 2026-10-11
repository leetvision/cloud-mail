// Match complete header IDs, never subjects or substrings of IDs.
export function messageIds(header) {
	if (!header) return [];
	const value = String(header);
	const bracketed = value.match(/<[^<>\s]+>/g);
	const ids = bracketed || value.split(/[\s,]+/).filter(Boolean);
	return [...new Set(ids.map(id => id.replace(/^<|>$/g, '')))];
}

export function replyReferences(parent) {
	return [...new Set([
		...messageIds(parent.relation),
		...messageIds(parent.inReplyTo),
		...messageIds(parent.messageId),
	])].map(id => `<${id}>`).join(' ');
}

export function threadEmailIds(rows, selectedId) {
	const byToken = new Map();
	const tokensByEmail = new Map();
	for (const row of rows) {
		const tokens = new Set([
			...messageIds(row.messageId),
			...messageIds(row.inReplyTo),
			...messageIds(row.relation),
		]);
		tokensByEmail.set(row.emailId, tokens);
		for (const token of tokens) {
			if (!byToken.has(token)) byToken.set(token, []);
			byToken.get(token).push(row.emailId);
		}
	}
	// Shared References connect siblings even when their parent is no longer stored.
	const ids = new Set([selectedId]);
	const visitedTokens = new Set();
	for (const id of ids) {
		for (const token of tokensByEmail.get(id) || []) {
			if (visitedTokens.has(token)) continue;
			visitedTokens.add(token);
			for (const relatedId of byToken.get(token)) ids.add(relatedId);
		}
	}
	return [...ids];
}
