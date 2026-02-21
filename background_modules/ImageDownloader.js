// @ts-check
import { crawlImagesAndGroupPhase2 } from '../inject_scripts/imageCrawlers.js';
import { guessMimeType, urlLooksLikeImage, waitFor } from '../public/utils.js';
import DebuggerManager from '../background_modules/DebuggerManager.js';

/**
 * Orchestrate data fetching, expose API for message handler
 */
export default class ImageDownloader {
	constructor() {
		this.debugger = new DebuggerManager();
		this.enabled = false;
		this._init();
	}

	/**
	 * @private
	 */
	_init() {
		chrome.storage.local.get(['extensionEnabled'], (result) => {
			this.enabled = result.extensionEnabled !== false;
			if (!this.enabled) return;

			chrome.tabs.query({}, (tabs) => {
				tabs.forEach((tab) => {
					if (tab.id && tab.url && !tab.url.startsWith('chrome://')) {
						this.debugger.attach(tab.id);
					}
				});
			});

			console.log('ImageDownloader initialized');
		});

		chrome.tabs.onUpdated.addListener(this._onTabUpdated.bind(this));
		chrome.tabs.onRemoved.addListener(this._onTabRemoved.bind(this));
	}

	/**
	 * @private
	 * @param {number} tabId
	 * @param {chrome.tabs.OnUpdatedInfo} changeInfo
	 */
	async _onTabUpdated(tabId, changeInfo) {
		if (!this.enabled || changeInfo.status !== 'loading') return;
		this.debugger.evictTab(tabId);
		if (this.debugger.isAttached(tabId)) await this.debugger.detach(tabId);
		setTimeout(() => this.debugger.attach(tabId), 300);
	}

	/**
	 * @private
	 * @param {number} tabId
	 */
	_onTabRemoved(tabId) {
		this.debugger.evictTab(tabId);
		this.debugger.detach(tabId);
	}

	/**
	 * @private
	 * @param {number} tabId
	 */
	async _ensureDebugger(tabId) {
		if (!this.debugger.isAttached(tabId)) {
			await this.debugger.attach(tabId);
			return waitFor(() => this.debugger.isAttached(tabId));
		}
		return true;
	}

	/**
	 * @param {number} tabId
	 * @param {{ minWidth?: number, minHeight?: number }} filters
	 * @returns {Promise<{ images: import('./DebuggerManager.js').ImageResult[] } | { error: string }>}
	 */
	async getImagesData(tabId, filters) {
		if (!(await this._ensureDebugger(tabId))) {
			return { error: 'Debugger attachment timeout' };
		}

		const minW = filters.minWidth || 50;
		const minH = filters.minHeight || 50;

		// DOM images (phase 1 + 2 grouping)
		/** @type {import('./DebuggerManager.js').ImageResult[]} */
		let domImages = [];
		try {
			const results = await chrome.scripting.executeScript({
				target: { tabId },
				func: crawlImagesAndGroupPhase2,
				args: [minW, minH],
			});
			domImages = results?.[0]?.result || [];
		} catch (err) {
			console.warn('executeScript failed:', err);
		}

		// Network-only images: exist in the cache but do not appear in the DOM.
		const domSrcs = new Set(domImages.map((img) => img.src));
		const networkOnly = this.debugger
			.getNetworkImages(tabId)
			.filter((n) => !domSrcs.has(n.url) && n.url && urlLooksLikeImage(n.url));

		/** @type {import('./DebuggerManager.js').ImageResult[]} */
		const networkImages = networkOnly.map((n) => ({
			src: n.url,
			width: 0,
			height: 0,
			groupKey: 'network_only',
			groupLabel: 'Capture from network — Not visible on the page or inside any Shadow DOM / iframe.',
		}));

		return {
			images: [
				...domImages.map((item) => {
					item.groupLabel = `Child of: [${item.groupLabel}]`;
					return item;
				}),
				...networkImages,
			],
		};
	}

	/**
	 * @param {number} tabId
	 * @param {string} url
	 * @returns {Promise<import('./DebuggerManager.js').CachedImage>}
	 */
	async getImageData(tabId, url) {
		const cached = this.debugger.getCached(tabId, url);
		if (cached) {
			console.log(`Cache hit: ${url.slice(0, 50)}`);
			return cached;
		}

		if (!(await this._ensureDebugger(tabId))) {
			throw new Error('Debugger attachment timeout');
		}

		const debuggeeId = this.debugger.getDebuggee(tabId);
		if (!debuggeeId) throw new Error('Debugger not attached');

		try {
			// @ts-expect-error: The return type of the debug command is not implemented in detail in the TS type.
			const { frameTree } = await chrome.debugger.sendCommand(debuggeeId, 'Page.getResourceTree');
			// @ts-expect-error: The return type of the debug command is not implemented in detail in the TS type.
			const { content, base64Encoded } = await chrome.debugger.sendCommand(debuggeeId, 'Page.getResourceContent', {
				frameId: frameTree.frame.id,
				url,
			});
			if (!content) throw new Error('Empty content');

			const data = { body: content, base64Encoded, mimeType: guessMimeType(url), tabId };
			this.debugger.setCached(tabId, url, data);
			return data;
		} catch (err) {
			console.warn(`getImageData failed for ${url}:`, err);
			throw err;
		}
	}

	/**
	 * @param {boolean} enabled
	 */
	async setEnabled(enabled) {
		this.enabled = enabled;
		chrome.storage.local.set({ extensionEnabled: enabled });

		if (!enabled) {
			for (const [tabId] of this.debugger.activeDebuggers) await this.debugger.detach(tabId);
			this.debugger.imageCache.clear();
			this.debugger.networkImages.clear();
			this.debugger.pendingRequests.clear();
			console.log('Extension disabled');
		} else {
			chrome.tabs.query({}, (tabs) => {
				tabs.forEach((tab) => {
					if (tab.id && tab.url && !tab.url.startsWith('chrome://')) this.debugger.attach(tab.id);
				});
			});
			console.log('Extension enabled');
		}
	}
}
