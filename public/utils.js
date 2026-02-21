/**
 * @param {number} ms
 */
export function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms));
}

/**
 * @param {string | undefined} url
 */
export function isDebuggableURL(url) {
	if (!url) return false;

	// các scheme bị chặn
	if (
		url.startsWith('chrome://') ||
		url.startsWith('devtools://') ||
		url.startsWith('chrome-extension://') ||
		url.startsWith('edge://')
	) {
		return false;
	}

	return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * @param {() => boolean | Promise<boolean>} check
 * @param {{ timeout: number, interval: number }} opts
 */
export async function waitFor(check, opts = {}) {
	const timeout = opts.timeout ?? 2000;
	const interval = opts.interval ?? 100;
	const deadline = Date.now() + timeout;

	while (Date.now() < deadline) {
		if (await check()) return true;
		await new Promise((r) => setTimeout(r, interval));
	}

	return false;
}

/**
 * @param {string} url
 */
export function urlLooksLikeImage(url) {
	if (!url) return false;
	if (/\.(jpg|jpeg|png|gif|webp|bmp|ico|svg|avif|tiff)(\?|#|$)/i.test(url)) return true;
	if (/\/(image|photo|img|picture|media|attachment|blob)\//i.test(url)) return true;
	return false;
}

/**
 * @param {string} url
 */
export function guessMimeType(url) {
	const map = {
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg',
		png: 'image/png',
		gif: 'image/gif',
		webp: 'image/webp',
		svg: 'image/svg+xml',
		bmp: 'image/bmp',
		ico: 'image/x-icon',
		avif: 'image/avif',
		tiff: 'image/tiff',
	};
	const m = url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|avif|tiff)(\?|#|$)/i);
	return m ? (map[m[1].toLowerCase()] ?? 'image/jpeg') : 'image/jpeg';
}
