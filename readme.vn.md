# Image Downloader — Chrome Extension

Extension Chrome giúp tìm, nhóm và tải ảnh từ các trang web bạn đang duyệt — miễn là server trả về file ảnh thô qua mạng (JPEG, PNG, WebP, v.v.). Hoạt động tốt với hầu hết các trang web thông thường, kể cả những trang yêu cầu đăng nhập hoặc dùng lazy-loading, nhưng không thể lấy ảnh được giải mã hoàn toàn trong trình duyệt (ví dụ: game WebGL/Unity dùng asset đóng gói sẵn).

Cách sử dụng: https://drive.google.com/file/d/13bz9ucluyaMoF1yUwSSEfSfppfwh1qxJ/view?usp=sharing

---

## Tính năng

- **Hiển thị ảnh theo nhóm DOM** — dễ dàng chọn các ảnh liên quan với nhau (ví dụ: ảnh trong một gallery, ảnh sản phẩm)
- **Bắt ảnh ở tầng mạng** — dùng Chrome Debugger API để chặn các ảnh không thể truy cập trực tiếp qua DOM (ví dụ: ảnh yêu cầu auth header, ảnh trong iframe hoặc Shadow DOM)
- **Tải hàng loạt về thư mục** — dùng File System Access API để lưu ảnh thẳng vào thư mục bạn chọn, không cần ZIP
- **Lọc theo kích thước** — lọc ảnh theo chiều rộng/chiều cao tối thiểu
- **Chọn theo vùng** — chọn một dải ảnh bằng cách bấm điểm đầu và điểm cuối
- **Tuỳ chỉnh tên file** — kiểm soát cách đặt tên và tổ chức thư mục cho ảnh tải về bằng các token như `{timestamp}`, `{index}`, `{name}`, `{title}`
- **Phím tắt** — nhấn `Alt + Shift + E` trên bất kỳ trang nào để mở giao diện tải ảnh
- **Không phụ thuộc thư viện ngoài** — thuần HTML, CSS và JavaScript. Chỉ dùng `@types/chrome` làm dev dependency cho type checking — không cần `npm install` nếu không có nhu cầu

---

## Công nghệ

| Thành phần         | Công nghệ                                       |
| ------------------ | ----------------------------------------------- |
| Bắt ảnh từ mạng    | Chrome Debugger API (`Network.getResponseBody`) |
| Lưu file           | File System Access API (`showDirectoryPicker`)  |
| Giao diện          | Thuần HTML + CSS + JS (không dùng framework)    |
| Background         | Chrome Service Worker (MV3)                     |
| Kiểm tra kiểu      | JSDoc + `@types/chrome` (chỉ dùng khi dev)      |

---

## Cài đặt (Load Unpacked)

1. Clone hoặc tải repo này về máy
2. Mở Chrome, truy cập `chrome://extensions`
3. Bật **Developer mode** (công tắc góc trên bên phải)
4. Nhấn **Load unpacked** và chọn thư mục project
5. Icon extension sẽ xuất hiện trên thanh công cụ
6. Vào chi tiết extension, cho phép sử dụng trong tab ẩn danh (tùy chọn)

> Không cần build. Mở thẳng thư mục là dùng được.

---

## Cách dùng

1. Mở trang web có chứa ảnh
2. Nhấn vào icon extension → **Open Downloader UI**, hoặc nhấn `Alt + Shift + E`
3. Duyệt và chọn các ảnh muốn tải
4. Nhấn **Choose Location** để chọn thư mục lưu
5. Nhấn **Download**

> **Thấy ít hoặc không có ảnh?** Nhấn nút **↺ Refresh** — trang có thể vẫn đang tải ảnh, hoặc một số ảnh đã load trước khi extension sẵn sàng. Thử cuộn qua trang trước để kích hoạt lazy-load rồi mở lại UI cũng có thể giúp ích.

### Tại sao trình duyệt hiện thanh cảnh báo?

Extension dùng **Chrome Debugger API** để bắt ảnh (kể cả trên các trang yêu cầu xác thực). Chrome sẽ hiển thị thanh `"DevTools đang debug trình duyệt này"` bất cứ khi nào debugger được gắn vào — đây là cảnh báo bảo mật của trình duyệt và không thể tắt được.

- **Giữ nguyên thanh cảnh báo khi đang tải ảnh** — đóng nó sẽ ngắt debugger và có thể khiến download thất bại
- Nếu không cần dùng extension, nhấn **Disable Extension** trong popup để gỡ debugger và ẩn thanh cảnh báo

---

## Cấu trúc project

```
├── manifest.json
├── background.js                  # Service worker entry
├── background_modules/
│   ├── DebuggerManager.js         # Gắn debugger, cache ảnh từ mạng
│   └── ImageDownloader.js         # Điều phối việc lấy ảnh
├── content.js                     # Inject UI vào trang
├── inject_scripts/
│   └── imageCrawlers.js           # Quét và nhóm ảnh trong DOM
└── public/
    ├── chrome_lib/
    │   └── message-router.js      # Tiện ích gửi/nhận message
    ├── popup/
    │   ├── popup.html / script.js # Popup của extension
    │   └── app/v2/                # Giao diện chính (HTML, CSS, JS)
    └── utils.js                   # Các hàm tiện ích dùng chung
```

---

## Quyền truy cập

| Quyền                          | Lý do                             |
| ------------------------------ | --------------------------------- |
| `debugger`                     | Lấy nội dung response ảnh từ mạng |
| `scripting`                    | Quét DOM để tìm ảnh trên trang    |
| `storage`                      | Ghi nhớ trạng thái bật/tắt        |
| `host_permissions: <all_urls>` | Hoạt động trên mọi trang web      |

---

## Phát triển

Không cần build tool. Nếu muốn dùng type checking qua JSDoc:

```bash
npm install   # chỉ cài @types/chrome
```

Dùng VS Code với TypeScript language server — toàn bộ file đều có `// @ts-check` và JSDoc annotation.
