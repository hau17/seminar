# PRD v1.0 — POI & Tour Admin Dashboard

**Version:** 1.0  
**Trạng thái:** Draft — Chờ xác nhận  
**Ngày:** 2026-03-11  
**Tác giả:** BA/PO (từ codebase review)  
**Repo tham chiếu:** `poi-_-tour-admin-dashboard` (AI Studio App `cc7e0a12`)

---

## Mục lục

1. [Overview & Goals](#1-overview--goals)
2. [In-scope / Out-of-scope (MVP)](#2-in-scope--out-of-scope-mvp)
3. [Personas / Roles](#3-personas--roles)
4. [Màn hình & Luồng UI](#4-màn-hình--luồng-ui)
5. [User Stories](#5-user-stories)
6. [Functional Requirements](#6-functional-requirements)
7. [Acceptance Criteria (Given-When-Then)](#7-acceptance-criteria-given-when-then)
8. [Non-functional Requirements](#8-non-functional-requirements)
9. [Data Requirements](#9-data-requirements)
10. [API Assumptions](#10-api-assumptions)
11. [Dependencies & Risks](#11-dependencies--risks)
12. [Open Questions](#12-open-questions)
13. [Future Enhancements](#13-future-enhancements)

---

## 1. Overview & Goals

### Bối cảnh

Admin Dashboard là ứng dụng web nội bộ cho phép quản trị viên (Admin) quản lý tập trung các **điểm tham quan (POI)** và **lộ trình tour** trên bản đồ tương tác. Hệ thống phục vụ cho các hoạt động du lịch/tham quan (địa bàn hiện tại: khu vực Đà Nẵng, tọa độ trung tâm ~16.047°N, 108.206°E).

### Mục tiêu sản phẩm (MVP)

| #   | Mục tiêu                                                                          | Đo lường thành công                           |
| --- | --------------------------------------------------------------------------------- | --------------------------------------------- |
| G1  | Admin có thể đăng nhập an toàn vào hệ thống                                       | Đăng nhập thành công, session hợp lệ          |
| G2  | Admin quản lý toàn bộ POIs (CRUD) trực tiếp trên bản đồ                           | Thêm/sửa/xóa POI, dữ liệu persist qua reload  |
| G3  | Admin phân loại POI thành major (Chính) và minor (WC, Bán vé, Gửi xe, Bến thuyền) | Mỗi POI có type đúng, hiển thị icon tương ứng |
| G4  | Admin tạo tour từ tập hợp POIs, sắp xếp thứ tự lộ trình                           | Tour lưu được, preview đường đi trên bản đồ   |

---

## 2. In-scope / Out-of-scope (MVP)

### ✅ In-scope

- Module 1: Admin Login (email + password)
- Module 2: POIs Management — CRUD trên bản đồ, phân loại major/minor
- Module 3: Tours Management — tạo tour từ POIs, sắp xếp thứ tự POIs theo lộ trình
- REST API CRUD cho POI và Tour (Express + SQLite)
- Bản đồ tương tác (Leaflet) với tile provider CARTO Dark

### ❌ Out-of-scope (MVP)

- Quản lý người dùng / phân quyền nhiều role
- Upload ảnh cho POI
- Export/import dữ liệu (CSV, JSON)
- Tìm kiếm / lọc POI hoặc Tour
- Thống kê / analytics
- Giao diện mobile / responsive cho màn nhỏ
- Tích hợp Gemini AI (dù package được cài, chưa sử dụng trong UI)
- Public-facing tour viewer (chỉ có admin view)
- Multi-language

---

## 3. Personas / Roles

### Admin (duy nhất trong MVP)

| Thuộc tính       | Mô tả                                                        |
| ---------------- | ------------------------------------------------------------ |
| Tên vai trò      | Admin                                                        |
| Số lượng user    | Ít (1–5 người nội bộ)                                        |
| Kỹ năng kỹ thuật | Trung bình — biết dùng web app, không cần kỹ năng lập trình  |
| Nhu cầu chính    | Quản lý nhanh POIs và Tours mà không cần dùng DB trực tiếp   |
| Thiết bị         | Desktop browser (Chrome/Edge/Firefox)                        |
| Ngữ cảnh sử dụng | Văn phòng, trước buổi dẫn tour hoặc cập nhật dữ liệu định kỳ |

> **Ghi chú:** MVP chỉ có một role Admin. Chưa có phân quyền.

---

## 4. Màn hình & Luồng UI

### 4.1 Màn hình Login

- Layout: centered card trên nền `zinc-950` (dark)
- Thành phần: Logo icon (MapPin), tiêu đề "Admin Dashboard", sub-title "Quản lý POIs và Lộ trình Tour", form email + password, nút "Đăng nhập"
- State:
  - **Default:** form trống (hoặc prefill `admin@example.com`)
  - **Loading:** (cần thêm) spinner trên nút submit trong khi gọi API
  - **Error:** (cần thêm) thông báo lỗi inline khi sai credentials

### 4.2 Layout chính (sau login)

- **Sidebar trái (w-80):** logo "TourAdmin", nav 2 tab (POIs / Tours), danh sách dynamic, nút Đăng xuất
- **Main area (flex-1):** bản đồ Leaflet full-height, overlay panel phải (slide-in khi edit POI hoặc tạo Tour), legend bản đồ (bottom-left)

### 4.3 Tab POIs

**Sidebar:**

- Header "Danh sách POIs" + badge count
- Mỗi item: icon emoji + tên + type, nút xóa (hiện khi hover)
- Click vào item → highlight + đồng bộ với bản đồ

**Bản đồ:**

- Hiển thị tất cả POI markers (Leaflet Marker)
- Click trên marker → Popup (tên, type, description)
- Click vào vùng trống trên bản đồ → Mở panel "Thêm POI mới" với tọa độ đã chọn

**Panel Edit/Create POI (slide-in từ phải):**

- Header: "Thêm POI mới" hoặc "Sửa POI"
- Fields: Tên điểm (required), Loại điểm (select), Mô tả (textarea), Lat/Lng (read-only, auto-filled)
- Nút: "Lưu địa điểm", X đóng panel

### 4.4 Tab Tours

**Sidebar:**

- Header "Danh sách Tours" + nút "+" tạo tour
- Mỗi tour: tên tour, chuỗi POIs theo thứ tự (badge + mũi tên ChevronRight), nút xóa (hover)

**Bản đồ:**

- Tất cả tour hiển thị đường Polyline màu emerald, nét đứt
- (Không có marker riêng cho tour — dùng lại marker POI)

**Panel Create Tour (slide-in từ phải):**

- Header: "Tạo Tour mới"
- Fields: Tên Tour (required), chọn POIs theo thứ tự (danh sách toggle, có số thứ tự)
- Nút: "Lưu lộ trình" (disabled khi chưa có title hoặc chưa chọn POI), X đóng

---

## 5. User Stories

| ID    | Module | Là một... | Tôi muốn...                                                                    | Để...                                               | Priority |
| ----- | ------ | --------- | ------------------------------------------------------------------------------ | --------------------------------------------------- | -------- |
| US-01 | Login  | Admin     | Đăng nhập bằng email và password                                               | Truy cập dashboard an toàn                          | Must     |
| US-02 | Login  | Admin     | Đăng xuất khỏi hệ thống                                                        | Bảo mật phiên làm việc                              | Must     |
| US-03 | POI    | Admin     | Xem tất cả POIs trên bản đồ và trong danh sách sidebar                         | Nắm bắt tổng quan dữ liệu                           | Must     |
| US-04 | POI    | Admin     | Click vào bản đồ để chọn vị trí và thêm POI mới                                | Đặt POI chính xác trên bản đồ                       | Must     |
| US-05 | POI    | Admin     | Xem và chỉnh sửa thông tin POI đã tạo                                          | Cập nhật dữ liệu khi cần                            | Must     |
| US-06 | POI    | Admin     | Xóa một POI                                                                    | Dọn dẹp dữ liệu không còn sử dụng                   | Must     |
| US-07 | POI    | Admin     | Phân loại POI thành Chính hoặc các loại minor (WC, Bán vé, Gửi xe, Bến thuyền) | Phân biệt tầm quan trọng và chức năng của từng điểm | Must     |
| US-08 | POI    | Admin     | Xem icon phân biệt cho từng loại POI                                           | Nhận diện nhanh loại điểm trên bản đồ và danh sách  | Should   |
| US-09 | Tour   | Admin     | Xem danh sách tất cả tours hiện có                                             | Quản lý tổng quan lộ trình                          | Must     |
| US-10 | Tour   | Admin     | Tạo tour mới bằng cách chọn POIs theo thứ tự                                   | Xây dựng lộ trình tham quan                         | Must     |
| US-11 | Tour   | Admin     | Xem thứ tự các POIs trong tour                                                 | Kiểm tra lộ trình trước khi lưu                     | Must     |
| US-12 | Tour   | Admin     | Xóa một tour                                                                   | Xóa lộ trình không còn sử dụng                      | Must     |
| US-13 | Tour   | Admin     | Xem đường đi (polyline) của tour trên bản đồ                                   | Trực quan hóa lộ trình                              | Should   |
| US-14 | POI    | Admin     | Nhận thông báo xác nhận trước khi xóa POI hoặc Tour                            | Tránh xóa nhầm dữ liệu                              | Must     |

---

## 6. Functional Requirements

### FR-01: Authentication

| ID      | Requirement                                                                            |
| ------- | -------------------------------------------------------------------------------------- |
| FR-01.1 | Hệ thống hiển thị màn hình login khi chưa xác thực                                     |
| FR-01.2 | Form login có field Email (type=email, required) và Password (type=password, required) |
| FR-01.3 | Submit form gọi API xác thực; thành công → chuyển vào dashboard                        |
| FR-01.4 | Thất bại → hiển thị thông báo lỗi inline (không redirect)                              |
| FR-01.5 | Authentication sử dụng JWT token.                                                      |

Token được lưu trong localStorage để duy trì session sau khi reload trang.
React state giữ bản copy token trong runtime để sử dụng khi gọi API.
Mỗi request API gửi header:

Authorization: Bearer <token>.|
| FR-01.6 | Nút Đăng xuất xóa session và redirect về màn hình login |
| FR-01.7 | Route `/` khi chưa login redirect về `/login` (hoặc conditional render) |
| FR-01.8 |Client phải tự động đính kèm Authorization: Bearer <token> trong mọi request API sau khi đăng nhập thành công.|

### FR-02: POIs Management

| ID       | Requirement                                                                                                                                         |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-02.1  | Sau login, hệ thống tải và hiển thị toàn bộ POIs từ `GET /api/pois`                                                                                 |
| FR-02.2  | Mỗi POI được hiển thị bằng Leaflet Marker trên bản đồ                                                                                               |
| FR-02.3  | Click marker → Popup hiển thị name, type, description                                                                                               |
| FR-02.4  | Danh sách sidebar hiển thị: icon emoji theo type, tên, type label                                                                                   |
| FR-02.5  | Badge count sidebar cập nhật real-time theo số POI hiện có                                                                                          |
| FR-02.6  | Click vào area trống trên bản đồ (tab POI đang active, không có panel edit mở) → tạo marker tạm + mở panel "Thêm POI mới" với lat/lng được điền sẵn |
| FR-02.7  | Panel POI form có các field: `name` (text, required), `type` (select), `description` (textarea, optional), `lat`/`lng` (read-only)                  |
| FR-02.8  | Danh sách POIType: Chính (MAIN), WC, Bán vé (TICKET), Gửi xe (PARKING), Bến thuyền (PORT)                                                           |
| FR-02.9  | Submit form Create → `POST /api/pois` → đóng panel → refresh danh sách                                                                              |
| FR-02.10 | Click POI trong sidebar → chọn POI đó (highlight), đồng bộ với bản đồ                                                                               |
| FR-02.11 | Panel "Sửa POI" mở khi click nút Edit trên POI đã tồn tại (hiện tại: click trên sidebar item)                                                       |
| FR-02.12 | Submit form Edit → `PUT /api/pois/:id` → đóng panel → refresh danh sách                                                                             |
| FR-02.13 | Nút xóa (trash icon, hiện khi hover) trên sidebar item → hiện `confirm()` dialog → `DELETE /api/pois/:id` → refresh                                 |
| FR-02.14 | Đóng panel (nút X) hủy thao tác, xóa marker tạm nếu đang tạo mới                                                                                    |
| FR-02.15 | Legend bản đồ hiển thị mapping icon ↔ type cho tất cả 5 loại POI                                                                                    |

### FR-03: Tours Management

| ID       | Requirement                                                                                  |
| -------- | -------------------------------------------------------------------------------------------- |
| FR-03.1  | Sau login, hệ thống tải toàn bộ Tours từ `GET /api/tours`                                    |
| FR-03.2  | Danh sách tour trên sidebar: tên tour + chuỗi POI theo thứ tự (badge + ChevronRight)         |
| FR-03.3  | Nút "+" trên header sidebar → mở panel "Tạo Tour mới"                                        |
| FR-03.4  | Panel tạo tour: field `title` (text, required) + danh sách POIs để chọn                      |
| FR-03.5  | POI trong danh sách chọn là toggle: chọn → xếp vào cuối chuỗi, bỏ chọn → remove              |
| FR-03.6  | POI đã chọn hiển thị badge số thứ tự (1, 2, 3…)                                              |
| FR-03.7  | Nút "Lưu lộ trình" disabled khi `title` rỗng HOẶC chưa chọn ít nhất 1 POI                    |
| FR-03.8  | Submit → `POST /api/tours` → đóng panel → refresh danh sách                                  |
| FR-03.9  | Nút xóa (hover) → `confirm()` → `DELETE /api/tours/:id` → refresh                            |
| FR-03.10 | Khi tab Tours active → bản đồ vẽ Polyline emerald nét đứt cho mỗi tour theo thứ tự `poi_ids` |
| FR-03.11 | POI không tìm thấy trong `poi_ids` hiển thị label "Unknown" (graceful degradation)           |

---

## 7. Acceptance Criteria (Given-When-Then)

| US    | Scenario                 | Given                                                               | When                                      | Then                                                                                                                    |
| ----- | ------------------------ | ------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| US-01 | Đăng nhập thành công     | Admin ở màn hình Login, nhập đúng email và password hợp lệ          | Admin nhấn "Đăng nhập"                    | Dashboard hiển thị (sidebar + bản đồ), tab POIs được chọn mặc định                                                      |
| US-01 | Đăng nhập thất bại       | Admin ở màn hình Login, nhập sai password                           | Admin nhấn "Đăng nhập"                    | Hiển thị thông báo lỗi inline "Sai email hoặc mật khẩu", form không bị xóa                                              |
| US-01 | Form validation          | Admin ở màn hình Login, để trống email hoặc password                | Admin nhấn "Đăng nhập"                    | Browser/app hiển thị validation "Trường bắt buộc", không gọi API                                                        |
| US-02 | Đăng xuất                | Admin đang ở Dashboard                                              | Admin nhấn "Đăng xuất"                    | Session bị xóa, màn hình chuyển về Login                                                                                |
| US-03 | Load POIs                | Admin vừa đăng nhập thành công                                      | Dashboard render xong                     | Tất cả POIs từ DB hiển thị trên bản đồ và trong danh sách sidebar                                                       |
| US-04 | Tạo POI qua click bản đồ | Admin ở tab POIs, không có panel nào đang mở                        | Admin click vào vị trí trống trên bản đồ  | Marker tạm xuất hiện tại vị trí đó, panel "Thêm POI mới" slide-in từ phải, Lat/Lng được điền sẵn, đọc-only              |
| US-04 | Lưu POI mới              | Panel "Thêm POI mới" đang mở, Admin đã nhập đầy đủ tên và chọn loại | Admin nhấn "Lưu địa điểm"                 | POI được lưu vào DB, marker thật xuất hiện trên bản đồ, panel đóng, danh sách sidebar cập nhật, badge count tăng        |
| US-04 | Hủy tạo POI              | Panel "Thêm POI mới" đang mở                                        | Admin nhấn nút X                          | Panel đóng, marker tạm biến mất, không có dữ liệu được lưu                                                              |
| US-05 | Sửa POI                  | Admin click chọn một POI trong danh sách sidebar                    | —                                         | POI được highlight, (khi click nút Edit) panel "Sửa POI" mở với dữ liệu hiện tại điền sẵn                               |
| US-05 | Lưu POI đã sửa           | Panel "Sửa POI" đang mở, Admin thay đổi tên                         | Admin nhấn "Lưu địa điểm"                 | Dữ liệu được cập nhật trong DB, danh sách sidebar và popup bản đồ phản ánh thay đổi                                     |
| US-06 | Xóa POI                  | Admin hover vào POI item trong sidebar                              | Admin click icon Trash                    | Hiện dialog "Bạn có chắc chắn muốn xóa điểm này?"; nếu xác nhận → POI bị xóa khỏi DB và khỏi bản đồ, danh sách cập nhật |
| US-06 | Hủy xóa POI              | Dialog xác nhận xóa đang hiện                                       | Admin click "Cancel"                      | Dialog đóng, POI vẫn tồn tại                                                                                            |
| US-07 | Phân loại POI            | Panel tạo/sửa POI đang mở                                           | Admin chọn loại từ dropdown               | Icon tương ứng (📍/🚻/🎫/🅿️/⚓) hiển thị trong danh sách sidebar và legend bản đồ                                       |
| US-10 | Tạo Tour mới             | Admin ở tab Tours, nhấn "+"                                         | —                                         | Panel "Tạo Tour mới" slide-in, danh sách toàn bộ POIs hiển thị để chọn                                                  |
| US-10 | Chọn POIs cho tour       | Panel tạo tour đang mở, có POIs trong hệ thống                      | Admin click lần lượt vào POI A, rồi POI B | POI A có badge "1", POI B có badge "2", cả hai highlight màu emerald                                                    |
| US-10 | Lưu tour                 | Panel tạo tour, đã nhập tên và chọn ít nhất 1 POI                   | Admin nhấn "Lưu lộ trình"                 | Tour được lưu vào DB, panel đóng, tour xuất hiện trong danh sách sidebar, polyline đường đi xuất hiện trên bản đồ       |
| US-10 | Nút lưu disabled         | Panel tạo tour đang mở, chưa nhập tên hoặc chưa chọn POI            | —                                         | Nút "Lưu lộ trình" bị disabled (không clickable)                                                                        |
| US-12 | Xóa Tour                 | Admin hover vào tour item trong sidebar                             | Admin click icon Trash                    | Hiện dialog xác nhận; nếu xác nhận → tour xóa khỏi DB, danh sách cập nhật, polyline biến mất                            |
| US-13 | Xem polyline tour        | Admin chuyển sang tab Tours                                         | —                                         | Mỗi tour hiển thị đường polyline màu emerald (#10b981), nét đứt, kết nối các POI theo đúng thứ tự `poi_ids`             |

---

## 8. Non-functional Requirements

### 8.1 Authentication & Security

- **NFR-SEC-01:** Tất cả API endpoints (/api/pois, /api/tours) phải yêu cầu Bearer token hợp lệ. Server validate JWT trước khi xử lý request.
- **NFR-SEC-02:** Password không được lưu plaintext trong DB; phải hash (bcrypt hoặc tương đương)
- **NFR-SEC-03:** Session/token có thời gian hết hạn (tối thiểu: 8 giờ, tối đa: 24 giờ)
- **NFR-SEC-04:** HTTPS bắt buộc trên môi trường production
- **NFR-SEC-05:** Khi token hết hạn (401 Unauthorized), client phải redirect về màn hình login.

### 8.2 Validation

- **NFR-VAL-01:** `name` của POI: required, không được rỗng hoặc chỉ có whitespace, max 255 ký tự
- **NFR-VAL-02:** `type` của POI: phải là một trong 5 giá trị enum hợp lệ
- **NFR-VAL-03:** `lat` phải trong khoảng [-90, 90]; `lng` trong khoảng [-180, 180]
- **NFR-VAL-04:** `title` của Tour: required, không được rỗng, max 255 ký tự
- **NFR-VAL-05:** `poi_ids` của Tour: phải là array, ít nhất 1 phần tử, mỗi phần tử phải là ID tồn tại trong bảng `pois`
- **NFR-VAL-06:** Validation phải xảy ra cả phía client (UX) và server (đảm bảo data integrity)

### 8.3 Error Handling

- **NFR-ERR-01:** Mọi API call lỗi (4xx/5xx) phải hiển thị thông báo lỗi rõ ràng cho user (toast hoặc inline message), không để lỗi im lặng
- **NFR-ERR-02:** Khi fetch POIs/Tours thất bại → hiển thị trạng thái empty với thông báo lỗi thay vì danh sách trống
- **NFR-ERR-03:** Xóa POI đang được sử dụng trong Tour → server trả lỗi có ý nghĩa (hoặc xử lý cascade)

### 8.4 Loading States

- **NFR-LOAD-01:** Các thao tác async (fetch, save, delete) phải có visual feedback (spinner/loading indicator)
- **NFR-LOAD-02:** Nút submit bị disabled trong khi đang gọi API (tránh double-submit)

### 8.5 Performance

- **NFR-PERF-01:** Tải trang lần đầu (sau login) < 3s trên kết nối 10 Mbps
- **NFR-PERF-02:** Thao tác CRUD (save/delete) phản hồi < 1s trong điều kiện bình thường
- **NFR-PERF-03:** Bản đồ render và responsive tới click trong < 2s

### 8.6 Logging

- **NFR-LOG-01:** Server log tất cả requests với timestamp, method, path, status code
- **NFR-LOG-02:** Lỗi server phải được log với stack trace (không expose stack trace ra response)

---

## 9. Data Requirements

### 9.1 POI

| Field         | Type    | Required | Constraints                                           | Ghi chú                      |
| ------------- | ------- | -------- | ----------------------------------------------------- | ---------------------------- |
| `id`          | INTEGER | Auto     | PK, AUTOINCREMENT                                     | Sinh tự động                 |
| `name`        | TEXT    | ✅       | NOT NULL, max 255                                     | Tên hiển thị của điểm        |
| `type`        | TEXT    | ✅       | Enum: `Chính`, `WC`, `Bán vé`, `Gửi xe`, `Bến thuyền` | Từ `POIType` enum            |
| `lat`         | REAL    | ✅       | NOT NULL, [-90, 90]                                   | Vĩ độ, lấy từ click bản đồ   |
| `lng`         | REAL    | ✅       | NOT NULL, [-180, 180]                                 | Kinh độ, lấy từ click bản đồ |
| `description` | TEXT    | ❌       | Nullable                                              | Mô tả tự do                  |

**Icon mapping:**

| Type                | Emoji | Tiếng Việt             |
| ------------------- | ----- | ---------------------- |
| `Chính` (MAIN)      | 📍    | Điểm chính / Major POI |
| `WC`                | 🚻    | Nhà vệ sinh            |
| `Bán vé` (TICKET)   | 🎫    | Điểm bán vé            |
| `Gửi xe` (PARKING)  | 🅿️    | Bãi đỗ xe              |
| `Bến thuyền` (PORT) | ⚓    | Bến thuyền             |

### 9.2 Tour

| Field     | Type    | Required | Constraints       | Ghi chú                                                          |
| --------- | ------- | -------- | ----------------- | ---------------------------------------------------------------- |
| `id`      | INTEGER | Auto     | PK, AUTOINCREMENT | Sinh tự động                                                     |
| `title`   | TEXT    | ✅       | NOT NULL, max 255 | Tên lộ trình                                                     |
| `poi_ids` | TEXT    | ✅       | NOT NULL          | JSON array of POI IDs, thứ tự = thứ tự lộ trình. VD: `[1, 3, 2]` |

> **Lưu ý thiết kế DB:** `poi_ids` đang lưu dạng JSON string trong SQLite. Điều này hoạt động nhưng không tối ưu cho truy vấn phức tạp. Xem Open Questions về việc chuẩn hóa.

---

## 10. API Assumptions

> Mô tả interface API cần có. Không bao gồm implementation chi tiết.

### 10.1 Authentication

```
POST /api/auth/login
  Body: { email: string, password: string }
  Response 200: { token: string, expiresAt: ISO8601 }
  Response 401: { error: "Invalid credentials" }

POST /api/auth/logout
  Auth: Bearer token
  Response 200: { success: true }
```

Quyết định kỹ thuật: Sử dụng JWT Token lưu tại localStorage. Mọi API gọi lên backend (POST, PUT, DELETE) đều bắt buộc phải đính kèm header Authorization: Bearer <token>.

### 10.2 POIs

```
GET /api/pois
  Auth: Bearer token
  Response 200: POI[]

POST /api/pois
  Auth: Bearer token
  Body: { name, type, lat, lng, description? }
  Response 201: { id: number }
  Response 400: { error: string } — validation failure

PUT /api/pois/:id
  Auth: Bearer token
  Body: { name, type, lat, lng, description? }
  Response 200: { success: true }
  Response 404: { error: "POI not found" }

DELETE /api/pois/:id
  Auth: Bearer token
  Response 200: { success: true }
  Response 404: { error: "POI not found" }
  Response 409: { error: "POI is used in tours" } — nếu enforce constraint
```

### 10.3 Tours

```
GET /api/tours
  Auth: Bearer token
  Response 200: Tour[] — poi_ids là number[], đã parse từ JSON string

POST /api/tours
  Auth: Bearer token
  Body: { title: string, poi_ids: number[] }
  Response 201: { id: number }
  Response 400: { error: string }

PUT /api/tours/:id
  Auth: Bearer token
  Body: { title: string, poi_ids: number[] }
  Response 200: { success: true }
  Response 404: { error: "Tour not found" }

DELETE /api/tours/:id
  Auth: Bearer token
  Response 200: { success: true }
  Response 404: { error: "Tour not found" }
```

---

## 11. Dependencies & Risks

### 11.1 Dependencies

| Dependency                    | Loại               | Ghi chú                                       |
| ----------------------------- | ------------------ | --------------------------------------------- |
| React 19 + Vite 6             | Frontend framework | Đã có trong codebase                          |
| react-leaflet 5 + Leaflet 1.9 | Bản đồ             | Đã có, cần tile API key cho production        |
| CARTO Dark tile               | Map tile provider  | Free tier, kiểm tra rate limit                |
| Express 4                     | Backend API        | Đã có                                         |
| better-sqlite3                | Database           | Đã có; phù hợp cho MVP, cần xem xét khi scale |
| Tailwind CSS 4                | Styling            | Đã có                                         |
| Motion (Framer)               | Animation          | Đã có                                         |
| Node.js                       | Runtime            | Cần >= 18                                     |

### 11.2 Risks

| #   | Rủi ro                                                                                                                                      | Mức độ                 | Giảm thiểu / Status                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------- |
| R1  | React state giữ token để quản lý trạng thái đăng nhập và UI. API requests đọc token từ localStorage để gửi Authorization header..           | ~~Cao~~ Giải quyết     | Server enforce token validation trên POI/Tour routes (partial)         |
| R2  | ✅ **Chấp nhận cho MVP:** SQLite hoạt động tốt cho 1–5 admin users. API hooks (usePOIs, useTours) tách biệt logic, dễ migrate sang DB khác. | ~~Trung bình~~ Quản lý | Nếu scale: migrate sang PostgreSQL và thay đổi DB adapter              |
| R3  | **poi_ids lưu JSON string** — mất referential integrity, khó query                                                                          | Trung bình             | Cân nhắc bảng join `tour_pois` trong lần refactor tiếp                 |
| R4  | **Không có Edit tour:** UI hiện tại chỉ có Create và Delete tour, không có Edit                                                             | Trung bình             | Cần thêm tính năng Edit tour hoặc xác nhận đây là thiết kế có chủ đích |
| R5  | **Tile provider phụ thuộc bên ngoài** — CARTO có thể down hoặc thay đổi ToS                                                                 | Thấp                   | Chuẩn bị fallback tile (OpenStreetMap standard)                        |
| R6  | **`confirm()` browser native không nhất quán** trên một số browser                                                                          | Thấp                   | Thay bằng modal dialog component                                       |
| R7  | **Không có loading state:** Hiện tại không có feedback khi đang gọi API                                                                     | Thấp–Trung             | Thêm loading states theo NFR-LOAD                                      |

---

## 12. Open Questions

| #     | Câu hỏi                                                                                                                                                                              | Owner        | Deadline    |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ | ----------- |
| OQ-01 | ✅ Quyết định kỹ thuật: Sử dụng JWT Token lưu tại localStorage. Mọi API gọi lên backend (POST, PUT, DELETE) đều bắt buộc phải đính kèm header Authorization: Bearer <token>.         | Backend Lead | ✅ Sprint 1 |
| OQ-02 | ✅ **RESOLVED:** Credentials hard-code từ env vars. Default: email = `admin@example.com`, password = `password`. Server: `server.ts` dùng `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars. | Backend Lead | ✅ Sprint 1 |
| OQ-03 | **Edit Tour:** Có cần tính năng Edit (sửa tên, thêm/bớt POI) cho Tour không? Codebase đã có `PUT /api/tours/:id` ở server nhưng UI chưa expose.                                      | PO           | Sprint 1    |
| OQ-04 | **Xóa POI được dùng trong Tour:** Khi xóa POI đang có trong Tour, hành vi mong muốn là gì? (a) Chặn và báo lỗi, (b) Cascade xóa Tour, (c) Để "Unknown" trong Tour                    | PO           | Sprint 1    |
| OQ-05 | **Số lượng POI/Tour dự kiến:** Bao nhiêu POIs và Tours trong thực tế? Ảnh hưởng đến quyết định pagination và SQLite vs PostgreSQL                                                    | PO           | Sprint 2    |
| OQ-06 | **Tile API cho production:** CARTO Dark tile có cần API key riêng không, hay free tier đủ dùng?                                                                                      | DevOps       | Sprint 1    |
| OQ-07 | **Tọa độ mặc định bản đồ:** Hiện tại center `[16.047, 108.206]` (Đà Nẵng). Có cần config lại hay hardcode là đủ?                                                                     | PO           | Sprint 1    |
| OQ-08 | **`description` trường POI:** Có giới hạn độ dài không? Có hỗ trợ rich text hay plain text?                                                                                          | PO           | Sprint 2    |
| OQ-09 | **Firebase dependency:** Package `firebase` được cài nhưng không dùng trong code hiện tại. Cần xóa hay sẽ sử dụng về sau?                                                            | Backend Lead | Sprint 1    |
| OQ-10 | **Gemini API:** Package `@google/genai` được cài và key được cấu hình. Có kế hoạch sử dụng AI feature nào trong scope này không?                                                     | PO           | Sprint 2    |

---

## 13. Future Enhancements

> Các tính năng dưới đây **ngoài scope MVP**. Đặt ở đây để ghi nhận cho các sprint sau.

- **Edit Tour:** Sửa tên và POI sequence của tour đã tạo
- **Kéo-thả sắp xếp POIs trong Tour** (drag-to-reorder thay vì toggle)
- **Upload ảnh cho POI** (thumbnail, gallery)
- **Tìm kiếm & lọc POI** theo tên hoặc loại
- **Phân quyền nhiều role** (Admin, Editor, Viewer)
- **Quản lý nhiều khu vực bản đồ** (không chỉ Đà Nẵng)
- **Export tour** ra PDF hoặc chia sẻ link public
- **Undo/Redo** cho thao tác xóa POI/Tour
- **Clustering marker** khi zoom out để tránh overlap
- **Thống kê:** số POI theo loại, số tour, POI phổ biến nhất
- **Audit log:** lịch sử thao tác của Admin
- **Mobile responsive** cho màn hình nhỏ
- **Offline support / PWA**
- **Multi-language** (EN/VI)

---

_Tài liệu này được tổng hợp từ phân tích codebase `poi-_-tour-admin-dashboard`. Mọi thay đổi scope cần được PO xác nhận và cập nhật version PRD.\_
