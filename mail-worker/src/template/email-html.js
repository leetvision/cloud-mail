import { parseHTML } from 'linkedom';

function escapeAttribute(value) {
	return String(value || '')
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

export default function emailHtmlTemplate(html, accessToken) {
	const { document } = parseHTML(String(html || '').replace(/{{domain}}/g, '/api/oss/'));
	for (const image of document.querySelectorAll('img[src]')) {
		const src = image.getAttribute('src');
		if (!src?.startsWith('/api/oss/')) continue;
		const separator = src.includes('?') ? '&' : '?';
		image.setAttribute('src', `${src}${separator}access_token=${encodeURIComponent(accessToken)}`);
	}
	const content = document.toString();
	const srcdoc = escapeAttribute(content);

	return `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width,initial-scale=1">
	<meta name="referrer" content="no-referrer">
	<style>html,body{height:100%;margin:0}iframe{width:100%;height:100%;border:0;background:#fff}</style>
</head>
<body>
	<iframe
		sandbox="allow-same-origin"
		referrerpolicy="no-referrer"
		csp="default-src 'none'; img-src 'self' data: blob:; style-src 'unsafe-inline'; font-src 'self' data:; base-uri 'none'; form-action 'none';"
		srcdoc="${srcdoc}"
		title="Email content"
	></iframe>
</body>
</html>`;
}
