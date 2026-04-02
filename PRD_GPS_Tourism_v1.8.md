# PRD — Hệ thống GPS Du lịch Đa ngôn ngữ

## (Single Source of Truth — Phiên bản đầy đủ)

**Version:** 1.8
**Ngày:** 2026-03-24  
**Tác giả:** Senior BA / PO  
**Trạng thái:** Sẵn sàng để phát triển

---

## Mục lục

1. [Overview & Goals](#1-overview--goals)
2. [Tech Stack & Architecture](#2-tech-stack--architecture)
3. [Personas / Roles](#3-personas--roles)
4. [Kiến trúc hệ thống tổng quan](#4-kiến-trúc-hệ-thống-tổng-quan)
5. [Detailed Module Admin](#5-detailed-module-admin)
6. [Detailed Module Business](#6-detailed-module-business)
7. [Detailed Module User](#7-detailed-module-user)
8. [Audio Pipeline & Đa ngôn ngữ](#8-audio-pipeline--đa-ngôn-ngữ)
9. [Business Rules](#9-business-rules)
10. [Database Schema](#10-database-schema)
11. [API Specifications](#11-api-specifications)
12. [Non-functional Requirements](#12-non-functional-requirements)

---

## 1. Overview & Goals

### Bối cảnh

Hệ thống GPS Du lịch Đa ngôn ngữ là nền tảng gồm 3 ứng dụng độc lập (Admin Dashboard, Business Portal, User App) phục vụ quản lý và trải nghiệm các điểm tham quan (POI) và lộ trình tour có hỗ trợ âm thanh hướng dẫn tự động đa ngôn ngữ.

### Mục tiêu

| #   | Mục tiêu                                                      | Đo lường                                     |
| --- | ------------------------------------------------------------- | -------------------------------------------- |
| G1  | Admin quản lý toàn bộ POI và Tour                             | CRUD hoạt động đầy đủ                        |
| G2  | Doanh nghiệp tự đăng ký và quản lý POI của họ                 | Đăng ký không cần duyệt, CRUD POI            |
| G3  | User trải nghiệm POI và Tour theo vị trí thực tế              | POI hiển thị đúng, audio phát đúng lúc       |
| G4  | Âm thanh hướng dẫn tự động phát khi user tiến gần POI         | Phát audio < 3 giây kể từ khi vào phạm vi 3m |
| G5  | Hỗ trợ đa ngôn ngữ (5 ngôn ngữ MVP) cho nội dung và giao diện | Dịch + hiển thị đúng ngôn ngữ đã chọn        |

### Ngôn ngữ hỗ trợ (MVP)

| Code | Ngôn ngữ    | edge-TTS voice         |
| ---- | ----------- | ---------------------- |
| `vi` | Tiếng Việt  | `vi-VN-HoaiMyNeural`   |
| `en` | Tiếng Anh   | `en-US-JennyNeural`    |
| `zh` | Tiếng Trung | `zh-CN-XiaoxiaoNeural` |
| `ja` | Tiếng Nhật  | `ja-JP-NanamiNeural`   |
| `ko` | Tiếng Hàn   | `ko-KR-SunHiNeural`    |

> **Thiết kế mở rộng:** Hệ thống được thiết kế để thêm ngôn ngữ mới trong tương lai mà không cần thay đổi cấu trúc DB. Chỉ cần thêm entry vào bảng `languages`.

---

## 2. Tech Stack & Architecture

| Layer                          | Công nghệ                                     |
| ------------------------------ | --------------------------------------------- |
| **Backend chính**              | Node.js + Express                             |
| **TTS (sinh audio)**           | Python subprocess → `edge-tts` library        |
| **Dịch thuật**                 | Python subprocess → `deep-translator` library |
| **Database**                   | SQLite (`better-sqlite3`)                     |
| **Realtime / Online tracking** | Firebase Realtime Database                    |
| **File storage**               | Local filesystem                              |
| **Auth**                       | JWT (access token)                            |
| **Đa ngôn ngữ UI (Frontend)**  | Thư viện `i18n` (ví dụ: `react-i18next`) với các file từ điển tĩnh (JSON) |
| **Frontend Admin**             | React + Leaflet (bản đồ)                      |
| **Frontend Business**          | React (không có bản đồ)                       |
| **Frontend User**              | React Native hoặc React PWA + Leaflet         |

### Python subprocess wrapper

Node.js gọi Python qua `child_process.spawn`. Hai script Python riêng biệt:

```
scripts/
  tts.py          # Nhận: text, lang, output_path → sinh file .mp3
  translate.py    # Nhận: text, source_lang, target_lang → trả về text đã dịch
```

---

## 3. Personas / Roles

### Admin

- Đăng nhập bằng email + password (tài khoản tạo sẵn, không có màn hình đăng ký)
- Quản lý toàn bộ POI (của Admin và xem POI doanh nghiệp)
- Quản lý toàn bộ Tour
- Xem thông tin doanh nghiệp đã đăng ký
- Xem Dashboard thống kê
- **Không thể sửa POI của doanh nghiệp**, chỉ xem và xóa (khi POI không trong tour)

### Business User (Doanh nghiệp)

- Tự đăng ký tài khoản (không cần Admin duyệt)
- Đăng nhập bằng email + password
- CRUD POI của riêng mình
- Không tạo Tour
- Không thấy POI/Tour của doanh nghiệp khác

### End User (Người dùng)

- Đăng ký + Đăng nhập với email, tên, password
- Bắt buộc chọn ngôn ngữ khi đăng nhập
- Xem POI và Tour gần vị trí (20km)
- Nghe audio hướng dẫn tự động khi đến gần POI
- Tạo Tour cá nhân (chỉ bản thân thấy)

---

## 4. Kiến trúc hệ thống tổng quan

```
┌─────────────────────────────────────────────────────────────┐
│                      3 Frontend Apps                         │
│  [Admin Dashboard]  [Business Portal]  [User App]           │
└────────────┬─────────────┬──────────────┬───────────────────┘
             │             │              │
             ▼             ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Node.js + Express API                      │
│                                                              │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐ │
│  │  Auth Router │  │  POI Router   │  │  Tour Router     │ │
│  │  /api/auth   │  │  /api/pois    │  │  /api/tours      │ │
│  └──────────────┘  └───────────────┘  └──────────────────┘ │
│  ┌──────────────┐  ┌───────────────┐                       │
│  │ Admin Router │  │  User Router  │                       │
│  │ /api/admin   │  │  /api/users   │                       │
│  └──────────────┘  └───────────────┘                       │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Python Subprocess Services              │   │
│  │   tts.py (edge-tts)  |  translate.py (deep-trans)  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
   ┌─────────────┐      ┌──────────────────┐
   │   SQLite DB  │      │ Firebase Realtime│
   │  (data.db)  │      │ Database (online) │
   └─────────────┘      └──────────────────┘
          │
          ▼
   ┌─────────────┐
   │ File System │
   │ /uploads/   │
   │  /pois/     │ ← ảnh POI
   │  /tours/    │ ← ảnh Tour
   │  /audio/    │ ← file .mp3
   └─────────────┘
```

### Quy ước đặt tên file

| Loại file | Quy ước                          | Ví dụ             |
| --------- | -------------------------------- | ----------------- |
| Ảnh POI   | `poi_{id}_{uuid}.{ext}`          | `poi_5_a3f2.jpg`  |
| Ảnh Tour  | `tour_{id}_{uuid}.{ext}`         | `tour_2_b1c9.jpg` |
| Audio POI | `poi_{id}_{lang}_v{version}.mp3` | `poi_5_vi_v1.mp3` |
**Version audio (Versioning Logic):** Khi tạo POI mới, `version` khởi tạo mặc định là `0` (`v0`). Mỗi lần Admin hoặc Doanh nghiệp nhấp vào Cập nhật nội dung POI, tất cả audio cũ và bản dịch cũ phải bị xóa khỏi máy chủ, đồng thời **giá trị version bắt buộc phải tăng thêm 1 đơn vị (increment +1)** để đảm bảo phá vỡ bộ nhớ đệm (Cache Invalidation) trên thiết bị của User. Ví dụ: File tiếng Việt được tạo tiếp theo sẽ mang tên `poi_5_vi_v1.mp3`, quá trình sửa lần sau đó sẽ lên `v2`, `v3`... Bất kỳ phiên bản ngôn ngữ nào khác (được sinh ngầm On-demand) cũng sẽ đồng bộ chuẩn theo `version` mới nhất này.

---

## 5. Detailed Module Admin

### 5.1 Đăng nhập Admin

**URL:** `/admin/login`

**Giao diện:**

- Input: Email (required)
- Input: Password (required)
- Button: "Đăng nhập"
- Hiển thị lỗi inline nếu sai credentials

**Logic:**

- `POST /api/auth/admin/login` với `{ email, password }`
- Trả về JWT token, lưu vào localStorage
- Redirect về `/admin/dashboard`
- Tất cả route admin đều kiểm tra JWT, nếu hết hạn redirect về `/admin/login`

---

### 5.2 Layout Admin

**Sidebar trái (cố định):**

```
┌─────────────────┐
│  [Logo / Title] │
├─────────────────┤
│ 📊 Dashboard    │
│ 📍 Quản lý POI  │
│ 🗺️ Quản lý Tour │
│ 🏢 Doanh nghiệp │
├─────────────────┤
│ 🚪 Đăng xuất   │
└─────────────────┘
```

**Main area:**

- Khi chọn POI hoặc Tour: Hiển thị bản đồ Leaflet chiếm toàn bộ main area + overlay panel/modal
- Khi chọn Dashboard hoặc Doanh nghiệp: Ẩn bản đồ, hiển thị nội dung dạng danh sách/card

---

### 5.3 Dashboard

**URL:** `/admin/dashboard`

**Hiển thị các thống kê (card layout):**

| Card                    | Nội dung                                                   |
| ----------------------- | ---------------------------------------------------------- |
| 👤 Tổng người dùng      | Tổng số tài khoản User đã đăng ký                          |
| 🟢 Đang online          | Số User có `last_active` > (now - 5 phút), lấy từ Firebase |
| 📍 Tổng POI             | Tổng số POI trong hệ thống                                 |
| 📍 POI của Admin        | Số POI do Admin tạo (`owner_type = 'admin'`)               |
| 📍 POI của Doanh nghiệp | Số POI do Doanh nghiệp tạo (`owner_type = 'business'`)     |
| 🗺️ Tổng Tour            | Tổng số Tour trong hệ thống (Admin + User)                 |
| 🗺️ Tour của Admin       | Số Tour do Admin tạo                                       |
| 🗺️ Tour của User        | Số Tour do User tạo                                        |
| 🏢 Tổng Doanh nghiệp    | Số tài khoản doanh nghiệp đã đăng ký                       |

**Online tracking flow:**

- Mỗi khi User mở app hoặc thực hiện bất kỳ thao tác nào → Client ghi `last_active = Date.now()` lên Firebase path `/online_status/{user_id}`
- Admin Dashboard đọc Firebase và đếm số `last_active > now - 5*60*1000`

---

### 5.4 Quản lý POI (Admin)

**URL:** `/admin/pois`

**Giao diện:**

Bản đồ Leaflet chiếm toàn bộ main area. Tất cả POI hiển thị là **chấm tròn màu xanh lá** trên bản đồ.

**Panel trái (overlay trên bản đồ, width ~350px):**

- Thanh tìm kiếm POI (search theo tên, không phân biệt hoa thường, có dấu/không dấu — dùng thư viện `vietnamese-slug` hoặc normalize unicode)
- Danh sách POI (tên + tọa độ ngắn)
- Button "+ Thêm POI" ở cuối danh sách

#### 5.4.1 Hành vi khi click POI trong danh sách

1. Bản đồ tự động pan + zoom đến vị trí POI đó
2. Chấm POI trên bản đồ được highlight (đổi màu vàng/cam, hiện vòng tròn pulse animation)
3. Mở **Popup Modal thông tin POI** (xem 5.4.3)

#### 5.4.2 Hành vi khi click chấm POI trên bản đồ

Tương tự click trong danh sách: highlight + mở Popup Modal thông tin POI.

#### 5.4.3 Popup Modal — Xem thông tin POI

**1. Modal thông tin POI chính (read-only):**

- Tên POI
- Mô tả gốc (tiếng Việt mặc định)
- Kinh độ (Longitude)
- Vĩ độ (Latitude)
- Phạm vi (Range) — đơn vị mét
- Ảnh (hiển thị dạng thumbnail grid, tối đa 5 ảnh; click ảnh → xem full size)
- Nút bấm **"Ngôn ngữ & Audio"**: Mở Modal phụ để xem thông tin dịch thuật và nghe âm thanh hướng dẫn.

**2. Modal phụ "Ngôn ngữ & Audio":**

Khi nhấn vào nút "Ngôn ngữ & Audio" ở modal chính, hệ thống hiển thị Popup/Modal mới với cấu trúc:
- **Tiêu đề trên cùng:** "Ngôn ngữ & Audio"
- **Điểm tham quan:** [Tên POI gốc] *(Ví dụ: Quán ăn doanh nghiệp)*
- **Chọn ngôn ngữ hiển thị & phát âm:** [Dropdown chọn ngôn ngữ] *(Mặc định là Tiếng Việt)*

Tùy thuộc vào ngôn ngữ được chọn tại Dropdown, nội dung bên dưới thay đổi như sau:
- **TRƯỜNG HỢP 1 (Ngôn ngữ gốc - VD: Tiếng Việt):**
  Chỉ hiển thị công cụ phát âm thanh:
  - Audio Player: [Giao diện phát nhạc có nút Play/Pause]

- **TRƯỜNG HỢP 2 (Ngoại ngữ - VD: Tiếng Anh, Tiếng Đức...):**
  Hiển thị bản dịch văn bản trước khi hiện công cụ Audio:
  - Tên đã dịch: [Tên POI đã dịch] *(VD: Business-Restaurant)*
  - Mô tả đã dịch: [Mô tả POI đã dịch] *(VD: sehr lecker)*
  - Audio Player: [Giao diện phát nhạc có nút Play/Pause]

**Cơ chế On-demand:**
- Khi đổi ngôn ngữ trong Dropdown, nếu ngôn ngữ đó chưa có bản dịch hoặc chưa có file audio trong Database, hệ thống sẽ tự động gọi API On-demand (gọi script `translate.py` và `tts.py`).
- Trong thời gian chờ xử lý, giao diện hiển thị trạng thái *"Đang dịch..."*, *"Đang tạo âm thanh..."*. 
- Sau khi quá trình hoàn tất, hệ thống tự động tải lại và hiển thị cấu trúc theo Trường hợp 2.

**Action buttons (Tại Modal thông tin chính):**

- **Sửa** → Mở form sửa POI (5.4.5)
- **Xóa** → Mở hộp thoại xác nhận (5.4.6)
- **Đóng** → Đóng modal

#### 5.4.4 Click vào điểm trống trên bản đồ → Thêm POI mới

Khi Admin click vào vùng trống trên bản đồ (không phải chấm POI):

1. Marker tạm xuất hiện tại vị trí click
2. Mở **Form Thêm POI** với lat/lng đã điền sẵn từ tọa độ click

**Form Thêm POI:**

| Field           | Loại            | Bắt buộc | Validation                                            |
| --------------- | --------------- | -------- | ----------------------------------------------------- |
| Tên POI         | text            | ✅       | Không rỗng, max 255 ký tự                             |
| Mô tả           | textarea        | ✅       | Không được để trống (dùng để tạo audio TTS)           |
| Kinh độ (Lng)   | number          | ✅       | Số thực, [-180, 180], tối đa 6 chữ số thập phân       |
| Vĩ độ (Lat)     | number          | ✅       | Số thực, [-90, 90], tối đa 6 chữ số thập phân         |
| Phạm vi (Range) | number          | ❌       | Số nguyên ≥ 1, mặc định = 1                            |
| Ảnh             | file (multiple) | ❌       | Tối đa 5 ảnh, mỗi ảnh max 5MB, định dạng JPG/PNG/WebP |

**Lưu ý lat/lng trong form:** Mặc dù bản đồ đã cung cấp tọa độ, Admin vẫn có thể chỉnh sửa tay. Khi chỉnh tay, marker tạm trên bản đồ cập nhật real-time theo giá trị nhập.

**Sau khi submit:**

1. `POST /api/admin/pois` — lưu POI vào DB
2. Upload ảnh (nếu có) → lưu vào `/uploads/pois/`
3. Gọi Python TTS ngay lập tức: `python tts.py --text "{mô tả}" --lang vi --output /uploads/audio/poi_{id}_vi_v0.mp3`
4. Lưu record audio vào bảng `poi_audio_files`
5. Đóng form, refresh danh sách, hiện chấm POI mới trên bản đồ

#### 5.4.5 Form Sửa POI (Admin POI)

Admin chỉ được sửa POI do Admin tạo (`owner_type = 'admin'`).
**Fields có thể sửa:**
- Tên POI
- Mô tả
- Kinh độ, Vĩ độ
- Phạm vi (Range)
- Ảnh: hiển thị 5 ảnh hiện tại (mỗi ảnh có nút ❌ xóa riêng), có thể upload thêm (tổng ≤ 5)
**Sau khi submit:**
1. `PUT /api/admin/pois/:id` — cập nhật POI trong DB.
2. Xử lý ảnh (xóa ảnh bị xóa, upload ảnh mới).
3. **LƯU Ý KHI THAY ĐỔI TÊN HOẶC MÔ TẢ:** Hệ thống thực hiện side effect tối ưu như sau:
   - **Về Audio (Chỉ khi đổi Mô tả):** Nếu trường `description` thay đổi, hệ thống bắt buộc phải:
     - Tính toán `new_version = old_version + 1`.
     - Xóa toàn bộ file audio cũ vật lý: `DELETE /uploads/audio/poi_{id}_*.mp3` và xóa các records trong bảng `poi_audio_files`.
     - Gọi Python TTS tạo lại audio tiếng Việt lập tức với version mới: `poi_{id}_vi_v{new_version}.mp3` và lưu record mới vào DB.
     - *(Nếu chỉ đổi Tên và giữ nguyên Mô tả: Giữ nguyên Audio cũ, không tăng version).*
   - **Về Dịch thuật (Khi đổi Tên HOẶC Mô tả):** Nếu một trong hai trường này thay đổi, hệ thống bắt buộc phải:
     - Xóa sạch toàn bộ bản dịch cũ trong bảng `poi_translations` để đảm bảo tính nhất quán của nội dung đa ngôn ngữ.

#### 5.4.6 Xóa POI

**Điều kiện:** POI **không được phép xóa** nếu đang nằm trong bất kỳ Tour nào (của Admin hoặc User).

**Flow:**

1. Admin click "Xóa"
2. Hệ thống kiểm tra `tour_pois` table: `SELECT * FROM tour_pois WHERE poi_id = :id`
3. **Nếu POI đang trong Tour:** Hiển thị thông báo lỗi: "Không thể xóa POI này vì đang nằm trong Tour: [Tên Tour A, Tên Tour B]. Vui lòng xóa POI khỏi các Tour trước."
4. **Nếu POI không trong Tour:** Hiển thị hộp thoại xác nhận: "Bạn có chắc muốn xóa POI [Tên]? Hành động này không thể hoàn tác."
5. Admin xác nhận → `DELETE /api/admin/pois/:id`:
   - Xóa record POI khỏi `pois`
   - Xóa tất cả record ảnh trong `poi_images`, xóa file ảnh vật lý
   - Xóa tất cả record trong `poi_audio_files`, xóa file audio vật lý (`poi_{id}_*`)
   - Xóa tất cả bản dịch trong `poi_translations`
6. Refresh danh sách, xóa chấm trên bản đồ

---

### 5.5 Quản lý Tour (Admin)

**URL:** `/admin/tours`

**Giao diện:**

Bản đồ Leaflet hiển thị tất cả POI (chấm xanh lá). Panel trái hiển thị danh sách Tour.

**Panel trái:**

- Danh sách Tour (tên tour)
- Button "+ Thêm Tour"

#### 5.5.1 Popup Modal thông tin Tour (read-only)

**1. TRONG MODAL THÔNG TIN TOUR CHÍNH:**
- **Hiển thị thông tin gốc:** Tên Tour, Mô tả, Ảnh (thumbnail grid), Danh sách các POI thuộc tour (số thứ tự + tên + tọa độ).
- **Gỡ bỏ:** Không hiển thị Dropdown chọn ngôn ngữ hay các nội dung dịch thuật trực tiếp tại đây.
- **Nút bấm:** Bổ sung một nút duy nhất có nhãn **"Ngôn ngữ"** (hoặc "Dịch thuật") để xử lý đa ngôn ngữ.

**2. MODAL PHỤ "DỊCH THUẬT TOUR":**
Khi nhấn vào nút "Ngôn ngữ", hệ thống mở ra một Popup/Modal mới với cấu trúc:
- **Tiêu đề:** Dịch thuật Tour
- **Tour:** [Tên Tour gốc]
- **Chọn ngôn ngữ hiển thị:** [Dropdown chọn ngôn ngữ] (Dữ liệu fetch từ API bảng `languages`).
- **TRƯỜNG HỢP 1 (Chọn ngôn ngữ gốc - VD: Tiếng Việt):** Hệ thống không hiển thị thêm trường thông tin dịch nào cả.
- **TRƯỜNG HỢP 2 (Chọn ngôn ngữ ngoại ngữ - VD: English):** Hiển thị thông tin bản dịch từ bảng `tour_translations`:
  - **Tên đã dịch:** [Tên Tour đã dịch]
  - **Mô tả đã dịch:** [Mô tả Tour đã dịch]

**3. LOGIC ON-DEMAND (Chỉ dành cho Text):**
- Khi người dùng đổi sang ngoại ngữ trong Dropdown, nếu chưa có sẵn bản dịch:
  - Giao diện hiển thị trạng thái Loading: *"Đang dịch..."*.
  - Hệ thống tự động gọi API ngầm (**CHỈ gọi script `translate.py`** để dịch chữ, **TUYỆT ĐỐI KHÔNG gọi `tts.py`**).
  - Sau khi dịch xong, lưu vào DB (bảng `tour_translations`) và cập nhật kết quả lên giao diện như Trường hợp 2.

**Action buttons (Tại Modal chính):**
- **Sửa** → Mở Form sửa Tour.
- **Xóa** → Hộp thoại xác nhận xóa.
- **Đóng** → Đóng modal và bỏ highlight trên bản đồ.


#### 5.5.2 Thêm Tour mới

Click button "+ Thêm Tour" → Mở **Form Thêm Tour:**

**Fields:**

| Field         | Loại            | Bắt buộc | Ghi chú                       |
| ------------- | --------------- | -------- | ----------------------------- |
| Tên Tour      | text            | ✅       | Không rỗng, max 255 ký tự     |
| Mô tả         | textarea        | ❌       | Plain text                    |
| Ảnh           | file (multiple) | ❌       | Tối đa 5 ảnh, mỗi ảnh max 5MB |
| Danh sách POI | POI picker      | ✅       | Ít nhất 1 POI                 |

**POI Picker trong form thêm Tour:**

- Hiển thị toàn bộ danh sách POI (cả của Admin và doanh nghiệp) với tên + tọa độ
- Click POI lần đầu → đánh số 1 (màu xanh highlight)
- Click POI thứ hai → đánh số 2
- Click tiếp tục → đánh số tăng dần
- Click lại POI đã chọn → bỏ chọn, các số thứ tự sau đó tự điều chỉnh lại
- Hiển thị preview danh sách POI đã chọn phía dưới picker: `1. Tên POI A → 2. Tên POI B → 3. Tên POI C`

**Sau khi submit:**

- `POST /api/admin/tours` — lưu Tour + danh sách POI + thứ tự

#### 5.5.3 Sửa Tour

Form tương tự Thêm Tour, điền sẵn dữ liệu hiện tại:

- Sửa được: Tên, Mô tả, Ảnh (xóa/thêm ≤ 5), Danh sách POI (thêm/bớt/đổi thứ tự)
- Submit → `PUT /api/admin/tours/:id`
- **Side effect (Cập nhật):** 
  - **Nếu có thay đổi Tên hoặc Mô tả:** Xóa sạch bản dịch trong `tour_translations`.
  - **Nếu KHÔNG thay đổi Tên và Mô tả (Ví dụ: chỉ đổi Ảnh hoặc đổi Danh sách POI):** TUYỆT ĐỐI GIỮ NGUYÊN các bản dịch hiện có để tiết kiệm chi phí dịch thuật.

#### 5.5.4 Xóa Tour

Hộp thoại xác nhận → `DELETE /api/admin/tours/:id`:

- Xóa record Tour
- Xóa records trong `tour_pois`
- Xóa file ảnh Tour vật lý
- **Side effect:** Khi xóa Tour, các bản dịch của Tour đó đang lưu trong bảng `tour_translations` cũng bị xóa theo.

> **Lưu ý:** Xóa Tour KHÔNG xóa POI. POI vẫn tồn tại độc lập.

---

### 5.6 Quản lý Doanh nghiệp (Admin)

**URL:** `/admin/businesses`

**Giao diện:** Ẩn bản đồ, hiển thị danh sách doanh nghiệp dạng danh sách/bảng.

**Danh sách doanh nghiệp:**

- Thanh tìm kiếm: tìm theo tên doanh nghiệp, không phân biệt hoa thường, có dấu/không dấu
- Mỗi doanh nghiệp: Tên + Email + Số POI đã tạo

**Click vào doanh nghiệp → Trang chi tiết doanh nghiệp:**

Hiển thị:

- Tên doanh nghiệp
- Email đăng ký
- Ngày đăng ký
- Danh sách POI của doanh nghiệp này (tên + tọa độ)

**Khi click vào 1 POI trong danh sách doanh nghiệp:**

1. Bản đồ (bên phải hoặc mở overlay) pan đến vị trí POI, highlight chấm POI
2. Mở **Popup Modal xem thông tin POI** (Giống hệ thống hiển thị trong 5.4.3).

**Khác biệt với POI của Admin:**

- Admin **không có nút Sửa** (không sửa được POI doanh nghiệp)
- Admin **có nút Xóa** (xóa POI doanh nghiệp theo cùng logic 5.4.6: không xóa nếu đang trong tour)

---

## 6. Detailed Module Business

### 6.1 Đăng ký

**URL:** `/business/register`

**Form đăng ký:**

| Field             | Loại     | Validation                     |
| ----------------- | -------- | ------------------------------ |
| Tên doanh nghiệp  | text     | Không rỗng, max 255 ký tự      |
| Email             | email    | Format hợp lệ, unique trong DB |
| Mật khẩu          | password | Min 8 ký tự                    |
| Xác nhận mật khẩu | password | Phải khớp với mật khẩu         |

**Sau khi submit:**

- `POST /api/auth/business/register`
- Password được hash bằng `bcrypt` (salt rounds = 10) trước khi lưu DB
- Tạo record trong bảng `businesses`
- **Không tự động đăng nhập** — redirect về trang đăng nhập với thông báo "Đăng ký thành công! Vui lòng đăng nhập."

### 6.2 Đăng nhập

**URL:** `/business/login`

- Input: Email + Password
- `POST /api/auth/business/login` → JWT token
- Redirect về `/business/pois`

### 6.3 Layout Business Portal

**Sidebar trái (không có bản đồ):**

```
┌─────────────────┐
│  [Tên DN]       │
├─────────────────┤
│ 📍 Quản lý POI  │
├─────────────────┤
│ 🚪 Đăng xuất   │
└─────────────────┘
```

**Button "+ Thêm POI"** hiển thị nổi bật ở góc phải trên.

### 6.4 Quản lý POI (Business)

**URL:** `/business/pois`

**Không có bản đồ.** Hiển thị danh sách POI của doanh nghiệp này.

**Danh sách:**

- Thanh tìm kiếm theo tên (không phân biệt hoa thường, có dấu/không dấu)
- Mỗi POI: Tên + Tọa độ (lat, lng)

**Click vào POI trong danh sách → Popup Modal xem thông tin POI:**

**1. Modal thông tin POI chính:**

- Tên POI
- Mô tả gốc (tiếng Việt mặc định)
- Kinh độ, Vĩ độ
- Phạm vi (Range)
- Ảnh (thumbnail, click xem full)
- Nút bấm **"Ngôn ngữ & Audio"**: Mở Modal phụ cấu hình dịch thuật và âm thanh.

**2. Modal phụ "Ngôn ngữ & Audio":**

Tương tự cơ chế của Admin, hệ thống bật mở một Popup mới với nội dung cấu trúc sau:
- **Tiêu đề trên cùng:** "Ngôn ngữ & Audio"
- **Điểm tham quan:** [Tên POI gốc]
- **Chọn ngôn ngữ hiển thị & phát âm:** [Dropdown chọn ngôn ngữ] *(Mặc định: Tiếng Việt)*

Tùy vào ngôn ngữ lựa chọn ở Dropdown:
- **TRƯỜNG HỢP 1 (Ngôn ngữ gốc - VD: Tiếng Việt):**
  - Audio Player: [Giao diện phát nhạc]

- **TRƯỜNG HỢP 2 (Ngoại ngữ - VD: Tiếng Anh, Đức...):**
  - Tên đã dịch: [Tên POI đã dịch]
  - Mô tả đã dịch: [Mô tả POI đã dịch]
  - Audio Player: [Giao diện phát nhạc]

**Cơ chế On-demand (Giữ nguyên logic gốc):**
- Hệ thống tự động gọi API dịch thuật Text và tạo Âm thanh Audio bằng file thực thi Python (`translate.py` và `tts.py`) nếu nội dung chưa có sẵn trong CSDL.
- Trong thời gian chờ, hệ thống hiển thị label Loading: *"Đang dịch..."*, *"Đang tạo âm thanh..."*. Hiển thị nội dung đầy đủ sau khi thực thi ngầm kết thúc.

**Action buttons trong modal chính:**

- **Sửa** → Form sửa POI
- **Xóa** → Hộp thoại xác nhận
- **Đóng**

#### 6.4.1 Thêm POI (Business)

Click "+ Thêm POI" → Form thêm POI:

| Field           | Loại            | Bắt buộc | Validation                                 |
| --------------- | --------------- | -------- | ------------------------------------------ |
| Tên POI         | text            | ✅       | Không rỗng, max 255 ký tự                  |
| Mô tả           | textarea        | ✅       | Không được để trống                        |
| Kinh độ (Lng)   | number          | ✅       | Số thực, [-180, 180], ≤ 6 chữ số thập phân |
| Vĩ độ (Lat)     | number          | ✅       | Số thực, [-90, 90], ≤ 6 chữ số thập phân   |
| Phạm vi (Range) | number          | ❌       | Số nguyên ≥ 1, mặc định = 1             |
| Ảnh             | file (multiple) | ❌       | Tối đa 5 ảnh, max 5MB/ảnh, JPG/PNG/WebP    |

> **Không có bản đồ** trong Business Portal. Doanh nghiệp nhập tay tọa độ. Validate theo định dạng: `10.630297, 106.599131`.

**Sau khi submit:** Giống Admin (lưu POI, upload ảnh, trigger TTS tiếng Việt ngay).

#### 6.4.2 Sửa POI (Business)

Giống quy luật của Admin, cửa sổ sửa POI cho Doanh nghiệp cho sửa: Tên, Mô tả, Kinh độ, Vĩ độ, Range, Ảnh (xóa đi/thêm vào ≤ 5).
**Sau khi submit (Trigger logic TỐI ƯU như Admin):** 
1. `PUT /api/business/pois/:id`.
2. **Side effect Về Audio (Chỉ khi đổi Mô tả):** Nếu `description` thay đổi, hệ thống tăng `new_version = old_version + 1`, xóa sạch các file audio cũ của POI này vật lý và xóa record trong `poi_audio_files`.
3. Sinh lại audio Tiếng Việt của version mới: `poi_{id}_vi_v{new_version}.mp3` và cập nhật record version vào DB.
4. **Side effect Về Dịch thuật (Khi đổi Tên HOẶC Mô tả):** Xóa sạch toàn bộ bản dịch hiện có trong bảng `poi_translations` để chuẩn bị cho quá trình On-demand mới.

#### 6.4.3 Xóa POI (Business)

**Điều kiện:** Không xóa được nếu POI đang trong Tour của Admin hoặc Tour của User.

**Flow:** Giống Admin (kiểm tra `tour_pois`, hộp thoại xác nhận, xóa POI + ảnh + audio + translations).

---

## 7. Detailed Module User

### 7.1 Đăng ký User

**URL:** `/register`

| Field             | Loại     | Validation                |
| ----------------- | -------- | ------------------------- |
| Tên               | text     | Không rỗng, max 255 ký tự |
| Email             | email    | Format hợp lệ, unique     |
| Mật khẩu          | password | Min 8 ký tự               |
| Xác nhận mật khẩu | password | Phải khớp                 |

- `POST /api/auth/user/register` → hash password → tạo record `users`
- **Không tự động đăng nhập** → redirect về màn hình đăng nhập

### 7.2 Đăng nhập User & Khởi tạo App (Session Init)

**Thời điểm thực hiện (Session Init):**
- Ngay sau khi người dùng thực hiện **Đăng nhập** thành công.
- Ngay sau khi **mở lại App** (trường hợp đã có sẵn JWT Token hợp lệ).

**Quy trình thực hiện:**

1. Nếu là đăng nhập mới: `POST /api/auth/user/login` với `{ email, password, language_code }`. Lưu JWT token + `language_code` vào storage.
2. **Background job (Session Init - Thực hiện DUY NHẤT 1 LẦN):**
   - **Sync Version:** Gửi danh sách POI ID/Version hiện băm ở Local Cache lên Server (hoặc lấy danh sách POI gần nhất từ Server kèm Version mới nhất). Thực hiện đối chiếu toàn diện: Nếu `local_version` < `server_version`, đánh dấu cần xóa/tải lại.
   - **Dịch thuật (POI & Tour):** 
     - **POI:** Truy vấn tất cả POI trong bán kính 20km (hoặc POI thuộc Tour gần đó). Kiểm tra/tạo bản dịch (áp dụng cho CẢ `name` và `description`) cho `language_code` đang thiết lập nếu chưa có trong bảng `poi_translations`.
     - **Tour:** Truy vấn các Tour (do Admin tạo) trong phạm vi 20km. Kiểm tra và tự động trigger tiến trình gọi API On-demand (**CHỈ dùng script `translate.py`** để dịch chữ, **TUYỆT ĐỐI KHÔNG dùng `tts.py`**) để tạo bản dịch cho "Tên Tour" và "Mô tả Tour" theo `language_code` của thiết bị nếu bản dịch chưa tồn tại trong bảng `tour_translations`.
3. **UX (Quy tắc hiển thị):** Hệ thống bắt buộc hiển thị màn hình chờ "Đang đồng bộ dữ liệu..." và **CHỈ BẮT ĐẦU HIỂN THỊ** màn hình chính / danh sách POI (với tên và mô tả đã được dịch) **SAU KHI** tiến trình dịch thuật này hoàn tất 100%.
4. Sau khi hoàn thành → Vào màn hình chính. Kể từ lúc này, hệ thống **tin tưởng hoàn toàn** vào dữ liệu cache đã đồng bộ, không thực hiện kiểm tra lại version trong suốt session để tiết kiệm băng thông.

### 7.3 Màn hình chính User

**Bottom navigation bar:**

```
[📋 Thông tin]  [🗺️ Bản đồ]
```

Mặc định vào app → chọn tab **Thông tin**.

Toàn bộ giao diện (label, button, text) hiển thị theo ngôn ngữ đã chọn.

---

### 7.4 Tab Thông tin

Gồm 4 section (scroll dọc):

#### Section 1: Lựa chọn ngôn ngữ

Hiển thị ngôn ngữ hiện tại đã chọn (VD: "🇻🇳 Tiếng Việt"). Có nút "Đổi ngôn ngữ".

Khi nhấn "Đổi ngôn ngữ":

- Dropdown 5 ngôn ngữ
- Chọn ngôn ngữ mới → Cập nhật `language_code` trong storage + user record DB
- Trigger lại background job dịch cho POI/Tour trong 20km với ngôn ngữ mới

#### Section 2: Tour đề xuất

- Header: "Tour gần bạn" (dịch theo ngôn ngữ)
- Lọc: Tất cả Tour của Admin có ít nhất 1 POI trong phạm vi 20km so với vị trí user
- Hiển thị: Tên tour (theo ngôn ngữ đã chọn), thumbnail ảnh đầu tiên (nếu có), số POI trong tour
- Nhấn "Xem tất cả" → Màn hình danh sách Tour (7.4.1)

#### Section 3: POI gần đây

- Header: "Điểm tham quan gần bạn"
- Lọc: Tất cả POI (Admin + doanh nghiệp) trong bán kính 20km, sắp xếp theo khoảng cách tăng dần
- Hiển thị: Tên POI (theo ngôn ngữ), khoảng cách (km), thumbnail ảnh đầu tiên (nếu có)
- Nhấn "Xem tất cả" → Màn hình danh sách POI (7.4.2)

#### Section 4: Tour của bạn

- Header: "Tour của tôi"
- Hiển thị các Tour do User đang đăng nhập tạo
- Nhấn "Xem tất cả" → Màn hình quản lý Tour của User (7.4.3)
- Nếu chưa có tour: Hiển thị "Bạn chưa có tour nào. Tạo tour ngay!"

---

#### 7.4.1 Màn hình danh sách Tour (Admin Tours gần đây)

- Thanh tìm kiếm (theo tên tour)
- Danh sách tour: tên + mô tả ngắn (ngôn ngữ user) + số POI

**Nhấn vào 1 Tour → Màn hình chi tiết Tour:**

- **Tên Tour & Mô tả:** BẮT BUỘC hiển thị bản đã dịch (`translated_name`, `translated_description`) theo đúng ngôn ngữ mà User đang chọn sử dụng (vì đã được đồng bộ dịch ở Session Init). Chỉ fallback về nội dung gốc nếu có sự cố kỹ thuật hoặc bản dịch chưa kịp hoàn tất.
- **Trải nghiệm Tour:** Chỉ hiển thị văn bản (Text-only), **không có các nút Play/Download Audio** (khác với POI).
- **Ảnh:** Thumbnail grid.
- **Danh sách POI trong tour (theo thứ tự):** Số thứ tự + tên POI đã dịch (BẮT BUỘC dùng `translated_name` theo ngôn ngữ user, chỉ fallback về gốc nếu trống).

**Khi nhấn vào 1 POI trong danh sách:**

1. **Hệ thống KHÔNG tự động chuyển sang Tab Bản đồ.**
2. **Mở trực tiếp "Popup Modal chi tiết POI" ngay tại màn hình hiện tại (Tab Thông tin). Điều này giúp người dùng xem nhanh thông tin điểm đến mà không bị mất dấu danh sách Tour đang xem.**

**Nút "Xem trên bản đồ":** Chuyển sang Tab Bản đồ, highlight tất cả POI trong tour (đánh số), POI khác vẫn hiển thị bình thường.

---

#### 7.4.2 Màn hình danh sách POI gần đây

- Thanh tìm kiếm (theo tên POI, ưu tiên tìm trên cả tên dịch và tên gốc)
- Danh sách POI: tên POI đã dịch (`translated_name` theo ngôn ngữ user, chỉ fallback về gốc nếu trống) + khoảng cách

**Nhấn vào 1 POI:**

1. **Hệ thống KHÔNG chuyển sang Tab Bản đồ.**
2. **Mở trực tiếp "Popup Modal chi tiết POI" ngay tại màn hình hiện tại (Tab Thông tin).**
3. **Nội dung Popup Modal chi tiết POI:**
   - **Tiêu đề & Mô tả:** BẮT BUỘC hiển thị Tên POI (`translated_name`) và Mô tả (`translated_description`) theo đúng ngôn ngữ mà User đang chọn sử dụng. Không hiển thị nội dung tiếng Việt gốc nếu user đang chọn ngôn ngữ khác. (Nếu API trả về chưa có bản dịch, mới fallback dùng nội dung gốc).
   - Kinh độ, Vĩ độ, Phạm vi.
   - Ảnh (thumbnail, click xem full).
   - **Bổ sung Action button (hoặc Icon) "Xem trên bản đồ":**
     - **Vị trí: Đặt tại thanh tiêu đề hoặc khu vực Action bar của Modal.**
     - **Hành vi: Khi nhấn vào nút này, hệ thống mới thực hiện chuyển Tab sang "Bản đồ", đồng thời tự động dịch chuyển (pan) vùng nhìn đến vị trí POI và highlight chấm POI đó.**
   - **Khu vực Audio theo ngôn ngữ đã chọn:**
     - **Trường hợp 1 (Audio đã có sẵn):** Nếu file audio của ngôn ngữ đó ĐÃ TỒN TẠI trên server → Hiển thị 2 nút: "Nghe trực tuyến" (Play stream) và "Tải xuống" (Download để nghe offline).
     - **Trường hợp 2 (Audio chưa có):** Nếu file audio CHƯA TỒN TẠI trên server → Hệ thống sẽ **TỰ ĐỘNG trigger tiến trình sinh Audio trên server ngay lập tức** (không cần người dùng bấm nút tạo). 
       - Trong lúc đang xử lý, giao diện hiển thị trạng thái "Đang tạo âm thanh...".
       - Khi tiến trình sinh Audio hoàn tất, giao diện sẽ tự động cập nhật lại thành Trường hợp 1 (hiển thị 2 lựa chọn: "Nghe trực tuyến" và "Tải xuống").

---

#### 7.4.3 Màn hình Tour của User

**Giao diện:**

- Thanh tìm kiếm (tên tour)
- Danh sách Tour của user (tên + số POI)
- Button "+ Tạo Tour mới"

**Nhấn vào 1 Tour của User → Popup Modal chi tiết Tour của User:**

- Tên tour
- Danh sách POI (theo thứ tự): số thứ tự + tên POI + tọa độ
- Button "Xem trên bản đồ": Chuyển sang Tab Bản đồ, highlight các POI trong tour đó (đánh số), các POI khác vẫn hiển thị
- Button "Sửa": Form sửa tour (7.4.4)
- Button "Xóa": Hộp thoại xác nhận → xóa tour (chỉ xóa tour, không xóa POI)

**Nhấn "+ Tạo Tour mới" → Popup Modal tạo Tour:**

| Field         | Loại       | Bắt buộc       |
| ------------- | ---------- | -------------- |
| Tên Tour      | text       | ✅             |
| Danh sách POI | POI picker | ✅ (ít nhất 1) |

**POI Picker:**

- Hiển thị danh sách tất cả POI (Admin + doanh nghiệp) với tên + tọa độ
- Click POI → đánh số thứ tự (1, 2, 3...)
- Click lại → bỏ chọn, số thứ tự các POI sau tự điều chỉnh
- Preview: `1. Tên POI A → 2. Tên POI B`

**Sau khi submit:** `POST /api/user/tours` — Tour lưu vào DB với `created_by = user_id`, chỉ user đó thấy.

#### 7.4.4 Sửa Tour của User

Form giống Tạo Tour, điền sẵn dữ liệu: Tên, Danh sách POI.
Submit → `PUT /api/user/tours/:id`

---

### 7.5 Tab Bản đồ

**Giao diện:**

- Bản đồ Leaflet full-screen.
- Hiển thị **vị trí hiện tại của user** (chấm xanh dương, cập nhật GPS real-time).
- Hiển thị **tất cả POI** (chấm xanh lá) trong phạm vi nhìn thấy trên bản đồ.
- Có thể zoom in/out, pan.
- Circle hiển thị phạm vi Range của mỗi POI (nét đứt, màu xanh nhạt) nếu range >= 1.
- **Nút "Vị trí của tôi" (Locate Me FAB):** Một nút nổi (Floating Action Button) với biểu tượng định vị, được đặt cố định ở góc dưới bên phải giao diện bản đồ.

**Hành vi (UX/Logic):**

- **Nhấn vào nút "Vị trí của tôi":**
  - Hệ thống tự động dịch chuyển (panTo) tâm bản đồ về tọa độ GPS hiện tại của người dùng.
  - Tự động điều chỉnh mức độ thu phóng (Zoom level) về mức tối ưu để quan sát khu vực xung quanh user.
  - **Trường hợp ngoại lệ:** Nếu người dùng chưa bật GPS hoặc từ chối quyền truy cập vị trí, hệ thống hiển thị thông báo (Toast/Alert): *"Vui lòng bật GPS để xác định vị trí của bạn"*.
- **Nhấn vào chấm POI trên bản đồ:**
  - Mở Popup Modal thông tin POI với các tính năng và logic hiển thị On-demand giống hệt mô tả ở **7.4.2**.

---

## 8. Audio Pipeline & Đa ngôn ngữ

### 8.1 Tổng quan Audio Trigger Logic (User App)

```
User di chuyển → GPS cập nhật vị trí
                     ↓
          Tính khoảng cách đến tất cả POI có range >= 1
                     ↓
    ┌────────────────────────────────────────────────┐
    │  Với mỗi POI trong phạm vi theo dõi (5km):    │
    └────────────────────────────────────────────────┘
                     ↓
    Nếu khoảng cách ≤ (range + 100m):
      → CHECK: Đã có bản dịch mô tả ngôn ngữ user chưa?
      → Nếu chưa: dịch ngay tự động (gọi API dịch)
      → CHECK: Đã có file audio ngôn ngữ user chưa?
      → Nếu chưa: TẠO audio tự động ngay lập tức (gọi TTS API)
                     ↓
    Nếu khoảng cách ≤ (range + 30m):
      → PRE-LOAD: Tải file audio về thiết bị (nếu đủ dung lượng)
      → Nếu không đủ dung lượng: chuẩn bị stream URL
                     ↓
    Nếu khoảng cách ≤ 3m VÀ ở trong phạm vi ≥ 3 giây liên tục:
      → PHÁT audio POI này
                     ↓
    Khi user ra khỏi phạm vi 3m:
      → Tiếp tục phát thêm 3 giây
      → Dừng (hoặc chuyển sang POI mới nếu có)
```

### 8.2 Quy tắc ưu tiên khi 2 POI overlap

**Tình huống:** User ở trong phạm vi 3m của cả POI A (id=5) và POI B (id=8) cùng lúc.

**Quy tắc:** Ưu tiên phát audio của POI có **`id` lớn hơn** (POI B - id=8).

POI A (id nhỏ hơn) không được phát trong suốt thời gian user ở trong overlap zone.

### 8.3 Xử lý dung lượng thiết bị

### 8.3 Xử lý dung lượng thiết bị và Quản lý Cache (Versioning)

**Khi tải dữ liệu POI từ Server:**
Server trả về danh sách POI kèm `version` audio mới nhất. Toàn bộ thông tin này chỉ được đối chiếu với Local Cache **DUY NHẤT 1 LẦN** tại bước **Session Init** (Khởi tạo App hoặc Đăng nhập).

**Logic đối chiếu Version tại App (Chỉ thực hiện tại Session Init):**
Hệ thống App quét toàn bộ file `poi_{id}_{lang}_v{local_version}.mp3` trong cache và so sánh với `server_version`:
1. **Nếu local_version < server_version:**
   - App thực hiện **xóa bỏ** file cũ ở local cache ngay lập tức.
   - Chuyển trạng thái nội dung này sang "Chưa tải" để sẵn sàng cho việc tải/stream bản mới.
2. **Nếu local_version == server_version:** Xác nhận bản audio khả dụng là mới nhất. Giữ lại cache để sử dụng Offline.

**Quy tắc "Tin tưởng Cache" (Trong suốt quá trình sử dụng):**
Để tiết kiệm băng thông và tối ưu hiệu năng, sau khi đã hoàn tất bước đối chiếu tại Session Init, App sẽ:
- **KHÔNG** gọi lại API để kiểm tra version khi User đi vào phạm vi POI (30m, 3m).
- **TIN TƯỞNG HOÀN TOÀN** vào file audio đang có trong cache (vì nếu có version mới thì file cũ đã bị xóa ở bước Session Init).

**Khi bắt đầu phát Audio (User đi vào phạm vi 3m):**
- Nếu file audio tồn tại trong cache: Phát trực tiếp từ máy (Offline).
- Nếu cache không có file: Chuyển sang chế độ Stream URL `/api/audio/stream/poi_{id}_{lang}_v{server_version}.mp3`.
- Nếu mất internet và không có cache: Hiển thị icon 🔇.


### 8.4 Luồng tạo Audio (Backend)

**Khi Admin/Business thêm POI mới:**

```
1. Lưu POI vào DB → lấy id mới
2. Spawn Python: python scripts/tts.py --text "{mô tả tiếng Việt}" --lang vi ...
3. Sau  khi Python hoàn thành: INSERT INTO poi_audio_files (poi_id, language_code, version, file_path) VALUES ({id}, 'vi', 0, '/uploads/audio/poi_{id}_vi_v0.mp3')

```

**Khi Admin/Business sửa POI:**

```
Server truy vấn version cao nhất đang có của POI này. Tính toán new_version = current_version + 1.
Cập nhật thông tin data POI cơ bản vào DB.
Xóa sổ từng file vật lý âm thanh và tiến hành xóa toàn bộ lưu trữ của bảng bản dịch poi_translations.
Spawn Python TTS → tạo định dạng file mới poi_{id}_vi_v{new_version}.mp3 (với tham số version bắt buộc gia tăng +1).
INSERT record mới vào poi_audio_files (lưu chính xác giá trị new_version).
```

**Khi Admin/Business MỞ XEM CHI TIẾT POI và ĐỔI NGÔN NGỮ, hoặc User bấm "Tạo Audio":**

Hệ thống cung cấp Endpoint `/api/audio/generate` xử lý On-demand (gọi qua HTTP):
```
1. Nhận poi_id và language_code.
2. Kiểm tra bản dịch trong `poi_translations`, nếu chưa có sẽ gọi script `translate.py` và lưu lại.
3. Kiểm tra file audio trong `poi_audio_files`, nếu chưa có sẽ gọi script `tts.py` với text đã dịch.
4. Lưu record vào `poi_audio_files`. Trả về URL đường dẫn file.
```

### 8.5 Bảng `poi_translations`

```sql
CREATE TABLE poi_translations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poi_id INTEGER NOT NULL,
  language_code TEXT NOT NULL,  -- 'en', 'zh', 'ja', 'ko', ...
  translated_description TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(poi_id, language_code),
  FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE
);
```

### 8.6 Script Python

**scripts/tts.py:**

```python
import asyncio
import edge_tts
import argparse

async def generate(text, voice, output):
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", required=True)
    parser.add_argument("--voice", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    asyncio.run(generate(args.text, args.voice, args.output))
    print("SUCCESS")
```

**scripts/translate.py:**

```python
from deep_translator import GoogleTranslator
import argparse

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", required=True)
    parser.add_argument("--source", default="vi")
    parser.add_argument("--target", required=True)
    args = parser.parse_args()
    result = GoogleTranslator(source=args.source, target=args.target).translate(args.text)
    print(result)
```

### 8.7 Cơ chế dịch giao diện (UI Localization)

Để đảm bảo trải nghiệm người dùng mượt mà và tối ưu hiệu năng, hệ thống phân tách hoàn toàn giữa hai luồng dịch thuật:

| Đặc tính | Dịch Nội dung động (Dynamic) | Dịch Giao diện tĩnh (Static UI) |
| :--- | :--- | :--- |
| **Đối tượng** | Tên POI, Mô tả POI, Tên Tour, Mô tả Tour. | Button, Label, Tiêu đề, Toast, Placeholder... |
| **Cơ chế** | API On-demand (gọi script Python). | Thư viện i18n (local dictionary). |
| **Lưu trữ** | Lưu trong Database (`poi_translations`, `tour_translations`). | Lưu trong các file JSON tĩnh (vi, en, zh, ja, ko) được đóng gói cùng source code. |
| **Thời điểm** | Đồng bộ tại Session Init hoặc trigger On-demand. | Load ngay khi khởi chạy ứng dụng. |
| **Hành vi UX** | Có màn hình chờ "Đang đồng bộ..." (nếu cần). | **Chuyển đổi tức thì (Instant switch)** khi đổi ngôn ngữ, không có độ trễ. |

#### Quy trình cập nhật ngôn ngữ UI:
Khi người dùng thay đổi ngôn ngữ tại màn hình Đăng nhập hoặc Tab Thông tin:
1. **Nguồn dữ liệu Dropdown:** Hệ thống BẮT BUỘC fetch danh sách ngôn ngữ động từ API hệ thống (bảng `languages` trong Database) để hiển thị các lựa chọn cho người dùng.
2. **Cơ chế Fallback (Dự phòng):** Thư viện i18n ở Frontend phải được cấu hình một ngôn ngữ mặc định (Tiếng Anh - 'en'). Nếu người dùng chọn một ngôn ngữ từ Dropdown (ví dụ: 'fr') mà ứng dụng CHƯA CÓ file từ điển tĩnh tương ứng (ví dụ: `fr.json`), thì toàn bộ Text Giao diện (nút bấm, tiêu đề) sẽ tự động fallback hiển thị bằng Tiếng Anh.
3. **Sự độc lập của Nội dung:** Dù UI hiển thị bằng ngôn ngữ Fallback (Tiếng Anh), nhưng luồng dịch ngầm Nội dung/Audio (POI, Tour) VẪN PHẢI gọi API thực thi dịch sang đúng ngôn ngữ User đã chọn (Tiếng Pháp) và lưu vào Database / Cache Local bình thường.
4. Hệ thống cập nhật `language_code` trong local storage.
5. Thư viện i18n tự động map lại các key dịch tương ứng từ file JSON cục bộ (hoặc fallback về 'en').
6. Toàn bộ UI Labels cập nhật ngay lập tức mà không có độ trễ.

---

---

## 9. Business Rules

| ID    | Rule                                                                                                                                              |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-01 | POI không thể xóa nếu đang nằm trong ít nhất 1 Tour (Admin hoặc User). Áp dụng cho cả Admin và Doanh nghiệp.                                      |
| BR-02 | Mô tả POI là bắt buộc (không được để trống) vì dùng để tạo audio TTS.                                                                             |
| BR-03 | Khi thêm mới POI → ngay lập tức tạo audio tiếng Việt (`vi_v0`).                                                                                   |
| BR-04 | **Version Audio & Xóa Cache Dịch:** <br>1. **Audio (Căn cứ trên Mô tả):** Cột `version` chỉ tăng (+1) và xóa/tạo lại file âm thanh khi nội dung **Mô tả (Description)** thay đổi. Nếu chỉ đổi Tên (Name), Version Audio được giữ nguyên.<br>2. **Dịch thuật (Căn cứ trên Tên + Mô tả):** Xóa toàn bộ bản dịch cũ nếu có thay đổi ở **Tên HOẶC Mô tả**.<br>3. **Logic tại App:** Việc kiểm tra đối chiếu version chỉ thực hiện **DUY NHẤT 1 LẦN** tại Session Init. Sau đó hệ thống tin tưởng hoàn toàn vào Local Cache. |
| BR-05 | Khi xóa POI → xóa toàn bộ file audio + bản dịch + ảnh liên quan.                                                                                  |
| BR-06 | Admin không thể sửa POI của Doanh nghiệp. Chỉ có thể xem và xóa (khi POI không trong tour).                                                       |
| BR-07 | Doanh nghiệp không thể xóa POI của doanh nghiệp khác, không nhìn thấy POI của doanh nghiệp khác.                                                  |
| BR-08 | Tour do Admin tạo → tất cả User thấy trong mục "Tour đề xuất". Tour do User tạo → chỉ user đó thấy trong "Tour của tôi".                          |
| BR-09 | Âm thanh chỉ phát khi user vào phạm vi 3m và ở lại ≥ 3 giây liên tục.                                                                             |
| BR-10 | Khi overlap 2 POI, ưu tiên phát audio của POI có id lớn hơn.                                                                                      |
| BR-11 | **Audio On-demand (User View):** Audio các ngôn ngữ không hiển thị sẵn nút Tải xuống / Nghe nếu chưa có. Người dùng có thể nhấn nút Tạo Audio để yêu cầu sinh thủ công nếu muốn. |
| BR-12 | **Audio On-demand (Auto Generation):** Nếu người dùng đến gần POI (range + 100m) và bản audio ngôn ngữ chưa có, hệ thống luôn tự động gọi dịch và tạo audio nền. |
| BR-13 | **Admin & Business View:** Khi xem chi tiết một POI, thay vì load full tất cả audio có thể có làm rối, họ chọn ngôn ngữ qua dropdown và hệ thống sinh On-demand nếu cần (có thông báo tiến độ loading UI rõ ràng). |
| BR-14 | Password của Business và User được hash bằng bcrypt trước khi lưu DB. Admin password cũng phải được hash.                                         |
| BR-15 | Tọa độ POI (Business Portal): lat ∈ [-90, 90], lng ∈ [-180, 180], tối đa 6 chữ số thập phân.                                                      |
| BR-16 | Số lượng ảnh tối đa: 5 ảnh/POI, 5 ảnh/Tour. Khi sửa có thể xóa từng ảnh và thêm mới (tổng ≤ 5).                                                   |
| BR-17 | Tour của Admin có: tên + mô tả + ảnh + danh sách POI. Tour của User có: tên + danh sách POI (không có mô tả và ảnh).                              |
| BR-18 | Khi xóa Tour → không xóa POI, chỉ xóa record Tour và các liên kết `tour_pois`.                                                                    |
| BR-19 | POI range mặc định = 1 nếu không nhập.                                          |
| BR-20 | Doanh nghiệp đăng ký không cần Admin duyệt. Tự động được phép đăng nhập ngay sau khi đăng ký.                                                     |
| BR-21 | **Dịch thuật Tour:** Tính năng dịch đa ngôn ngữ đối với Tour (Tên, Mô tả) chỉ hỗ trợ cho các Tour do Admin tạo. Khi User đăng nhập hoặc đổi ngôn ngữ, App sẽ tự động đồng bộ và gọi dịch ngầm (**On-demand Text-only**) cho các Tour của Admin trong phạm vi gần (20km), đảm bảo User luôn thấy nội dung Tour hiển thị nhất quán bằng ngôn ngữ của họ tương tự như POI. Khi Admin cập nhật nội dung Tour, hệ thống xóa cache bản dịch cũ trong bảng `tour_translations`. |
| BR-22 | **Quy chuẩn UI Localization:** Tuyệt đối không sử dụng API On-demand (Python) để dịch các thành phần giao diện tĩnh (UI). Mọi text cứng trên giao diện phải được quản lý tập trung qua các file từ điển ngôn ngữ (JSON) phía Frontend. Việc mở rộng ngôn ngữ mới trong tương lai cho giao diện chỉ thực hiện bằng cách bổ sung file JSON tương ứng mà không cần thay đổi cấu trúc Database hoặc Logic Backend. |
| BR-24 | **Độc lập giữa Ngôn ngữ UI và Nội dung:** Hệ thống luôn lấy danh sách ngôn ngữ động từ Database (`languages` table) làm nguồn chuẩn duy nhất cho các Dropdown lựa chọn. Chấp nhận sự bất đồng bộ giữa số lượng file dịch giao diện (hỗ trợ MVP 5 ngôn ngữ) và số lượng ngôn ngữ nội dung (hỗ trợ 12+). Frontend bắt buộc cấu hình cơ chế Fallback của i18n về Tiếng Anh cho UI nếu thiếu file từ điển, đảm bảo ứng dụng không bị lỗi (crash) khi Admin thêm ngôn ngữ mới vào hệ thống. |

---

## 10. Database Schema

```sql
-- ============================================================
-- users: Tài khoản người dùng cuối
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,           -- bcrypt hash
  language_code TEXT    NOT NULL DEFAULT 'vi',  -- ngôn ngữ đã chọn khi đăng nhập
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- admins: Tài khoản quản trị viên
-- ============================================================
CREATE TABLE IF NOT EXISTS admins (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  name          TEXT    NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- businesses: Tài khoản doanh nghiệp
-- ============================================================
CREATE TABLE IF NOT EXISTS businesses (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- pois: Điểm tham quan
-- owner_type: 'admin' hoặc 'business'
-- owner_id: id trong bảng admins hoặc businesses
-- ============================================================
CREATE TABLE IF NOT EXISTS pois (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  description TEXT    NOT NULL,        -- Mô tả tiếng Việt gốc (bắt buộc)
  lat         REAL    NOT NULL,        -- [-90, 90]
  lng         REAL    NOT NULL,        -- [-180, 180]
  range_m     INTEGER NOT NULL DEFAULT 1,  -- Phạm vi (mét), >= 1
  owner_type  TEXT    NOT NULL,        -- 'admin' hoặc 'business'
  owner_id    INTEGER NOT NULL,        -- id trong admins hoặc businesses
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pois_owner ON pois(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_pois_location ON pois(lat, lng);

-- ============================================================
-- poi_images: Ảnh của POI (tối đa 5 ảnh/POI)
-- ============================================================
CREATE TABLE IF NOT EXISTS poi_images (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  poi_id      INTEGER NOT NULL,
  file_path   TEXT    NOT NULL,        -- VD: /uploads/pois/poi_5_a3f2.jpg
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE
);

-- ============================================================
-- poi_translations: Bản dịch mô tả POI theo ngôn ngữ
-- ============================================================
CREATE TABLE IF NOT EXISTS poi_translations (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  poi_id                INTEGER NOT NULL,
  language_code         TEXT    NOT NULL,   -- 'en', 'zh', 'ja', 'ko', ...
  translated_name       TEXT,               -- Tên POI đã dịch (NULL nếu chưa có)
  translated_description TEXT   NOT NULL,   -- Background job sẽ dịch cả name và description
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(poi_id, language_code),
  FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_poi_trans_lang ON poi_translations(poi_id, language_code);

-- ============================================================
-- poi_audio_files: File audio đã sinh bởi TTS
-- ============================================================
CREATE TABLE IF NOT EXISTS poi_audio_files (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  poi_id        INTEGER NOT NULL,
  language_code TEXT    NOT NULL,   -- 'vi', 'en', 'zh', 'ja', 'ko', ...
  version       INTEGER NOT NULL DEFAULT 0,   -- Reset về 0 khi POI được sửa
  file_path     TEXT    NOT NULL,   -- VD: /uploads/audio/poi_5_vi_v0.mp3
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(poi_id, language_code),    -- Mỗi POI chỉ có 1 file audio/ngôn ngữ (version mới nhất)
  FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audio_poi_lang ON poi_audio_files(poi_id, language_code);

-- ============================================================
-- tours: Lộ trình tour
-- ============================================================
CREATE TABLE IF NOT EXISTS tours (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT    NOT NULL,
  description      TEXT,                    -- NULL nếu tour do User tạo
  created_by_type  TEXT    NOT NULL,         -- 'admin' hoặc 'user'
  created_by_id    INTEGER NOT NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tours_creator ON tours(created_by_type, created_by_id);

-- ============================================================
-- tour_images: Ảnh của Tour (tối đa 5 ảnh/Tour, chỉ Admin tour có ảnh)
-- ============================================================
CREATE TABLE IF NOT EXISTS tour_images (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id     INTEGER NOT NULL,
  file_path   TEXT    NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE
);

-- ============================================================
-- tour_pois: Liên kết Tour ↔ POI với thứ tự
-- ============================================================
CREATE TABLE IF NOT EXISTS tour_pois (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id   INTEGER NOT NULL,
  poi_id    INTEGER NOT NULL,
  position  INTEGER NOT NULL,          -- Thứ tự trong tour (1, 2, 3...)
  UNIQUE(tour_id, poi_id),
  UNIQUE(tour_id, position),
  FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE,
  FOREIGN KEY (poi_id)  REFERENCES pois(id)   -- Không CASCADE: xóa tour không xóa POI
);

CREATE INDEX IF NOT EXISTS idx_tour_pois_tour ON tour_pois(tour_id, position);
CREATE INDEX IF NOT EXISTS idx_tour_pois_poi  ON tour_pois(poi_id);

-- ============================================================
-- languages: Danh sách ngôn ngữ hỗ trợ
-- ============================================================
CREATE TABLE IF NOT EXISTS languages (
  code        TEXT    PRIMARY KEY,     -- 'vi', 'en', 'zh', 'ja', 'ko'
  name        TEXT    NOT NULL,        -- 'Tiếng Việt', 'English', ...
  tts_voice   TEXT    NOT NULL,        -- edge-tts voice name
  is_active   INTEGER NOT NULL DEFAULT 1
);

-- Seed data
INSERT OR IGNORE INTO languages VALUES ('vi', 'Tiếng Việt', 'vi-VN-HoaiMyNeural', 1);
INSERT OR IGNORE INTO languages VALUES ('en', 'English', 'en-US-JennyNeural', 1);
INSERT OR IGNORE INTO languages VALUES ('zh', '中文', 'zh-CN-XiaoxiaoNeural', 1);
INSERT OR IGNORE INTO languages VALUES ('ja', '日本語', 'ja-JP-NanamiNeural', 1);
INSERT OR IGNORE INTO languages VALUES ('ko', '한국어', 'ko-KR-SunHiNeural', 1);
```

---

## 11. API Specifications

> **Quy ước chung hệ thống:**
> - Tất cả API của Admin ưu tiên cung cấp Header: `Authorization: Bearer <admin_token>`
> - Tất cả API của Business cung cấp Header: `Authorization: Bearer <business_token>`
> - Tất cả API của User cung cấp Header: `Authorization: Bearer <user_token>`
> - API có upload ảnh gửi bằng format: `Content-Type: multipart/form-data`
> - Các POST/PUT thông thường gửi bằng format: `Content-Type: application/json`
---
### 11.1 Authentication
```text
POST /api/auth/admin/login
  Method: POST
  Content-Type: application/json
  Body: { email: string, password: string }
  200: { token: string, admin: { id: number, name: string, email: string } }
  401: { error: "Email hoặc mật khẩu không đúng" }
POST /api/auth/business/register
  Method: POST
  Content-Type: application/json
  Body: { name: string, email: string, password: string, confirm_password: string }
  201: { message: "Đăng ký thành công" }
  400: { error: "Email đã được sử dụng" }
  400: { error: "Mật khẩu xác nhận không khớp" }
  400: { error: "Validation error", fields: { [field_name]: "message" } }
POST /api/auth/business/login
  Method: POST
  Content-Type: application/json
  Body: { email: string, password: string }
  200: { token: string, business: { id: number, name: string, email: string } }
  401: { error: "Email hoặc mật khẩu không đúng" }
POST /api/auth/user/register
  Method: POST
  Content-Type: application/json
  Body: { name: string, email: string, password: string, confirm_password: string }
  201: { message: "Đăng ký thành công. Vui lòng đăng nhập." }
  400: { error: "Tham số đầu vào không hợp lệ", fields: { [field_name]: "message" } }
POST /api/auth/user/login
  Method: POST
  Content-Type: application/json
  Body: { email: string, password: string, language_code: string }
  200: { token: string, user: { id: number, name: string, email: string, language_code: string } }
  401: { error: "Email hoặc mật khẩu không đúng" }
  -- Side effect: Trigger background job ngầm để dịch toàn bộ POI/Tour nằm trong bán kính 20km của User (nếu cần thiết).

---
```
### 11.2 Admin — POI

GET /api/admin/pois
  Method: GET
  Header: Authorization: Bearer <admin_token>
  Query: ?search=<text> (Chấp nhận chuỗi tiếng Việt có dấu/không dấu, không phân biệt hoa thường)
  200: [{ 
         id: number, name: string, description: string, lat: number, lng: number, range_m: number, 
         owner_type: string, owner_id: number,
         images: [{ id: number, file_path: string }],
         audio_files: [{ language_code: string, version: number, file_path: string }],
         translations: [{ language_code: string, translated_name: string, translated_description: string }] 
       }]

POST /api/admin/pois
  Method: POST
  Header: Authorization: Bearer <admin_token>
  Content-Type: multipart/form-data
  Body: 
    - name: string (bắt buộc)
    - description: text (bắt buộc)
    - lat: number (bắt buộc)
    - lng: number (bắt buộc)
    - range_m: number (tùy chọn, default 1)
    - images[]: file array (tối đa 5 file, mỗi file <= 5MB)
  201: { id: number, name: string, description: string, lat: number, lng: number, range_m: number }
  400: { error: "Dữ liệu không hợp lệ", fields: { ... } }
  -- Side effect: Khởi tạo giá trị audio version = 0. Spawn tiến trình Python TTS tạo Audio tiếng Việt ngay lập tức.

PUT /api/admin/pois/:id
  Method: PUT
  Header: Authorization: Bearer <admin_token>
  Content-Type: multipart/form-data
  Body: 
    - name, description, lat, lng, range_m (tùy chọn cập nhật)
    - new_images[] (tùy chọn thêm ảnh)
    - delete_image_ids[] (tùy chọn xóa các id ảnh cũ)
  200: { 
         success: boolean, 
         audio_version: number  // BẮT BUỘC trả về version mới nhất sau khi tăng (vd: 1, 2, 3...)
       }
  404: { error: "POI không tồn tại" }
  403: { error: "Không có quyền sửa POI này" }
  -- Side effect TỐI QUAN TRỌNG: 
     1) Về Audio (Chỉ khi đổi Mô tả): Hệ thống tính toán `new_version = old_version + 1`, xóa sạch các mp3 cũ vật lý và tạo lại audio Tiếng Việt theo version mới. Trả về `audio_version` mới.
     2) Về Dịch thuật (Khi đổi Tên HOẶC Mô tả): Xóa sạch các record trong `poi_translations`.
     3) Nếu không đổi name/description (chỉ đổi lat/lng/ảnh...): GIỮ NGUYÊN Audio Version và các bản dịch hiện có.

DELETE /api/admin/pois/:id
  Method: DELETE
  Header: Authorization: Bearer <admin_token>
  200: { success: true }
  404: { error: "POI không tồn tại" }
  409: { error: "Không thể xóa POI đang nằm trong Tour", tours: [{ id: number, name: string }] }
  -- Side effect: Hủy bỏ data POI + Xóa sạch các records Audio/Images/Translations và file vật lý liên quan.

### 11.3 Admin — Tour

GET /api/admin/tours
  Method: GET
  Header: Authorization: Bearer <admin_token>
  Query: ?search=<text> (Chuỗi tiếng Việt có dấu/không dấu)
  200: [{ 
         id: number, name: string, description: string, created_by_type: string, created_by_id: number,
         images: [{ id: number, file_path: string }],
         pois: [{ position: number, poi_id: number, name: string, lat: number, lng: number }],
         translations: [{ language_code: string, translated_name: string, translated_description: string }]
       }]

POST /api/admin/tours
  Method: POST
  Header: Authorization: Bearer <admin_token>
  Content-Type: multipart/form-data
  Body: 
    - name: string
    - description: text
    - images[]: file array (tối đa 5)
    - poi_ids: chuỗi JSON string mảng ID theo thứ tự (VD: "[5, 12, 1]")
  201: { id: number, name: string, ... }
  400: { error: "Thiếu dữ liệu bắt buộc" }

PUT /api/admin/tours/:id
  Method: PUT
  Header: Authorization: Bearer <admin_token>
  Content-Type: multipart/form-data
  Body: { name?, description?, new_images[], delete_image_ids[], poi_ids? }
  200: { success: true }
  404: { error: "Tour không tồn tại" }
  -- Side effect: 
     1) Nếu thay đổi `name` hoặc `description`: Xóa sạch các record bản dịch của Tour này trong `tour_translations`.
     2) Nếu KHÔNG thay đổi name/description: Giữ nguyên toàn bộ bản dịch hiện có.

DELETE /api/admin/tours/:id
  Method: DELETE
  Header: Authorization: Bearer <admin_token>
  200: { success: true }
  404: { error: "Tour không tồn tại" }
  -- Side effect: Loại bỏ record Tour khỏi hệ thống, KHÔNG xóa các tham chiếu POI gốc. Bắt buộc xóa kèm các records bên trong bảng `tour_translations`.

### 11.4 Admin — Doanh nghiệp

```
GET /api/admin/businesses
  Method: GET
  Header: Authorization: Bearer <admin_token>
  Query: ?search=<text>
  200: [{ id: number, name: string, email: string, created_at: string, poi_count: number }]

GET /api/admin/businesses/:id
  Method: GET
  Header: Authorization: Bearer <admin_token>
  200: { 
         id: number, name: string, email: string, created_at: string,
         pois: [{ id, name, lat, lng, images: [...], audio_files: [...], translations: [...] }] 
       }

DELETE /api/admin/pois/business/:poi_id
  Method: DELETE
  Header: Authorization: Bearer <admin_token>
  200: { success: true }
  409: { error: "Không thể xóa POI đang trong Tour", tours: [...] }
  -- Ghi chú: Sử dụng khi Admin cần dọn dẹp POI lỗi của doanh nghiệp.
```

### 11.5 Admin — Dashboard

GET /api/admin/dashboard/stats
  Method: GET
  Header: Authorization: Bearer <admin_token>
  200: {
    total_users: number,
    total_businesses: number,
    total_pois: number,
    pois_by_admin: number,
    pois_by_business: number,
    total_tours: number,
    tours_by_admin: number,
    tours_by_user: number
  }
  -- online_users được lấy từ Firebase Realtime DB phía client, không qua API này



### 11.6 Business — POI

```
GET /api/business/pois
  Method: GET
  Header: Authorization: Bearer <business_token>
  Query: ?search=<text> 
  200: [{ 
         id: number, name: string, description: string, lat: number, lng: number, range_m: number,
         images: [...], audio_files: [...], 
         translations: [{ language_code: string, translated_name: string, translated_description: string }] 
       }]
  -- Ghi chú: Chỉ lọc/trả về đúng các POI thuộc về Business đang gửi Request.

POST /api/business/pois
  Method: POST
  Header: Authorization: Bearer <business_token>
  Content-Type: multipart/form-data
  Body: { name, description, lat, lng, range_m?, images[] }
  201: { id: number, name: string, ... }
  -- Side effect: Chạy init version = 0, khởi tạo Audio Tiếng Việt.

PUT /api/business/pois/:id
  Method: PUT
  Header: Authorization: Bearer <business_token>
  Content-Type: multipart/form-data
  Body: { name?, description?, lat?, lng?, range_m?, new_images[], delete_image_ids[] }
  200: { 
         success: true, 
         audio_version: number  // BẮT BUỘC nhận version tăng tiến (+1) cho App tải lệnh xóa Cache.
       }
  403: { error: "Không có quyền sửa POI này" }
  -- Side effect: Tương tự như Admin (Calculated new_version = old_version + 1, Hủy bộ file âm thanh/phiên dịch cũ, tạo lại audio Tiếng Việt của version mới).

DELETE /api/business/pois/:id
  Method: DELETE
  Header: Authorization: Bearer <business_token>
  200: { success: true }
  403: { error: "Không có quyền xóa POI này" }
  409: { error: "Không thể xóa POI đang nằm trong Tour", tours: [...] }
```

### 11.7 User — POI & Tour

```
GET /api/user/pois/nearby
  Method: GET
  Header: Authorization: Bearer <user_token>
  Query: 
    - lat: number
    - lng: number
    - radius: number (bán kính theo mét, default 20000)
    - search: string (tùy chọn, chuỗi không dấu/có dấu)
  200: [{ 
         id: number, name: string, description: string, lat: number, lng: number, range_m: number,
         images: [...], audio_version: number, distance_m: number,
         translations: [{ language_code: string, translated_name: string, translated_description: string }] 
       }]
  -- Ghi chú: 
     - Trả về `audio_version` mới nhất từ Database theo ngôn ngữ của hệ thống để App kiểm tra Cache.
     - `translations`: Chứa tên và mô tả đã dịch. App sẽ map từ mảng này (nếu đã có bản dịch) dựa theo language_code, ngược lại fallback về chuỗi gốc (`name`, `description`) để chọc trigger dịch thủ công.

GET /api/user/tours/nearby
  Method: GET
  Header: Authorization: Bearer <user_token>
  Query: ?lat=<number>&lng=<number>&radius=20000&search=<text>
  200: [{ 
         id: number, name: string, description_localized: string, images: [...],
         pois: [{ position: number, poi_id: number, name_localized: string, lat: number, lng: number }] 
       }]
  -- Ghi chú: Hiển thị các Public Tours (tạo bởi Admin).

GET /api/user/tours/mine
  Method: GET
  Header: Authorization: Bearer <user_token>
  200: [{ id: number, name: string, pois: [{ position, poi_id, name, lat, lng }] }]
  -- Ghi chú: Danh sách Tour thiết kế cá nhân (Private) của User.

POST /api/user/tours
  Method: POST
  Header: Authorization: Bearer <user_token>
  Content-Type: application/json
  Body: { name: string, poi_ids: [mảng ID của các POI có thứ tự] }
  201: { id: number, name: string }

PUT /api/user/tours/:id
  Method: PUT
  Header: Authorization: Bearer <user_token>
  Content-Type: application/json
  Body: { name: string?, poi_ids: number[]? }
  200: { success: true }
  403: { error: "Không có quyền sửa tour này" }

DELETE /api/user/tours/:id
  Method: DELETE
  Header: Authorization: Bearer <user_token>
  200: { success: true }
  403: { error: "Không có quyền xóa tour này" }
```

---

### 11.8 Audio & Translation On-demand

```
GET /api/audio/stream/:filename
  Method: GET
  Header: Authorization: Bearer <user_token>
  Tham số filename: `poi_{id}_{lang}_v{version}.mp3`
  200: Audio binary stream chunked (Header -> Content-Type: audio/mpeg)
  404: { error: "File audio chưa được khởi tạo trên server" }
  -- Chức năng: Bypass tải nguyên luồng, cho phép App User nghe trực tiếp theo giao thức Stream nếu user không dư dả dung lượng máy.

POST /api/audio/generate
  Method: POST
  Header: Authorization: Bearer <user_token> | Bearer <admin_token> | Bearer <business_token>
  Content-Type: application/json
  Body: { 
          poi_id: number, 
          language_code: string 
        }
  200: { 
         success: boolean, 
         already_existed: boolean,  // True nếu bản dịch/audio version này đã có sẵn trong máy chủ.
         file_path: string,         // Đường dẫn URL để tải / stream file mp3.
         audio_version: number      // Phiên bản version mới nhất để Update Cache.
       }
  404: { error: "Không tìm thấy POI ID" }
  -- Side effect: 
     - Xử lý ĐỒNG BỘ quá trình Sinh On-demand. 
     - Step 1: Query Database, nếu bản dịch `language_code` chưa có -> Chạy `translate.py`.
     - Step 2: Query File System, nếu tham chiếu `poi_{id}_{lang}_v{version}.mp3` chưa tồn tại -> Chạy `tts.py` theo Text đã dịch. Hành vi ngâm API Request này tới chừng nào sinh xong file vật lý mới quăng Response về cho App.

POST /api/translate/batch
  Method: POST
  Header: Authorization: Bearer <user_token>
  Content-Type: application/json
  Body: {
    language_code: string,
    poi_ids: number[],       // Danh sách ID các POI cần quét
    tour_ids: number[]       // Danh sách ID các Tour cần quét
  }
  200: { 
         success: boolean, 
         translated_count: number  // Số nội dung thực tế vừa được chạy qua Deep-Translator
       }
  -- Trình kích hoạt này thường đặt ngay tại lúc User Logon hoặc bật ứng dụng lên, giúp background app càn lướt các POI trong bán kính 20km và tự động tạo mô tả đa ngôn ngữ lưu Database trươc khi User truy cập.
```

---

## 12. Non-functional Requirements

### 12.1 Performance

| Yêu cầu                                 | Giá trị                                               |
| --------------------------------------- | ----------------------------------------------------- |
| API response (không tính TTS/translate) | < 500ms                                               |
| Tạo audio TTS (Python subprocess)       | < 10 giây (async, không chặn response UI nếu được)    |
| UX On-demand Loading                    | Các thao tác dịch/tts từ user phải có Loading UI      |
| Cập nhật GPS user                       | Mỗi 3 giây                                            |
| Kiểm tra proximity POI                  | Mỗi lần GPS cập nhật                                  |

### 12.2 Security

| Yêu cầu     | Chi tiết                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------ |
| JWT Token   | TTL: 24 giờ, ký bằng `JWT_SECRET` từ env                                                   |
| Password    | bcrypt, salt rounds = 10                                                                   |
| File upload | Validate MIME type server-side (chỉ `image/jpeg`, `image/png`, `image/webp`), max 5MB/file |
| POI access  | Business chỉ truy cập POI của chính họ (server-side enforce)                               |
| Tour access | User chỉ sửa/xóa Tour của chính họ                                                         |

### 12.3 File Storage

```
/uploads/
  pois/       ← ảnh POI:   poi_{id}_{uuid}.{ext}
  tours/      ← ảnh Tour:  tour_{id}_{uuid}.{ext}
  audio/      ← audio:     poi_{id}_{lang}_v{version}.mp3
```

- Khi file không tồn tại và `fs.unlink` fail: log warning, không throw error, tiếp tục xử lý DB
- Serve static files: `GET /uploads/pois/:filename`, `GET /uploads/tours/:filename`

### 12.4 Search (Tìm kiếm không dấu)

Tìm kiếm theo tên POI/Tour/Doanh nghiệp hỗ trợ:

- Không phân biệt hoa/thường
- Có dấu và không dấu (VD: "ben thuyen" tìm được "Bến Thuyền")

**Implementation:** Dùng thư viện `slugify` hoặc custom normalize function.

### 12.5 GPS & Location

- Yêu cầu quyền GPS từ user khi lần đầu vào app
- Cập nhật vị trí mỗi 3 giây khi app đang active
- Nếu user từ chối quyền GPS: các tính năng "gần đây" hiển thị thông báo yêu cầu bật GPS

### 12.6 Offline Behavior

| Tình huống                              | Hành vi                                |
| --------------------------------------- | -------------------------------------- |
| Không có internet                       | Không phát audio, hiển thị 🔇          |
| Thiếu dung lượng (< 50MB)               | Stream từ server thay vì download      |
| File audio chưa tạo + không có internet | Không phát, không báo lỗi to (chỉ log) |

---

_PRD v1.8 — GPS Du lịch Đa ngôn ngữ. Tài liệu này là Single Source of Truth. Mọi thay đổi cần cập nhật version._
