# TÀI LIỆU KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE SPEC)

> **Dự án**: Image Downloader — Chrome Extension (Manifest V3)  
> **Phiên bản**: 3.7 | **Môi trường**: Chromium Browser | **Ngôn ngữ**: Pure JavaScript (ES Modules, JSDoc `@ts-check`)  
> **Quy chuẩn văn phong**: Tuân thủ [write-styles.md](file:///C:/Tools_JS_Workplace/.auto-pentest-agent/write-styles.md) (High Signal Density, Zero Ambiguity, Lossless Compression).

---

## 1. Bối Cảnh Dự Án & Mục Tiêu Nghiệp Vụ (Project Context)

### 1.1. Bối cảnh
Phần mở rộng trình duyệt (Chrome Extension) hỗ trợ người dùng tìm kiếm, gom nhóm theo cụm hiển thị (gallery/album) và tải hàng loạt hình ảnh từ bất kỳ trang web nào về thư mục cục bộ trên máy tính.

### 1.2. Mục tiêu kỹ thuật cốt lõi
1. **Bắt ảnh tầng mạng (Network-level Image Interception):** Sử dụng Chrome Debugger API (`chrome.debugger`) bắt nội dung ảnh trực tiếp từ CDP `Network.getResponseBody` đối với các ảnh nằm sau xác thực (auth headers), ảnh nhúng trong Shadow DOM hoặc iframe mà DOM crawler thông thường không truy cập được.
2. **Gom nhóm theo ngữ cảnh DOM (Contextual DOM Grouping):** Tự động nhận diện ranh giới các gallery/album để gom các ảnh có liên quan vào cùng một nhóm thay vì trải phẳng toàn bộ ảnh của trang web.
3. **Lưu file trực tiếp không qua nén ZIP (Native File System Write):** Sử dụng File System Access API (`window.showDirectoryPicker`) ghi trực tiếp từng file nhị phân vào thư mục người dùng đã chọn trên ổ cứng.
4. **Zero Runtime Dependencies:** Toàn bộ runtime hoạt động bằng Native Web APIs (DOM, IndexedDB, File System Access API, Chrome Extension API). Không sử dụng webpack, vite hay thư viện ngoài.

---

## 2. Ngăn Xếp Công Nghệ (Tech Stack)

| Thành phần | Công nghệ / API sử dụng | Trách nhiệm |
| :--- | :--- | :--- |
| **Manifest Spec** | Manifest V3 (MV3) | Khai báo quyền, service worker, content scripts, popup |
| **Tầng mạng (Network)** | Chrome DevTools Protocol (`1.3`) qua `chrome.debugger` | Bắt luồng request ảnh, lấy response body base64 |
| **Tầng DOM (Crawler)** | `chrome.scripting.executeScript` | Quét thẻ `<img>`, đo kích thước thực tế, gom nhóm container |
| **Tầng giao diện (UI)** | Web Components (Shadow DOM) + Pure HTML/CSS | Cách ly hoàn toàn CSS của Extension với CSS của trang web |
| **Tầng lưu trữ (Storage)** | File System Access API + IndexedDB | Ghi file nhị phân vào đĩa; lưu `FileSystemDirectoryHandle` |
| **Giao tiếp (IPC)** | `chrome.runtime.sendMessage` + Custom Router | Định tuyến tin nhắn giữa Content Script, Popup và Background |

---

## 3. Cấu Trúc Thư Mục Dự Án (Project Structure)

```
c:\Chrome_Extentions\image-crawler.v4\
├── manifest.json                    # Cấu hình Chrome Extension Manifest V3
├── background.js                    # Entry point của Service Worker
├── content.js                       # Content script khởi động (Dynamic Loader)
├── background_modules/              # Các module xử lý logic tại Background Service Worker
│   ├── DebuggerManager.js           # Quản lý vòng đời chrome.debugger và cache ảnh mạng
│   └── ImageDownloader.js           # Điều phối crawler, hợp nhất ảnh DOM và ảnh mạng
├── inject_scripts/                  # Scripts thực thi bên trong ngữ cảnh trang web (Eval)
│   └── imageCrawlers.js             # Logic quét DOM, đo kích thước và phân cụm gallery
├── public/                          # Tài nguyên UI và thư viện tiện ích
│   ├── utils.js                     # Utility dùng chung (MIME, URL validator, wait helpers)
│   ├── chrome_lib/
│   │   └── message-router.js        # Utility định tuyến tin nhắn IPC có typed route
│   ├── content_modules/v2/
│   │   └── index.js                 # Quản lý Host Overlay Shadow DOM, phím tắt Alt+Shift+E
│   └── popup/                       # Giao diện Action Popup của extension
│       ├── popup.html / script.js   # Giao diện bật/tắt extension và mở UI
│       └── app/                     # Ứng dụng chính của Downloader UI
│           ├── v2/                  # Mã nguồn ứng dụng v2 (Modal chính)
│           │   ├── index.html       # Template cấu trúc modal, filter bar, grid, progress
│           │   ├── style.css        # Toàn bộ CSS giao diện Dark theme
│           │   ├── app.js           # Controller chính: quản lý state, selection, file naming, download
│           │   └── folderStorage.js # Quản lý lưu trữ FileSystemDirectoryHandle qua IndexedDB
│           └── @usable_lib/         # Micro-libraries nội bộ (View binding, Element builder)
│               ├── view_binding/    # Binding declarative 2 chiều giữa JS object và DOM
│               ├── element_builder/ # Fluent API builder để tạo DOM elements
│               ├── debounce/        # Utility debounce hàm
│               └── utils/           # Type helpers (type-helmet, lazy-code)
├── problems/                        # Quản lý các lỗi kiến trúc và tài liệu audit
│   ├── index.md                     # Bản đồ chỉ mục 11 lỗi hệ thống (PRB-01 -> PRB-11)
│   └── details/                     # Chi tiết lỗi và spec kỹ thuật xử lý (PRB-01)
├── AGENTS.md                        # Quy chuẩn điều phối Agent & triết lý Lazy Senior Dev
└── architecture.md                  # Tài liệu kiến trúc toàn hệ thống (tệp này)
```

---

## 4. Mô Tả Chi Tiết Các Tệp Nguồn (Source Files Inventory)

### 4.1. Tầng Background Service Worker

- **[`manifest.json`](file:///c:/Chrome_Extentions/image-crawler.v4/manifest.json)**: Khai báo quyền `debugger`, `scripting`, `storage`; host permissions `<all_urls>`; cấu hình service worker dạng ES module (`"type": "module"`).
- **[`background.js`](file:///c:/Chrome_Extentions/image-crawler.v4/background.js)**: Entry point background. Khởi tạo instance `ImageDownloader`; đăng ký các route tin nhắn: `toggle-extension`, `open-ui`, `get-images`, `get-image-data`, `get-active-state`, `get-current-tab`.
- **[`background_modules/DebuggerManager.js`](file:///c:/Chrome_Extentions/image-crawler.v4/background_modules/DebuggerManager.js)**: Quản lý kết nối `chrome.debugger`. Lắng nghe CDP event `Network.responseReceived` và `Network.loadingFinished`; gọi `Network.getResponseBody` để lưu trữ dữ liệu nhị phân base64 vào RAM (`imageCache`); lưu metadata vào `networkImages`. Giới hạn `MAX_CACHE_SIZE = 500`.
- **[`background_modules/ImageDownloader.js`](file:///c:/Chrome_Extentions/image-crawler.v4/background_modules/ImageDownloader.js)**: Tầng điều phối dữ liệu (Service Layer). Thực thi `crawlImagesAndGroupPhase2` qua `chrome.scripting.executeScript`; lọc ra các ảnh network-only (có trong cache debugger nhưng không có trong DOM); phục vụ dữ liệu ảnh qua `getImageData` (lấy từ cache RAM hoặc fallback sang CDP `Page.getResourceContent`).

### 4.2. Tầng Content Script & Injected Logic

- **[`content.js`](file:///c:/Chrome_Extentions/image-crawler.v4/content.js)**: Script mồi (stub loader). Sử dụng dynamic `import()` nạp `public/content_modules/v2/index.js` từ `chrome.runtime.getURL`.
- **[`public/content_modules/v2/index.js`](file:///c:/Chrome_Extentions/image-crawler.v4/public/content_modules/v2/index.js)**: Quản lý vòng đời UI trên trang web. Tạo custom element `<extension-host>` gắn vào `document.body`; mở Open Shadow DOM để nhúng toàn bộ UI; đăng ký phím tắt toggle `Alt + Shift + E` và phím `Escape`; lắng nghe message `open-ui` từ background.
- **[`inject_scripts/imageCrawlers.js`](file:///c:/Chrome_Extentions/image-crawler.v4/inject_scripts/imageCrawlers.js)**: Chứa các hàm crawler độc lập chạy trong ngữ cảnh isolated world của tab mục tiêu qua `executeScript`. Chịu trách nhiệm lọc ảnh theo kích thước `(minW, minH)`, lọc URL rác (tracking pixels, beacon, 1x1 base64), và phân cụm ảnh theo ranh giới container.

### 4.3. Tầng Giao Diện Người Dùng (Popup & Modal App)

- **[`public/popup/popup.html`](file:///c:/Chrome_Extentions/image-crawler.v4/public/popup/popup.html)** & **[`public/popup/script.js`](file:///c:/Chrome_Extentions/image-crawler.v4/public/popup/script.js)**: Giao diện popup thanh công cụ. Quản lý cờ `extensionEnabled` trong `chrome.storage.local`; gửi lệnh mở UI modal (`open-ui`); quản lý nút bật/tắt debugger.
- **[`public/popup/app/v2/index.html`](file:///c:/Chrome_Extentions/image-crawler.v4/public/popup/app/v2/index.html)**: Template HTML của modal chính. Định nghĩa thanh công cụ (Select All, Deselect All, Select Range, Refresh, Filter W/H), lưới hiển thị thẻ ảnh (`#imageGrid`), thanh footer chọn thư mục, nút tải và bảng cấu hình định dạng tên tệp (`#formatterPanel`).
- **[`public/popup/app/v2/style.css`](file:///c:/Chrome_Extentions/image-crawler.v4/public/popup/app/v2/style.css)**: Định kiểu toàn diện cho modal ứng dụng: Dark theme, CSS Grid co giãn cho card ảnh, trạng thái checkbox tùy biến, toast notification và progress bar modal.
- **[`public/popup/app/v2/app.js`](file:///c:/Chrome_Extentions/image-crawler.v4/public/popup/app/v2/app.js)**: Controller trung tâm của UI (`ImageDownloaderApp`).
  - Quản lý state danh sách ảnh (`allImages`), tập chỉ số đang chọn (`selectedImages`), thư mục lưu trữ (`directoryHandle`).
  - Điều phối chế độ chọn dải (`rangeMode`, `rangeAnchor`).
  - Tích hợp `FilenameFormatter`: format tên file theo token `{timestamp}`, `{index}`, `{name}`, `{title}`.
  - Vòng lặp tải file: gửi message `get-image-data` lấy base64 $\rightarrow$ chuyển đổi thành `Blob` $\rightarrow$ ghi file nhị phân qua `FileSystemWritableFileStream`.
- **[`public/popup/app/v2/folderStorage.js`](file:///c:/Chrome_Extentions/image-crawler.v4/public/popup/app/v2/folderStorage.js)**: Giao tiếp IndexedDB (`ImageDownloader_FS`, object store `handles`). Lưu và đọc `FileSystemDirectoryHandle`; kiểm tra và yêu cầu cấp lại quyền đọc/ghi qua `verifyPermission`.

### 4.4. Thư Viện Tiện Ích Nội Bộ (Libraries & Utilities)

- **[`public/chrome_lib/message-router.js`](file:///c:/Chrome_Extentions/image-crawler.v4/public/chrome_lib/message-router.js)**: Bộ định tuyến tin nhắn IPC. Cung cấp `createMessageListener()` dạng fluent API (`.on(route, handler).export()`) và helper tạo payload `message(route, data)`.
- **[`public/utils.js`](file:///c:/Chrome_Extentions/image-crawler.v4/public/utils.js)**: Các hàm tiện ích thuần: `sleep()`, `waitFor()`, kiểm tra scheme debuggable `isDebuggableURL()`, regex nhận diện URL ảnh `urlLooksLikeImage()`, suy đoán MIME type từ đuôi file `guessMimeType()`.
- **[`public/popup/app/@usable_lib/view_binding/`](file:///c:/Chrome_Extentions/image-crawler.v4/public/popup/app/@usable_lib/view_binding/)**: Thư viện binding view nội bộ. Cho phép định nghĩa map selector kèm ràng buộc tag name (ví dụ `#btn = button`), tự động query và trả về Proxy object quản lý phần tử.
- **[`public/popup/app/@usable_lib/element_builder/`](file:///c:/Chrome_Extentions/image-crawler.v4/public/popup/app/@usable_lib/element_builder/)**: Fluent builder khởi tạo DOM elements hỗ trợ thiết lập thuộc tính, class, style và gắn vào cây DOM không dùng cú pháp imperative truyền thống.

---

## 5. Luồng Dữ Liệu Toàn Hệ Thống (End-to-End Data Flow)

```
[Người dùng: Bấm Alt+Shift+E hoặc Icon Popup]
       │
       ▼
[Content Script: public/content_modules/v2/index.js]
       │ Mở Overlay Shadow DOM, gọi app.loadImages()
       ▼
[IPC Message: get-images { tabId, filters }]
       │
       ▼
[Background: background_modules/ImageDownloader.js]
       ├── 1. Gọi chrome.scripting.executeScript(crawlImagesAndGroupPhase2)
       │      └── Quét thẻ <img> trên tab mục tiêu, lọc kích thước, gom nhóm
       │
       ├── 2. Lấy network-only images từ DebuggerManager.getNetworkImages()
       │      └── Bù đắp các ảnh có trong cache mạng nhưng không nằm trong DOM tĩnh
       │
       └── 3. Hợp nhất danh sách -> Trả về mảng ImageResult[]
       │
       ▼
[UI Controller: public/popup/app/v2/app.js]
       │ Render thẻ ảnh lên #imageGrid theo từng Group
       │ Người dùng chọn ảnh và chọn thư mục lưu qua File System Access API
       │ Bấm "Download"
       │
       ▼ (Lặp qua từng ảnh được chọn)
[IPC Message: get-image-data { tabId, url }]
       │
       ▼
[Background: DebuggerManager]
       │ Lấy body base64 từ RAM cache (hoặc gọi Page.getResourceContent)
       │ Trả về { body, base64Encoded, mimeType }
       │
       ▼
[UI Controller: app.js]
       │ Chuyển đổi Base64 -> Uint8Array -> Blob
       │ Xử lý đường dẫn qua FilenameFormatter (tạo subfolder nếu có)
       │ Ghi nhị phân trực tiếp: FileSystemFileHandle.createWritable() -> write(blob) -> close()
       ▼
[Hoàn tất ghi file vào đĩa cứng]
```

---

## 6. Ranh Giới Thực Thi & Quyền Hạn (Security & Execution Boundaries)

1. **Ranh giới Isolated World (Content Script):**
   - Mã nguồn trong `content.js` và `public/content_modules/v2/index.js` chạy trong Isolated World của tab. 
   - Không bị ảnh hưởng bởi biến toàn cục JS của trang web, nhưng **dùng chung DOM và Storage Partition (IndexedDB)** với trang web sở tại.
2. **Ranh giới Shadow DOM (UI Isolation):**
   - Toàn bộ giao diện extension được bọc kín trong `attachShadow({ mode: 'open' })` dưới thẻ `<extension-host>`.
   - CSS của trang web mục tiêu không thể can thiệp hoặc làm vỡ layout của Extension UI.
3. **Quyền Hạn Debugger (Chrome Security):**
   - Sử dụng quyền `debugger` bắt buộc trình duyệt hiển thị thanh thông báo bảo mật (*"DevTools is debugging this browser"*).
   - Chrome cấm tuyệt đối việc gắn debugger vào các URL hệ thống (`chrome://`, `chrome-extension://`, Chrome Web Store). Module [`utils.js`](file:///c:/Chrome_Extentions/image-crawler.v4/public/utils.js#L11-L25) đóng vai trò chốt chặn kiểm tra `isDebuggableURL` trước mọi thao tác `attach`.
