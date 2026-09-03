// @ts-check
import { guessMimeType, isDebuggableURL, urlLooksLikeImage } from '../public/utils.js';

/**
 * @typedef {{ body: string, base64Encoded: boolean, mimeType: string, tabId: number }} CachedImage
 * @typedef {{ url: string, mimeType: string, tabId: number, responseTime: number, width: null|number, height: null|number }} NetworkImageMeta
 * @typedef {{ url: string, mimeType: string, tabId: number, debuggeeId: chrome.debugger.Debuggee, responseTime: number }} PendingRequest
 * @typedef {{ src: string, width: number, height: number, groupKey: string, groupLabel: string }} ImageResult
 */

/**
 * Attach/detach debugger, capture network image bodies into cache
 */
export default class DebuggerManager {
	constructor() {
		/** @type {Map<number, chrome.debugger.Debuggee>} */
		this.activeDebuggers = new Map();

		/** @type {Map<string, CachedImage>} */
		this.imageCache = new Map();

		/** @type {Map<string, PendingRequest>} */
		this.pendingRequests = new Map();

		/** @type {Map<string, NetworkImageMeta>} */
		this.networkImages = new Map();

		this.MAX_CACHE_SIZE = 500;

		chrome.debugger.onEvent.addListener(this._onDebuggerEvent.bind(this));
		chrome.debugger.onDetach.addListener(this._onDebuggerDetach.bind(this));
	}

	// Attach/detach helpers

	/**
	 * @param {number} tabId
	 */
	async attach(tabId) {
		if (this.activeDebuggers.has(tabId)) return;

		const tab = await chrome.tabs.get(tabId);
		if (!tab || !isDebuggableURL(tab.url)) return;

		const debuggeeId = { tabId };

		try {
			await chrome.debugger.attach(debuggeeId, '1.3');
			await chrome.debugger.sendCommand(debuggeeId, 'Network.enable');
			await chrome.debugger.sendCommand(debuggeeId, 'Page.enable');
			this.activeDebuggers.set(tabId, debuggeeId);
			console.log(`Debugger attached -> tab ${tabId}`);
		} catch (err) {
			console.error(`attachDebugger failed tab ${tabId}:`, err);
			this.activeDebuggers.delete(tabId);
		}
	}

	/**
	 * @param {number} tabId
	 */
	async detach(tabId) {
		if (!this.activeDebuggers.has(tabId)) return;
		const debuggeeId = this.activeDebuggers.get(tabId);
		this.activeDebuggers.delete(tabId);

		if (!debuggeeId) return;
		try {
			await chrome.debugger.detach(debuggeeId);
		} catch {
			// Tab closed
		}
	}

	/**
	 * @param {number} tabId
	 */
	evictTab(tabId) {
		const prefix = `${tabId}:`;
		for (const key of this.imageCache.keys()) if (key.startsWith(prefix)) this.imageCache.delete(key);
		for (const key of this.networkImages.keys()) if (key.startsWith(prefix)) this.networkImages.delete(key);
		for (const [id, p] of this.pendingRequests.entries()) if (p.tabId === tabId) this.pendingRequests.delete(id);
	}

	/**
	 * @param {number} tabId
	 */
	isAttached(tabId) {
		return this.activeDebuggers.has(tabId);
	}

	/**
	 * @param {number} tabId
	 */
	getDebuggee(tabId) {
		return this.activeDebuggers.get(tabId) ?? null;
	}

	// Network event handlers

	/**
	 * @private
	 * @param {chrome.debugger.Debuggee} debuggeeId
	 * @param {string} eventName
	 * @param {any} params
	 */
	_onDebuggerEvent(debuggeeId, eventName, params) {
		const tabId = debuggeeId.tabId;
		if (!tabId) {
			console.warn('Tab ID not found, ignore attach', debuggeeId);
			return;
		}

		if (eventName === 'Network.responseReceived') {
			const { type, requestId, response } = params;
			const mimeType = response.mimeType || '';
			const isImageType = type === 'Image';
			const isImageMime = mimeType.startsWith('image/');
			const isOctetImage = mimeType === 'application/octet-stream' && urlLooksLikeImage(response.url);

			if (isImageType || isImageMime || isOctetImage) {
				this.pendingRequests.set(requestId, {
					url: response.url,
					mimeType: isImageMime ? mimeType : guessMimeType(response.url),
					tabId,
					debuggeeId,
					responseTime: Date.now(),
				});
			}
		}

		if (eventName === 'Network.loadingFinished') {
			const pending = this.pendingRequests.get(params.requestId);
			if (pending) {
				this.pendingRequests.delete(params.requestId);
				this._fetchAndCacheBody(pending, params.requestId);
			}
		}

		if (eventName === 'Network.loadingFailed') {
			this.pendingRequests.delete(params.requestId);
		}
	}

	/**
	 * @private
	 * @param {chrome.debugger.Debuggee} debuggeeId
	 */
	_onDebuggerDetach(debuggeeId) {
		const tabId = debuggeeId.tabId;
		if (!tabId) {
			console.warn('Tab ID not found, ignore detach', debuggeeId);
			return;
		}

		this.activeDebuggers.delete(tabId);
	}

	/**
	 * @private
	 * @param {PendingRequest} pending
	 * @param {string} requestId
	 */
	async _fetchAndCacheBody(pending, requestId) {
		const { debuggeeId, url, mimeType, tabId, responseTime } = pending;
		try {
			const res =
				/**
				 * @type {import('devtools-protocol').Protocol.Network.GetResponseBodyResponse | undefined}
				 */
				await chrome.debugger.sendCommand(debuggeeId, 'Network.getResponseBody', { requestId });
			if (!res) return console.warn('No response', { requestId, url, tabId, responseTime });

			if (
				'body' in res &&
				'base64Encoded' in res &&
				typeof res['body'] === 'string' &&
				typeof res['base64Encoded'] === 'boolean'
			) {
				const key = `${tabId}:${url}`;
				this.imageCache.set(key, { body: res.body, base64Encoded: res.base64Encoded, mimeType, tabId });
				this.networkImages.set(key, { url, mimeType, tabId, responseTime, width: null, height: null });

				if (this.imageCache.size > this.MAX_CACHE_SIZE) {
					const first = this.imageCache.keys().next().value;
					if (first) this.imageCache.delete(first);
				}
			} else {
				console.warn('Invalid network response?', res);
			}
		} catch (err) {
			console.warn('Fetch & cache body failed:', err);
		}
	}

	// Cache access

	/**
	 * @param {number} tabId
	 * @param {string} url
	 * @returns {CachedImage | null}
	 */
	getCached(tabId, url) {
		return this.imageCache.get(`${tabId}:${url}`) ?? null;
	}

	/**
	 * @param {number} tabId
	 * @param {string} url
	 * @param {CachedImage} data
	 */
	setCached(tabId, url, data) {
		this.imageCache.set(`${tabId}:${url}`, data);
	}

	/**
	 * Network images captured cho tab này, chưa lọc DOM
	 * @param {number} tabId
	 * @returns {NetworkImageMeta[]}
	 */
	getNetworkImages(tabId) {
		const prefix = `${tabId}:`;
		return [...this.networkImages.entries()].filter(([k]) => k.startsWith(prefix)).map(([, v]) => v);
	}
}
