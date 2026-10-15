// @ts-check

const DB_NAME = 'ImageDownloader_FS';
const STORE_NAME = 'handles';
const KEY = 'active_directory_handle';

/**
 * Mở hoặc khởi tạo IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, 1);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME);
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

/**
 * Lưu FileSystemDirectoryHandle vào IndexedDB
 * @param {FileSystemDirectoryHandle} handle
 * @returns {Promise<void>}
 */
export async function saveDirectoryHandle(handle) {
	try {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readwrite');
			const store = tx.objectStore(STORE_NAME);
			const req = store.put(handle, KEY);
			req.onsuccess = () => resolve();
			req.onerror = () => reject(req.error);
		});
	} catch (err) {
		console.warn('Lỗi khi lưu folder handle vào IndexedDB:', err);
	}
}

/**
 * Khôi phục FileSystemDirectoryHandle đã lưu từ IndexedDB
 * @returns {Promise<FileSystemDirectoryHandle | null>}
 */
export async function getSavedDirectoryHandle() {
	try {
		const db = await openDB();
		return new Promise((resolve) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const req = store.get(KEY);
			req.onsuccess = () => resolve(req.result || null);
			req.onerror = () => resolve(null);
		});
	} catch (err) {
		console.warn('Lỗi khi đọc folder handle từ IndexedDB:', err);
		return null;
	}
}

/**
 * Kiểm tra và kích hoạt lại quyền ghi nếu cần
 * @param {FileSystemDirectoryHandle} handle
 * @param {boolean} [needWrite=true]
 * @returns {Promise<boolean>}
 */
export async function verifyPermission(handle, needWrite = true) {
	if (!handle) return false;
	const opts = needWrite ? { mode: 'readwrite' } : { mode: 'read' };
	try {
		// Kiểm tra quyền hiện tại
		// @ts-expect-error: queryPermission in FileSystemHandle
		if ((await handle.queryPermission(opts)) === 'granted') {
			return true;
		}
		// Yêu cầu cấp lại quyền (chỉ cần 1 click, không phải chọn lại thư mục)
		// @ts-expect-error: requestPermission in FileSystemHandle
		if ((await handle.requestPermission(opts)) === 'granted') {
			return true;
		}
	} catch (err) {
		console.warn('verifyPermission error:', err);
	}
	return false;
}
