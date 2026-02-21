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
 * ***Note***: This is an eval function; do not bring any function declarations inside it out.\
 * Find and group images by their closest parent, then continue grouping by parent if multiple parents share the same fingerprint.
 *
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
		const out = [];
		out.push(...[...root.querySelectorAll('img')]);
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

	/**
	 * @type {Map<HTMLImageElement, HTMLElement>}
	 */
	const imgContainer = new Map();
	for (const img of allImgs) {
		const container = findTightestContainer(img);
		imgContainer.set(img, container || img.parentElement || document.body);
	}

	// ── Phase 2
	const uniqueContainers = [...new Set(imgContainer.values())];

	// Group containers theo full selector (tag + all classes)
	/**
	 * @param {Element} el
	 */
	const selectorOf = (el) => {
		const classes = [...el.classList].filter((c) => c.length < 30);
		return classes.length ? el.tagName.toLowerCase() + '.' + classes.join('.') : null;
	};

	/**
	 * Build map: selector+attrCount -> [containers]
	 * @param {Element} el
	 */
	const fingerprintOf = (el) => {
		const sel = selectorOf(el);
		if (!sel) return null;
		return `${sel}[attrs=${el.attributes.length}]`;
	};

	/**
	 * @type {Map<string, HTMLElement[]>}
	 */
	const selectorGroups = new Map();
	for (const c of uniqueContainers) {
		const fp = fingerprintOf(c);
		if (!fp) continue;

		if (!selectorGroups.has(fp)) selectorGroups.set(fp, []);
		selectorGroups.get(fp)?.push(c);
	}

	// Log containers trùng fingerprint
	for (const [fp, containers] of selectorGroups) {
		if (containers.length >= 2) {
			console.log(`[grouping] Duplicate containers (${containers.length}x): "${fp}"`);
			containers.forEach((c, i) => console.log(`  [${i}]`, c));
		}
	}

	const containerRemap = new Map();

	for (const [fp, containers] of selectorGroups) {
		if (containers.length < 2) continue;

		/**
		 * @param {Node[]} nodes
		 */
		function findCommonAncestor(nodes) {
			let cur = nodes[0].parentElement;
			while (cur && cur.tagName !== 'BODY') {
				if (nodes.every((n) => cur?.contains(n))) return cur;
				cur = cur.parentElement;
			}
			return null;
		}

		const ancestor = findCommonAncestor(containers);
		if (!ancestor) {
			console.log(`[grouping] No common ancestor found for "${fp}"`);
			continue;
		}

		const sel = selectorOf(containers[0]);
		const siblingsInAncestor = [...ancestor.children].filter((el) => el.matches(String(sel)));
		console.log(
			`[grouping] "${fp}" -> ancestor: <${ancestor.tagName.toLowerCase()}` +
				(ancestor.className ? '.' + [...ancestor.classList].slice(0, 2).join('.') : '') +
				`>, direct children matching: ${siblingsInAncestor.length}`,
			siblingsInAncestor,
		);

		for (const c of containers) containerRemap.set(c, ancestor);
	}

	// Apply remap
	for (const [img, container] of imgContainer) {
		const remapped = containerRemap.get(container);
		if (remapped) imgContainer.set(img, remapped);
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
		if (!container) throw new Error('How???');

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
