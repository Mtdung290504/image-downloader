// @ts-check
import { message } from '../../../chrome_lib/message-router.js';
// import { sleep } from '../../../utils.js';
import { createViewBinding } from '../@usable_lib/view_binding/index.js';
import { getSavedDirectoryHandle, saveDirectoryHandle, verifyPermission } from './folderStorage.js';

const TEMPLATES = [
	{ id: 'timestamp-folder', label: 'Timestamp folder per batch (default)', pattern: '{timestamp}/{index}-{name}' },
	{
		id: 'timestamp-folder-idx-only',
		label: 'Timestamp folder per batch, index only name',
		pattern: '{timestamp}/{index}',
	},
	{ id: 'title-folder', label: 'Page title as folder', pattern: '{title}/{index}-{name}' },
	{
		id: 'title-and-timestamp-folder',
		label: 'Title + Timestamp folder',
		pattern: '{title}/{timestamp}/{index}-{name}',
	},
	{ id: 'flat-name', label: 'Flat naming', pattern: '{timestamp}-{index}-{name}' },
];

const { viewBinding: formatterBinding } = createViewBinding({
	select: '#formatterSelect = select',
	editor: '#formatterEditor = input',
	preview: '#formatterPreview',
	panel: '#formatterPanel',
	toggle: '#toggleFormatter = button',
	padInput: '#formatterPad = input',
	tsFormat: '#formatterTsFormat = select',
});

class FilenameFormatter {
	/** @param {Document | ShadowRoot} doc */
	constructor(doc) {
		this.pattern = TEMPLATES[0].pattern;
		this._views = formatterBinding.bind(doc);
		this._init();
	}

	/**
	 * @private
	 */
	_init() {
		const { select, editor, toggle, panel, padInput, tsFormat } = this._views;

		TEMPLATES.forEach((t) => {
			const opt = document.createElement('option');
			opt.value = t.id;
			opt.textContent = t.label + ' \u2014 ' + t.pattern;
			select.appendChild(opt);
		});
		const customOpt = document.createElement('option');
		customOpt.value = 'custom';
		customOpt.textContent = 'Custom\u2026';
		select.appendChild(customOpt);

		editor.value = TEMPLATES[0].pattern;

		toggle.addEventListener('click', () => {
			const open = panel.classList.toggle('open');
			toggle.classList.toggle('active', open);
			if (open) this._updatePreview();
		});

		select.addEventListener('change', () => {
			const t = TEMPLATES.find((t) => t.id === select.value);
			if (t) {
				editor.value = t.pattern;
				this.pattern = t.pattern;
			}
			this._updatePreview();
		});

		editor.addEventListener('input', () => {
			select.value = 'custom';
			this.pattern = editor.value;
			this._updatePreview();
		});

		padInput.addEventListener('input', () => this._updatePreview());
		tsFormat.addEventListener('change', () => this._updatePreview());

		this._updatePreview();
	}

	/**
	 * @private
	 * @param {number} ts
	 * @param {string} fmt
	 */
	_formatTs(ts, fmt) {
		if (fmt === 'ms') return String(ts);
		const d = new Date(ts);
		const p = (n = 0) => String(n).padStart(2, '0');
		const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
		if (fmt === 'date') return date;
		return `${date} ${p(d.getHours())}.${p(d.getMinutes())}.${p(d.getSeconds())}`;
	}

	/**
	 * @private
	 * @param {string} pattern
	 * @param {number} timestamp
	 * @param {number} index
	 * @param {string} name
	 */
	_apply(pattern, timestamp, index, name) {
		const { padInput, tsFormat } = this._views;
		const pad = Math.max(1, Math.min(6, parseInt(padInput.value) || 3));
		const tsFmt = tsFormat.value || 'ms';
		const tsStr = this._formatTs(timestamp, tsFmt);
		const idxStr = String(index).padStart(pad, '0');
		const safe = name.replace(/[/\\]/g, '_');
		return pattern
			.replace(/\{title\}/g, document.title)
			.replace(/\{timestamp\}/g, tsStr)
			.replace(/\{index\}/g, idxStr)
			.replace(/\{name\}/g, safe);
	}

	/**
	 * @private
	 */
	_updatePreview() {
		const { preview } = this._views;
		const result = this._apply(this.pattern, Date.now(), 0, 'example_photo');
		preview.textContent = result + '.jpg';
		preview.className = this._isValidPath(result) ? 'formatter-preview ok' : 'formatter-preview not-ok';
	}

	/**
	 * @private
	 * @param {string} path
	 */
	_isValidPath(path) {
		if (!path || typeof path !== 'string') return false;
		if (/[\x00-\x1F]/.test(path)) return false;
		if (/[<>:"\\|?*]/.test(path)) return false;
		const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
		for (const seg of path.split('/')) {
			if (!seg.trim() || seg === '.' || seg === '..' || /[. ]$/.test(seg) || reserved.test(seg)) return false;
		}
		return true;
	}

	/**
	 * Returns path without extension. May contain "/" for subfolders.
	 * @param {number} timestamp
	 * @param {number} index
	 * @param {string} url
	 */
	format(timestamp, index, url) {
		const name = this._extractName(url).replace(/\.[^.]+$/, '');
		return this._apply(this.pattern, timestamp, index, name);
	}

	/** @param {string} url */
	getExt(url) {
		const m = url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|avif|tiff)(\?|#|$)/i);
		return m ? '.' + m[1].toLowerCase() : '.jpg';
	}

	/**
	 * @private
	 * @param {string} url
	 */
	_extractName(url) {
		try {
			const segs = new URL(url).pathname.split('/').filter(Boolean);
			const raw = segs.at(-1)?.split('?')[0].split('#')[0];
			if (raw) return decodeURIComponent(raw).replace(/[<>:"|?*]/g, '_');
		} catch {}
		return 'image_' + this._hash(url);
	}

	/**
	 * @private
	 * @param {string} str
	 */
	_hash(str) {
		let h = 0;
		for (let i = 0; i < str.length; i++) {
			h = (h << 5) - h + str.charCodeAt(i);
			h |= 0;
		}
		return Math.abs(h).toString(36);
	}

	/** @param {number} count */
	autoSetPad(count) {
		const { padInput } = this._views;
		if (!padInput.dataset.userModified) {
			padInput.value = String(count.toString().length);
			this._updatePreview();
		}
	}
}

// App view binding
const { viewBinding: appBinding } = createViewBinding({
	closeBtn: '#closeBtn = button',
	applyFilters: '#applyFilters = button',
	selectAll: '#selectAll = button',
	deselectAll: '#deselectAll = button',
	selectRange: '#selectRange = button',
	selectFolder: '#selectFolder = button',
	downloadBtn: '#downloadBtn = button',
	imageGrid: '#imageGrid',
	imageCount: '#imageCount',
	selectedCount: '#selectedCount',
	folderInfo: '#folderInfo',
	progressModal: '#progressModal',
	progressFill: '#progressFill',
	progressText: '#progressText',
	minWidth: '#minWidth = input',
	minHeight: '#minHeight = input',
});

export class ImageDownloaderApp {
	/**
	 * @param {Document | ShadowRoot} doc
	 * @param {() => void} hide
	 */
	constructor(doc, hide) {
		this.doc = doc;
		this._views = appBinding.bind(doc);
		this._views.closeBtn.addEventListener('click', hide);

		/** @type {import('../../../../background_modules/DebuggerManager.js').ImageResult[]} */
		this.allImages = [];

		/** @type {Set<number>} */
		this.selectedImages = new Set();

		/** @type {FileSystemDirectoryHandle | null} */
		this.directoryHandle = null;

		this.tabId = /** @type {number | null} */ (null);
		this.rangeMode = false;
		this.rangeAnchor = /** @type {number | null} */ (null);
		this.formatter = new FilenameFormatter(doc);

		// Map index -> card element để tránh querySelector mỗi lần select
		/** @type {Map<number, HTMLElement>} */
		this._cardMap = new Map();

		this._init();
	}

	/**
	 * @private
	 */
	async _init() {
		const extensionEnabled = await chrome.runtime.sendMessage(message('get-active-state'));
		if (!extensionEnabled)
			return (this._views.imageGrid.innerHTML = '<div class="state-msg error">The extension is disabled</div>');

		try {
			const r = await chrome.runtime.sendMessage(message('get-current-tab'));
			this.tabId = r?.tabId;
		} catch (e) {
			console.error('Failed to get tab ID:', e);
		}

		// Khôi phục thư mục đã lưu trong IndexedDB (nếu có)
		try {
			const savedHandle = await getSavedDirectoryHandle();
			if (savedHandle) {
				this.directoryHandle = savedHandle;
				const { folderInfo } = this._views;
				folderInfo.textContent = '\ud83d\udcc1 ' + savedHandle.name;
				folderInfo.classList.add('active');
			}
		} catch (e) {
			console.warn('Failed to restore directory handle from IndexedDB:', e);
		}

		this._attachStaticListeners();
		await this.loadImages();
	}

	/**
	 * @private
	 */
	_attachStaticListeners() {
		const { applyFilters, selectAll, deselectAll, selectRange, selectFolder, downloadBtn, imageGrid } = this._views;

		applyFilters.addEventListener('click', () => this.loadImages());
		selectAll.addEventListener('click', () => this.selectAll());
		deselectAll.addEventListener('click', () => this.deselectAll());
		selectRange.addEventListener('click', () => this.toggleRangeMode());
		selectFolder.addEventListener('click', () => this.selectFolder());
		downloadBtn.addEventListener('click', () => this.downloadSelected());
		imageGrid.addEventListener('click', (e) => {
			const target = e.target;
			if (!(target instanceof HTMLElement)) return;

			// Card click
			const card = target.closest('.image-item');
			if (card instanceof HTMLElement && card.dataset.index !== undefined) {
				this.toggleSelection(Number(card.dataset.index));
			}
		});
	}

	async loadImages() {
		const { imageGrid, minWidth, minHeight } = this._views;
		imageGrid.innerHTML = '<div class="state-msg">Loading\u2026</div>';
		this._cardMap.clear();

		try {
			const response = await chrome.runtime.sendMessage(
				message('get-images', {
					tabId: this.tabId,
					filters: { minWidth: parseInt(minWidth.value) || 50, minHeight: parseInt(minHeight.value) || 50 },
				}),
			);
			if (response.error) throw new Error(response.error);
			this.allImages = response.images || [];
			this.selectedImages.clear();
			this._renderImageGrid();
			this._updateCounts();
		} catch (error) {
			showToast('Error: ' + String(error), 'error', this.doc);
			imageGrid.innerHTML = '<div class="state-msg error">Failed to load images: ' + String(error) + '</div>';
		}
	}

	/**
	 * @private
	 */
	_renderImageGrid() {
		const { imageGrid } = this._views;
		this._cardMap.clear();

		if (this.allImages.length === 0) {
			imageGrid.innerHTML =
				'<div class="state-msg">Try clicking Refresh — the images may not have finished loading yet.<br>You can also increase the size filter, as no images may currently meet the selected size requirements.</div>';
			return;
		}

		// Gom nhóm, giữ thứ tự DOM
		/** @type {Map<string, number[]>} */
		const groups = new Map();
		this.allImages.forEach((img, index) => {
			const key = img.groupKey || '__ungrouped__';
			if (!groups.has(key)) groups.set(key, []);
			// @ts-ignore: The `groups.get(key)` below always returns the correct result.
			groups.get(key).push(index);
		});

		const fragment = document.createDocumentFragment();
		let groupNum = 0;

		for (const [key, indexes] of groups) {
			groupNum++;
			const isSolo = key.startsWith('solo_');

			if (groups.size > 1 && !isSolo) {
				const label = this.allImages[indexes[0]]?.groupLabel || `Group ${groupNum}`;
				const sep = document.createElement('div');
				sep.className = 'group-sep';
				// data-indexes lưu trên sep để delegation bắt được
				sep.innerHTML = `<span>${label} <em>${indexes.length} images</em></span>`;
				fragment.appendChild(sep);
			}

			indexes.forEach((index) => {
				const card = this._buildImageCard(this.allImages[index], index);
				this._cardMap.set(index, card);
				fragment.appendChild(card);
			});
		}

		imageGrid.innerHTML = '';
		imageGrid.appendChild(fragment);
	}

	/**
	 * @private
	 * @param {import('../../../../background_modules/DebuggerManager.js').ImageResult} img
	 * @param {number} index
	 */
	_buildImageCard(img, index) {
		const item = document.createElement('div');
		item.className = 'image-item';
		item.dataset.index = String(index);

		const image = document.createElement('img');
		image.src = img.src;
		image.alt = 'Image ' + (index + 1);
		image.loading = 'lazy';

		const footer = document.createElement('div');
		footer.className = 'item-footer';

		const chk = document.createElement('div');
		chk.className = 'custom-checkbox';
		chk.innerHTML =
			'<svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="#e2d9f3" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

		const lbl = document.createElement('span');
		lbl.className = 'item-label';
		lbl.textContent = 'Image ' + (index + 1);

		const dims = document.createElement('span');
		dims.className = 'item-dims';
		dims.textContent = img.width && img.height ? img.width + '\xd7' + img.height : '';

		footer.appendChild(chk);
		footer.appendChild(lbl);
		footer.appendChild(dims);

		const urlPrev = document.createElement('div');
		urlPrev.className = 'url-preview';
		urlPrev.textContent = img.src;

		item.appendChild(image);
		item.appendChild(footer);
		item.appendChild(urlPrev);

		return item;
	}

	/** @param {number} index */
	toggleSelection(index) {
		if (this.rangeMode) {
			if (this.rangeAnchor === null) {
				this.rangeAnchor = index;
				this.selectedImages.add(index);
				this._applyCardSelection(index);
				this._markRangeAnchor(index, true);
				showToast('Start: image ' + (index + 1) + ' \u2014 choose end image to select range', 'info', this.doc);
			} else {
				const from = Math.min(this.rangeAnchor, index);
				const to = Math.max(this.rangeAnchor, index);
				for (let i = from; i <= to; i++) {
					this.selectedImages.add(i);
					this._applyCardSelection(i);
				}
				this._markRangeAnchor(this.rangeAnchor, false);
				showToast(
					'Selected ' + (to - from + 1) + ' images (' + (from + 1) + ' \u2192 ' + (to + 1) + ')',
					'success',
					this.doc,
				);
				this.rangeAnchor = null;
				this.rangeMode = false;
				this._updateRangeBtn();
			}
		} else {
			if (this.selectedImages.has(index)) this.selectedImages.delete(index);
			else this.selectedImages.add(index);
			this._applyCardSelection(index);
		}
		this._updateCounts();
	}

	toggleRangeMode() {
		this.rangeMode = !this.rangeMode;
		if (!this.rangeMode && this.rangeAnchor !== null) {
			this._markRangeAnchor(this.rangeAnchor, false);
			this.rangeAnchor = null;
		}
		this._updateRangeBtn();
		if (this.rangeMode) showToast('Range mode opened: choose start image', 'info', this.doc);
	}

	/**
	 * @private
	 */
	_updateRangeBtn() {
		const { selectRange, imageGrid } = this._views;
		if (this.rangeMode) {
			selectRange.classList.add('btn-range-active');
			selectRange.textContent = this.rangeAnchor !== null ? '⬡ Choose end image\u2026' : '⬡ Choose start image\u2026';
			imageGrid.classList.add('range-selecting');
		} else {
			selectRange.classList.remove('btn-range-active');
			selectRange.textContent = 'Select Range';
			imageGrid.classList.remove('range-selecting');
		}
	}

	/**
	 * @private
	 * @param {number} index
	 * @param {boolean} active
	 */
	_markRangeAnchor(index, active) {
		this._cardMap.get(index)?.classList.toggle('range-anchor', active);
	}

	/**
	 * @private
	 * @param {number} index
	 */
	_applyCardSelection(index) {
		this._cardMap.get(index)?.classList.toggle('selected', this.selectedImages.has(index));
	}

	selectAll() {
		this.allImages.forEach((_, i) => {
			this.selectedImages.add(i);
			this._applyCardSelection(i);
		});
		this._updateCounts();
	}

	deselectAll() {
		this.selectedImages.clear();
		this._cardMap.forEach((card) => card.classList.remove('selected'));
		this._updateCounts();
	}

	/**
	 * @private
	 */
	_updateCounts() {
		const { imageCount, selectedCount, downloadBtn } = this._views;
		imageCount.textContent = this.allImages.length + ' images';
		selectedCount.textContent = this.selectedImages.size + ' selected';
		downloadBtn.disabled = this.selectedImages.size === 0 || !this.directoryHandle;

		const count = this.selectedImages.size || this.allImages.length;
		this.formatter.autoSetPad(count);
	}

	async selectFolder() {
		try {
			// @ts-expect-error: File System Access API not yet in lib.dom
			this.directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'downloads' });
			if (!this.directoryHandle) return;

			// Lưu handle vào IndexedDB để lần sau không cần chọn lại
			await saveDirectoryHandle(this.directoryHandle);

			const { folderInfo } = this._views;
			folderInfo.textContent = '\ud83d\udcc1 ' + this.directoryHandle.name;
			folderInfo.classList.add('active');
			this._updateCounts();
		} catch (error) {
			if (error instanceof Error && error.name !== 'AbortError')
				showToast('Error: ' + String(error), 'error', this.doc);
		}
	}

	async downloadSelected() {
		if (!this.directoryHandle || this.selectedImages.size === 0) return;

		// Kiểm tra và kích hoạt lại quyền ghi nếu cần
		const hasPermission = await verifyPermission(this.directoryHandle, true);
		if (!hasPermission) {
			showToast('Please grant write permission to download images', 'error', this.doc);
			return;
		}

		const now = Date.now();
		const indexes = Array.from(this.selectedImages);
		const { progressModal, progressFill, progressText } = this._views;

		progressModal.classList.add('show');
		let ok = 0,
			fail = 0;

		for (let i = 0; i < indexes.length; i++) {
			const img = this.allImages[indexes[i]];
			progressFill.style.width = ((i + 1) / indexes.length) * 100 + '%';
			progressText.textContent = i + 1 + ' / ' + indexes.length;
			try {
				await this._downloadImage(now, img.src, i);
				ok++;
			} catch (e) {
				console.error('Failed: ' + img.src, e);
				fail++;
			}
			// await sleep(60);
		}

		progressModal.classList.remove('show');
		showToast(
			fail > 0 ? 'Downloaded ' + ok + '/' + indexes.length + ' (' + fail + ' failed)' : 'Downloaded ' + ok + ' images!',
			fail > 0 ? 'warning' : 'success',
			this.doc,
		);
	}

	/**
	 * @private
	 * @param {number} timestamp
	 * @param {string} url
	 * @param {number} index
	 */
	async _downloadImage(timestamp, url, index) {
		const response = await chrome.runtime.sendMessage(message('get-image-data', { tabId: this.tabId, url }));
		if (!response.success) throw new Error(response.error);

		const { body, base64Encoded, mimeType } = response.data;
		let blob;
		if (base64Encoded) {
			const bin = atob(body);
			const bytes = new Uint8Array(bin.length);
			for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
			blob = new Blob([bytes], { type: mimeType });
		} else {
			const bytes = new Uint8Array(body.length);
			for (let i = 0; i < body.length; i++) bytes[i] = body.charCodeAt(i);
			blob = new Blob([bytes], { type: mimeType });
		}

		const ext = this.formatter.getExt(url);
		const fullPath = this.formatter.format(timestamp, index, url) + ext;
		const parts = fullPath.split('/').filter(Boolean);
		const filename = parts.pop();

		// directoryHandle guaranteed non-null: caller (downloadSelected)
		let dir = this.directoryHandle;
		if (!dir) throw new Error('How???');

		for (const part of parts) dir = await dir.getDirectoryHandle(part, { create: true });
		const fh = await dir.getFileHandle(/** @type {string} */ (filename), { create: true });
		const wr = await fh.createWritable();
		await wr.write(blob);
		await wr.close();
	}
}

/**
 * @param {string} msg
 * @param {string} type
 * @param {Document | ShadowRoot | Element} root
 */
function showToast(msg, type = 'info', root) {
	const container = root.querySelector('#toast-container');
	if (!container) return;
	const toast = document.createElement('div');
	toast.className = `toast ${type}`;
	toast.textContent = msg;
	container.appendChild(toast);
	const dismiss = () => {
		toast.style.animation = 'toastIn .25s ease-out reverse';
		setTimeout(() => toast.parentNode?.removeChild(toast), 260);
	};
	setTimeout(dismiss, 3000);
	toast.addEventListener('click', dismiss);
}
