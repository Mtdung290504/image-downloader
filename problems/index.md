# BẢN ĐỒ QUẢN LÝ LỖI HỆ THỐNG (SYSTEM PROBLEMS MAP)

> **Mục đích**: Chỉ mục tập trung quản lý các lỗi kiến trúc, lỗi runtime và khiếm khuyết dữ liệu của dự án `image-crawler.v4`.  
> **Quy ước**: Mỗi vấn đề được định danh duy nhất (`PRB-xx`), phân loại theo mức độ nghiêm trọng và trỏ đến tài liệu chi tiết trong `problems/details/`.

---

## 1. Bảng Chỉ Mục Vấn Đề (Problem Index)

| ID | Done | Vấn đề kỹ thuật | Tệp ảnh hưởng | Mức độ | Trạng thái | Tài liệu chi tiết |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `PRB-01` | [x] | Crash `DOMException` do selector class Tailwind & cơ chế gom nhóm Phase 2 thiếu tin cậy | [imageCrawlers.js](file:///c:/Chrome_Extentions/image-crawler.v4/inject_scripts/imageCrawlers.js#L105-L286) | **Chí tử** | **Hoàn thành (Done)** | [01-dom-grouping-class-dependency.md](file:///c:/Chrome_Extentions/image-crawler.v4/problems/details/01-dom-grouping-class-dependency.md) |
| `PRB-02` | [ ] | Ký tự cấm `<>:"/\\|?*` trong `{title}` làm gãy download trên Windows File System | [app.js](file:///c:/Chrome_Extentions/image-crawler.v4/public/popup/app/v2/app.js#L115-L120) | **Chí tử** | Chờ chi tiết | *Sẽ bổ sung* |
| `PRB-03` | [ ] | Lỗi download ảnh Data URI / Base64 do CDP `Page.getResourceContent` không hỗ trợ | [ImageDownloader.js](file:///c:/Chrome_Extentions/image-crawler.v4/background_modules/ImageDownloader.js#L151-L157) | **Chí tử** | Chờ chi tiết | *Sẽ bổ sung* |
| `PRB-04` | [ ] | Service Worker MV3 bị idle terminate sau 30s làm mất sạch `imageCache` trong RAM | [DebuggerManager.js](file:///c:/Chrome_Extentions/image-crawler.v4/background_modules/DebuggerManager.js#L19-L27) | **Nghiêm trọng** | Chờ chi tiết | *Sẽ bổ sung* |
| `PRB-05` | [ ] | Lưu `FileSystemDirectoryHandle` vào IndexedDB của Content Script (sai origin, lộ bảo mật) | [folderStorage.js](file:///c:/Chrome_Extentions/image-crawler.v4/public/popup/app/v2/folderStorage.js#L11-L23) | **Nghiêm trọng** | Chờ chi tiết | *Sẽ bổ sung* |
| `PRB-06` | [ ] | Message port bị treo và bắn console error ở route `open-ui` do không gọi response | [message-router.js](file:///c:/Chrome_Extentions/image-crawler.v4/public/chrome_lib/message-router.js#L42-L48) | **Trung bình** | Chờ chi tiết | *Sẽ bổ sung* |
| `PRB-07` | [ ] | Thứ tự index file tải về bị xáo trộn do `Set<number>` duyệt theo insertion-order | [app.js](file:///c:/Chrome_Extentions/image-crawler.v4/public/popup/app/v2/app.js#L560) | **Trung bình** | Chờ chi tiết | *Sẽ bổ sung* |
| `PRB-08` | [ ] | Kẹt trạng thái Range Mode (`rangeAnchor`) khi bấm "Deselect All" hoặc "Refresh" | [app.js](file:///c:/Chrome_Extentions/image-crawler.v4/public/popup/app/v2/app.js#L511-L515) | **Trung bình** | Chờ chi tiết | *Sẽ bổ sung* |
| `PRB-09` | [ ] | Hỏng mã hóa ký tự UTF-8 đối với SVG text khi `base64Encoded: false` | [app.js](file:///c:/Chrome_Extentions/image-crawler.v4/public/popup/app/v2/app.js#L606-L610) | **Trung bình** | Chờ chi tiết | *Sẽ bổ sung* |
| `PRB-10` | [ ] | Race condition `attach`/`detach` giữa toggle extension và reload tab trong popup | [ImageDownloader.js](file:///c:/Chrome_Extentions/image-crawler.v4/background_modules/ImageDownloader.js#L49-L54) | **Trung bình** | Chờ chi tiết | *Sẽ bổ sung* |
| `PRB-11` | [ ] | Tự động kích hoạt `crawlImagesAndGroupPhase2` ngầm trên mọi tab khi nạp trang | [index.js](file:///c:/Chrome_Extentions/image-crawler.v4/public/content_modules/v2/index.js#L81-L114) | **Trung bình** | Chờ chi tiết | *Sẽ bổ sung* |

---

## 2. Hướng Dẫn Điều Phối Dành Cho Audit / Coding Agent

- **Batch Read 1 lượt:** Mở trực tiếp file chi tiết trong `problems/details/` tương ứng với mã `PRB-xx` đang xử lý.
- **Tuân thủ ranh giới:** Không sửa đổi các thành phần ngoài phạm vi tệp được chỉ định trong từng problem spec.
- **Tiêu chuẩn nghiệm thu:** Mọi bản vá bắt buộc phải thỏa mãn mục `Acceptance Criteria` trong từng file chi tiết trước khi đóng task.
