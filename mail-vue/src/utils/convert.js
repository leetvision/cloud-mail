export function cvtR2Url(key) {

    if (!key) {
        return ''
    }

    if (key.startsWith('https://')) {
        return key
    }

	return '/api/oss/' + String(key).replace(/^\/+/, '');
}

export function toOssDomain(domain) {

    if (!domain) {
        return ''
    }

    if (!domain.startsWith('http')) {
        return 'https://' + domain
    }

    if (domain.endsWith("/")) {
        domain = domain.slice(0, -1);
    }

    return domain
}
