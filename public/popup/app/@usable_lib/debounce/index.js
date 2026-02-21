/** @type {import('./types').debounce} */
export default function debounce(func, wait, options) {
	const immediate = options?.immediate ?? false;

	let timeout = null;
	let pendingPromise = null;
	let lastArgs = null;
	let lastThis = null;

	const debounced = function (...args) {
		lastArgs = args;
		lastThis = this;

		if (timeout) clearTimeout(timeout);

		return new Promise((resolve, reject) => {
			const later = () => {
				timeout = null;
				pendingPromise = null;

				if (!immediate) {
					const result = func.apply(lastThis, lastArgs);
					Promise.resolve(result).then(resolve, reject);
				}
			};

			const callNow = immediate && !timeout;

			timeout = setTimeout(later, wait);

			if (callNow) {
				const result = func.apply(lastThis, lastArgs);
				Promise.resolve(result).then(resolve, reject);
			} else {
				pendingPromise = { resolve, reject };
			}
		});
	};

	debounced.cancel = () => {
		if (timeout) clearTimeout(timeout);
		timeout = null;
		if (pendingPromise) {
			pendingPromise.reject(new Error('Debounced function canceled'));
			pendingPromise = null;
		}
	};

	debounced.flush = () => {
		if (timeout) {
			clearTimeout(timeout);
			timeout = null;
			const result = func.apply(lastThis, lastArgs);
			return Promise.resolve(result);
		}
		return Promise.resolve(undefined);
	};

	return debounced;
}
