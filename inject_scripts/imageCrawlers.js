// @ts-check

/**
 * ***Note***: This is an eval function; do not bring any function declarations inside it out.\
 * Only search for and group images by the most recent parent; do not continue grouping by parent.
 *
 * @param {number} minW
 * @param {number} minH
 */
export function crawlImages(minW, minH) {
	const BAD = ['/pixel', '/track', '/analytics', '/beacon', '1x1', 'data:image/gif;base64,R0lGOD'];

	/**
	 * @param {Document | HTMLElement} root
	 * @returns {HTMLImageElement[]}
	 */
	function collectImgs(root) {
		const out = [];
		out.push(...[...root.querySelectorAll('img')]);

		// TODO: Crawl images in shadow DOM
		// It's too expensive and not widely available; a better mechanism will be developed in the future if demand increases.
		// root.querySelectorAll('*').forEach((el) => {
		// 	if (el.shadowRoot) out.push(...collectImgs(el.shadowRoot));
		// });

		return out;
	}

	/**
	 * @param {Element | HTMLElement} el
	 */
	function getGroupLabel(el) {
		if (!el) return '?';
		const tag = el.tagName.toLowerCase();
		const classes = [...el.classList]
			.filter((c) => c.length < 30)
			.slice(0, 3)
			.join('.');
		return classes ? `${tag}.${classes}` : tag;
	}

	const allImgs = collectImgs(document).filter((img) => {
		if (!img.complete || !img.naturalWidth) return false;
		if (img.naturalWidth < minW || img.naturalHeight < minH) return false;
		if (!img.src.startsWith('data:') && BAD.some((p) => img.src.includes(p))) return false;
		return true;
	});

	if (allImgs.length === 0) return [];

	const imgSet = new Set(allImgs);

	/**
	 * @param {HTMLImageElement} img
	 */
	function findTightestContainer(img) {
		let cur = img.parentElement;
		let best = null;
		while (cur && cur.tagName !== 'BODY') {
			const count = [...cur.querySelectorAll('img')].filter((i) => imgSet.has(i)).length;
			if (count > 1) {
				if (best === null || count < best.count) best = { node: cur, count };
				if (best !== null && count > best.count) break;
			}
			cur = cur.parentElement;
		}
		return best ? best.node : null;
	}

	const imgContainer = new Map();
	for (const img of allImgs) {
		const container = findTightestContainer(img);
		imgContainer.set(img, container || img.parentElement || document.body);
	}

	// ── Build count và stable ID
	const containerCount = new Map();
	for (const [, c] of imgContainer) {
		containerCount.set(c, (containerCount.get(c) || 0) + 1);
	}

	const containerId = new Map();
	let nextId = 0;
	for (const [c] of containerCount) {
		containerId.set(c, nextId++);
	}

	return allImgs.map((img) => {
		const container = imgContainer.get(img);
		const count = containerCount.get(container) || 1;
		const id = containerId.get(container);
		const groupKey = count >= 2 ? `group_${id}` : `solo_${id}`;

		return {
			src: img.src,
			width: img.naturalWidth,
			height: img.naturalHeight,
			groupKey,
			groupLabel: getGroupLabel(container),
		};
	});
}

/**
 * Thu thập và gom nhóm ảnh bằng Top-Down List Verification
 * @param {number} minW
 * @param {number} minH
 */
export function crawlImagesAndGroupPhase2(minW, minH) {
	const BAD = ['/pixel', '/track', '/analytics', '/beacon', '1x1', 'data:image/gif;base64,R0lGOD'];

	/**
	 * @param {Document | HTMLElement} root
	 * @returns {HTMLImageElement[]}
	 */
	function collectImgs(root) {
		return [...root.querySelectorAll('img')];
	}

	const allImgs = collectImgs(document).filter((img) => {
		if (!img.complete || !img.naturalWidth) return false;
		if (img.naturalWidth < minW || img.naturalHeight < minH) return false;
		if (!img.src.startsWith('data:') && BAD.some((p) => img.src.includes(p))) return false;
		return true;
	});

	if (allImgs.length === 0) return [];
	const imgSet = new Set(allImgs);

	// ── 1. Map đếm dồn số lượng ảnh cho từng node tổ tiên
	/** @type {Map<Element, number>} */
	const imgCountMap = new Map();
	for (const img of allImgs) {
		let cur = /** @type {Element | null} */ (img);
		while (cur && cur.tagName !== 'BODY') {
			imgCountMap.set(cur, (imgCountMap.get(cur) || 0) + 1);
			cur = cur.parentElement;
		}
	}

	// ── 2. Helpers tính toán cấu trúc con (Multiset)
	/**
	 * @param {Element} el
	 * @returns {Map<string, number>}
	 */
	function childMultiset(el) {
		const m = new Map();
		for (let i = 0; i < el.children.length; i++) {
			const tag = el.children[i].tagName;
			m.set(tag, (m.get(tag) || 0) + 1);
		}
		return m;
	}

	/**
	 * @param {Map<string, number>} a
	 * @param {Map<string, number>} b
	 * @returns {number}
	 */
	function multisetJaccard(a, b) {
		const keys = new Set([...a.keys(), ...b.keys()]);
		let inter = 0;
		let union = 0;
		for (const k of keys) {
			const av = a.get(k) || 0;
			const bv = b.get(k) || 0;
			inter += Math.min(av, bv);
			union += Math.max(av, bv);
		}
		return union === 0 ? 1 : inter / union;
	}

	/**
	 * Majority-vote tính base multiset chuẩn
	 * @param {Map<string, number>[]} multisets
	 * @returns {Map<string, number>}
	 */
	function computeBaseMultiset(multisets) {
		if (multisets.length === 0) return new Map();
		const allKeys = new Set();
		for (const m of multisets) for (const k of m.keys()) allKeys.add(k);
		const base = new Map();
		const half = multisets.length / 2;
		for (const k of allKeys) {
			const counts = multisets.map((m) => m.get(k) || 0);
			const presentIn = counts.filter((c) => c > 0).length;
			if (presentIn > half) {
				const sorted = counts.filter((c) => c > 0).sort((a, b) => a - b);
				const median = sorted[Math.floor(sorted.length / 2)];
				if (median > 0) base.set(k, median);
			}
		}
		return base;
	}

	/**
	 * @param {Element} el
	 * @returns {boolean}
	 */
	function layoutConfidence(el) {
		const s = window.getComputedStyle(el);
		if (s.display === 'grid' || s.display === 'inline-grid') {
			const cols = s.gridTemplateColumns.trim().split(/\s+/).filter(Boolean);
			const px = cols.map(parseFloat).filter((n) => !isNaN(n) && n > 0);
			if (px.length >= 2) {
				const avg = px.reduce((a, b) => a + b, 0) / px.length;
				if (px.every((v) => Math.abs(v - avg) / avg < 0.05)) return true;
			}
		}
		if (s.display === 'flex' || s.display === 'inline-flex') {
			if (s.flexWrap === 'wrap') return true;
		}
		if (parseInt(s.columnCount, 10) > 1) return true;
		return false;
	}

	/**
	 * @param {Element} el
	 * @returns {boolean}
	 */
	function isGalleryContainer(el) {
		if (el.tagName === 'HTML' || el.tagName === 'BODY') return false;
		if (el.id === 'root' || el.id === '__next' || el.id === 'app') return false;

		const imageBearingChildren = [...el.children].filter((c) => (imgCountMap.get(c) || 0) > 0);
		if (imageBearingChildren.length < 2) return false;

		/** @type {Map<string, Element[]>} */
		const byTag = new Map();
		for (const child of imageBearingChildren) {
			if (!byTag.has(child.tagName)) byTag.set(child.tagName, []);
			// @ts-ignore
			byTag.get(child.tagName).push(child);
		}

		for (const group of byTag.values()) {
			if (group.length < 2) continue;
			const multisets = group.map(childMultiset);
			const base = computeBaseMultiset(multisets);
			if (base.size === 0 && !layoutConfidence(el)) continue;

			let similarCount = 0;
			for (const m of multisets) {
				if (multisetJaccard(base, m) >= 0.5) similarCount++;
			}
			if (similarCount >= 2) return true;
		}

		return false;
	}

	// ── 3. Thu thập ứng viên và nhận diện Gallery
	/** @type {Set<Element>} */
	const candidateSet = new Set();
	for (const img of allImgs) {
		let cur = img.parentElement;
		while (cur && cur.tagName !== 'BODY') {
			candidateSet.add(cur);
			cur = cur.parentElement;
		}
	}

	const detectedGalleries = new Set([...candidateSet].filter((el) => isGalleryContainer(el)));

	// ── 4. Ánh xạ từng ảnh vào Gallery ngoài cùng (Outermost Gallery)
	/** @type {Map<HTMLImageElement, Element>} */
	const imgContainer = new Map();
	/** @type {Set<HTMLImageElement>} */
	const orphanImgs = new Set();

	for (const img of allImgs) {
		let outermostGallery = null;
		let cur = img.parentElement;
		while (cur && cur.tagName !== 'BODY') {
			if (detectedGalleries.has(cur)) outermostGallery = cur;
			cur = cur.parentElement;
		}

		if (outermostGallery) {
			imgContainer.set(img, outermostGallery);
		} else {
			orphanImgs.add(img);
		}
	}

	// ── 5. Fallback Phase 1 cho ảnh mồ côi (gom bài viết nhiều <p>)
	const orphanCountMap = new Map();
	for (const img of orphanImgs) {
		let cur = /** @type {Element | null} */ (img);
		while (cur && cur.tagName !== 'BODY') {
			orphanCountMap.set(cur, (orphanCountMap.get(cur) || 0) + 1);
			cur = cur.parentElement;
		}
	}

	for (const img of orphanImgs) {
		let cur = img.parentElement;
		let best = null;
		while (cur && cur.tagName !== 'BODY') {
			if (detectedGalleries.has(cur)) break;
			const count = orphanCountMap.get(cur) || 0;
			if (count > 1) {
				best = cur;
				break;
			}
			cur = cur.parentElement;
		}
		imgContainer.set(img, best || img.parentElement || document.body);
	}

	// ── 6. Định danh nhóm ổn định và nhãn sạch
	const containerCount = new Map();
	for (const [, c] of imgContainer) {
		containerCount.set(c, (containerCount.get(c) || 0) + 1);
	}

	const containerId = new Map();
	let nextId = 0;
	for (const [c] of containerCount) {
		containerId.set(c, nextId++);
	}

	/**
	 * @param {Element} el
	 * @returns {string}
	 */
	function getLabel(el) {
		const tag = el.tagName.toLowerCase();
		const id = el.id ? `#${el.id}` : '';
		const classes = [...el.classList]
			.filter((c) => c.length < 30 && !/[\/:\[\]#.]/.test(c))
			.slice(0, 2)
			.join('.');
		return classes ? `${tag}.${classes}${id}` : `${tag}${id}`;
	}

	return allImgs.map((img) => {
		const container = imgContainer.get(img) || document.body;
		const count = containerCount.get(container) || 1;
		const id = containerId.get(container);
		const groupKey = count >= 2 ? `group_${id}` : `solo_${id}`;

		return {
			src: img.src,
			width: img.naturalWidth,
			height: img.naturalHeight,
			groupKey,
			groupLabel: getLabel(container),
		};
	});
}
