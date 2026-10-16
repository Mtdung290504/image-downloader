# SPEC CHI TIẾT: PRB-01 — TÁI CẤU TRÚC THUẬT TOÁN GOM NHÓM ẢNH (DOM IMAGE GROUPING)

> **Mã định danh**: `PRB-01`  
> **Tệp tác động trực tiếp**: [`inject_scripts/imageCrawlers.js`](file:///c:/Chrome_Extentions/image-crawler.v4/inject_scripts/imageCrawlers.js)  
> **Mức độ nghiêm trọng**: **Chí tử (Fatal Bug / Runtime Crash)**  
> **Chuẩn văn phong**: Tuân thủ tuyệt đối [write-styles.md](file:///C:/Tools_JS_Workplace/.auto-pentest-agent/write-styles.md) (High Signal Density, Zero Ambiguity, Lossless Compression).

---

## 1. Hướng Dẫn Nạp Ngữ Cảnh Nhanh Cho Coding Agent (Batch Reading Scope)

Đọc đồng thời 3 vị trí sau trong 1 turn duy nhất trước khi sửa code:

1. **Vùng mã nguồn cần thay thế:**  
   [imageCrawlers.js#L175-L286](file:///c:/Chrome_Extentions/image-crawler.v4/inject_scripts/imageCrawlers.js#L175-L286): Khối Phase 2 hiện tại (`selectorOf`, `fingerprintOf`, `findCommonAncestor`, `el.matches`).
2. **Caller nạp hàm:**  
   [ImageDownloader.js#L82-L128](file:///c:/Chrome_Extentions/image-crawler.v4/background_modules/ImageDownloader.js#L82-L128): Hàm `getImagesData` nạp và chạy `crawlImagesAndGroupPhase2` qua `chrome.scripting.executeScript`. Lưu ý: dòng 122 đã tự bọc tiền tố `Child of: [...]`.
3. **Mã nguồn giải thuật tham chiếu:**  
   [`html_parser/index.js#L2204-L2283`](file:///C:/Tools_JS_Workplace/.auto-pentest-agent/src/html_parser/index.js#L2204-L2283): Thuật toán `childMultiset`, `computeBaseMultiset` (median theo đa số), `layoutConfidence`, `multisetJaccard`.

---

## 2. Mô Tả Lỗi Gốc (Root Cause Summary)

1. **Crash `DOMException`:** Lệnh `el.matches(String(sel))` tại [imageCrawlers.js#L241](file:///c:/Chrome_Extentions/image-crawler.v4/inject_scripts/imageCrawlers.js#L241) ném ngoại lệ khi gặp class Tailwind chứa ký tự `:`, `/`, `[`, `]`, `.`. Script inject bị reject làm `domImages = []`.
2. **Phụ thuộc `classList` & `attributes.length`:** Gây phân cụm sai lệch khi phần tử có attribute động hoặc class trạng thái.
3. **Phỏng đoán Bottom-Up thiếu ranh giới:** Dễ nuốt cả trang web lên `#root`/`main` hoặc xé vụn gallery Masonry chia cột.

---

## 3. Kiến Trúc Thuật Toán Mới: Top-Down List Verification

> **Nguyên tắc cốt lõi:** Thay thế việc leo ngược phỏng đoán bằng việc xác thực List đa tầng từ tập tổ tiên của ảnh. Khi một container được xác nhận là Gallery Container, các con trực tiếp của nó bảo đảm 100% tính đồng cấu. Ánh xạ mỗi ảnh vào **Gallery ngoài cùng (Outermost Gallery)** để hợp nhất trọn vẹn lưới Masonry.

### 3.1. Các hàm thành phần (Tất cả đóng gói bên trong hàm chính)

1. **`childMultiset(el)`**: Đếm tần suất thẻ con trực tiếp của `el` thành `Map<string, number>`.
2. **`multisetJaccard(a, b)`**: Tính độ tương đồng Jaccard chuẩn trên 2 multiset:
   $$\text{Jaccard}(A, B) = \frac{\sum \min(a_k, b_k)}{\sum \max(a_k, b_k)}$$
3. **`computeBaseMultiset(multisets)`**:
   - Thu thập mọi tag xuất hiện trong danh sách.
   - Chỉ giữ lại tag xuất hiện ở $> 50\%$ số phần tử (`presentIn > multisets.length / 2`).
   - Tần suất chuẩn của tag lấy giá trị **Median (trung vị thực sự)** trên các phần tử có chứa tag đó.
4. **`layoutConfidence(el)`**:
   - Grid: `display === 'grid' || display === 'inline-grid'` VÀ các track cột có độ rộng bằng nhau (lệch $< 5\%$) với $\ge 2$ cột. Bố cục trang lệch nhau kiểu `250px 1fr` trả về `false`.
   - Flex: `display === 'flex' || display === 'inline-flex'` VÀ có `flexWrap === 'wrap'`.
   - Multi-column: `parseInt(style.columnCount, 10) > 1`.
5. **Bảng đếm ảnh `imgCountMap`**: Duyệt bottom-up từ mỗi ảnh lên `document.body`, cộng dồn số lượng ảnh mà mỗi node bao bọc. Nhánh con `child` chứa ảnh khi `(imgCountMap.get(child) || 0) > 0` (đúng cả khi `child` là chính thẻ `<img>`).

### 3.2. Tiêu chuẩn xác thực: `isGalleryContainer(el)`
- **Loại trừ cứng:** `HTML`, `BODY`, `#root`, `#__next`, `#app`. (Không cấm `MAIN` để hỗ trợ `<main class="grid">`).
- **Lọc con chứa ảnh:** `imageBearingChildren = [...el.children].filter(c => (imgCountMap.get(c) || 0) > 0)`.
- **Ngưỡng số lượng:** Yêu cầu `imageBearingChildren.length >= 2`.
- **Thẩm định đồng cấu:** Nhóm theo `child.tagName`. Với mỗi nhóm $\ge 2$ phần tử:
  - Tính `base = computeBaseMultiset(multisets)`.
  - Giữ nguyên ngưỡng đồng cấu chuẩn: $\ge 0.5$.
  - Nếu số phần tử có `multisetJaccard(base, m) >= 0.5` đạt $\ge 2$: `return true`.
- Không nhóm nào đạt: `return false`.

### 3.3. Quy trình ánh xạ & Fallback ảnh mồ côi
1. Thu thập ứng viên tổ tiên `candidateSet` từ toàn bộ ảnh hợp lệ.
2. Lọc `detectedGalleries = [...candidateSet].filter(isGalleryContainer)`.
3. Với mỗi ảnh `img`: Duyệt ngược từ `img.parentElement` lên `document.body`, chọn container **xa nhất (cao nhất dưới body)** nằm trong `detectedGalleries`.
4. **Fallback cho ảnh mồ côi (chưa thuộc Gallery nào):** Duyệt ngược lên tìm tổ tiên gần nhất chứa $\ge 2$ ảnh mồ côi (dừng nếu chạm Gallery hoặc Landmark) để gom ảnh bài viết nhiều đoạn văn `<p>`. Nếu không có: Container là `img.parentElement || document.body` (nhóm `solo_*`).
5. **Nhãn trơn:** `getLabel(el)` trả về `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}` (không thêm `Child of: `).

---

## 4. Mã Nguồn Triển Khai Tham Chiếu (Reference Implementation)

```javascript
// @ts-check

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
```

---

## 5. Tiêu Chí Nghiệm Thu

- **AC-1:** Tỷ lệ ném `DOMException` = `0%` trên Tailwind CSS.
- **AC-2:** Lưới Masonry chia cột (Unsplash/Pinterest) nhận chung 1 `groupKey` (Outermost).
- **AC-3:** Bố cục chia trang `250px 1fr` không bao giờ bị nhận nhầm là Gallery.
- **AC-4:** Nhãn `groupLabel` không bị lặp `Child of: [Child of: [...]]`.
