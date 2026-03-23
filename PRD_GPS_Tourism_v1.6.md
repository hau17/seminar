# PRD — Hệ thống GPS Du lịch Đa ngôn ngữ

## (Single Source of Truth — Phiên bản đầy đủ)

**Version:** 1.6
**Ngày:** 2026-03-22  
**Tác giả:** Senior BA / PO  
**Trạng thái:** Sẵn sàng để phát triển

---

## Mục lục

1. [Overview & Goals](#1-overview--goals)
2. [Tech Stack](#2-tech-stack)
3. [Personas & Roles](#3-personas--roles)
4. [Kiến trúc hệ thống tổng quan](#4-kiến-trúc-hệ-thống-tổng-quan)
5. [Module Admin](#5-module-admin)
6. [Module Doanh nghiệp (Business)](#6-module-doanh-nghiệp-business)
7. [Module User](#7-module-user)
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

## 2. Tech Stack

| Layer                          | Công nghệ                                     |
| ------------------------------ | --------------------------------------------- |
| **Backend chính**              | Node.js + Express                             |
| **TTS (sinh audio)**           | Python subprocess → `edge-tts` library        |
| **Dịch thuật**                 | Python subprocess → `deep-translator` library |
| **Database**                   | SQLite (`better-sqlite3`)                     |
| **Realtime / Online tracking** | Firebase Realtime Database                    |
| **File storage**               | Local filesystem                              |
| **Auth**                       | JWT (access token)                            |
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

## 3. Personas & Roles

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
| Audio POI | `poi_{id}_{lang}_v{version}.mp3` | `poi_5_vi_v0.mp3` |

**Version audio:** Mỗi lần POI bị sửa, tất cả audio cũ bị xóa và version reset về `0`. File mới tiếng Việt được tạo là `poi_{id}_vi_v0.mp3`. Các ngôn ngữ khác sau này sẽ cũng bắt đầu từ `v0` của lần sửa mới nhất.

---

## 5. Module Admin

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

**Hiển thị (read-only):**

- Tên POI
- Mô tả (tiếng Việt gốc)
- Danh sách các bản dịch mô tả đã tồn tại (badge ngôn ngữ: VI, EN, ZH, JA, KO...)
- Kinh độ (Longitude)
- Vĩ độ (Latitude)
- Phạm vi (Range) — đơn vị mét
- Ảnh (hiển thị dạng thumbnail grid, tối đa 5 ảnh; click ảnh → xem full size)
- Danh sách file audio đã tồn tại: mỗi file hiển thị `[VI] poi_5_vi_v0.mp3 [▶ Nghe]`

**Action buttons:**

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
| Phạm vi (Range) | number          | ❌       | Số nguyên ≥ 0, mặc định = 0                           |
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

1. `PUT /api/admin/pois/:id` — cập nhật POI trong DB
2. Xử lý ảnh (xóa ảnh bị xóa, upload ảnh mới)
3. **Xóa toàn bộ file audio cũ** của POI này (mọi ngôn ngữ, mọi version): `DELETE /uploads/audio/poi_{id}_*.mp3`
4. **Xóa records trong `poi_audio_files`** theo `poi_id`
5. **Xóa records trong `poi_translations`** theo `poi_id` (bản dịch cũ không còn phù hợp với mô tả mới)
6. Gọi Python TTS tạo lại audio tiếng Việt: `poi_{id}_vi_v0.mp3`
7. Lưu record audio mới vào `poi_audio_files`

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

#### 5.5.1 Click vào Tour trong danh sách

1. Bản đồ tự động `fitBounds` để hiển thị tất cả POI trong tour
2. Các POI thuộc tour được **highlight màu cam/đỏ** với **số thứ tự** hiển thị trên chấm (1, 2, 3...)
3. Các POI không thuộc tour vẫn hiển thị bình thường (chấm xanh lá)
4. Mở **Popup Modal thông tin Tour**

**Popup Modal thông tin Tour (read-only):**

- Tên Tour
- Mô tả
- Ảnh (thumbnail grid, click xem full)
- Danh sách POI trong tour (theo thứ tự): số thứ tự + tên POI + tọa độ

**Action buttons:**

- **Sửa** → Form sửa Tour
- **Xóa** → Hộp thoại xác nhận
- **Đóng** → Đóng modal, bỏ highlight

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

#### 5.5.4 Xóa Tour

Hộp thoại xác nhận → `DELETE /api/admin/tours/:id`:

- Xóa record Tour
- Xóa records trong `tour_pois`
- Xóa file ảnh Tour vật lý

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
2. Mở **Popup Modal xem thông tin POI** (như 5.4.3, nhưng là POI doanh nghiệp)

**Khác biệt với POI của Admin:**

- Admin **không có nút Sửa** (không sửa được POI doanh nghiệp)
- Admin **có nút Xóa** (xóa POI doanh nghiệp theo cùng logic 5.4.6: không xóa nếu đang trong tour)

---

## 6. Module Doanh nghiệp (Business)

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

- Tên
- Mô tả (tiếng Việt gốc)
- Các bản dịch đã tồn tại (badge ngôn ngữ)
- Kinh độ, Vĩ độ
- Phạm vi (Range)
- Ảnh (thumbnail, click xem full)
- Danh sách file audio đã tồn tại (với nút nghe)

**Action buttons trong modal:**

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
| Phạm vi (Range) | number          | ❌       | Số nguyên ≥ 0, mặc định = 0                |
| Ảnh             | file (multiple) | ❌       | Tối đa 5 ảnh, max 5MB/ảnh, JPG/PNG/WebP    |

> **Không có bản đồ** trong Business Portal. Doanh nghiệp nhập tay tọa độ. Validate theo định dạng: `10.630297, 106.599131`.

**Sau khi submit:** Giống Admin (lưu POI, upload ảnh, trigger TTS tiếng Việt ngay).

#### 6.4.2 Sửa POI (Business)

Giống Admin, sửa được: Tên, Mô tả, Kinh độ, Vĩ độ, Range, Ảnh (xóa/thêm ≤ 5).

**Sau khi submit:** Giống Admin (xóa audio cũ, tạo lại audio VI v0, xóa bản dịch cũ).

#### 6.4.3 Xóa POI (Business)

**Điều kiện:** Không xóa được nếu POI đang trong Tour của Admin hoặc Tour của User.

**Flow:** Giống Admin (kiểm tra `tour_pois`, hộp thoại xác nhận, xóa POI + ảnh + audio + translations).

---

## 7. Module User

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

### 7.2 Đăng nhập User

**URL:** `/login`

**Form đăng nhập:**

- Email
- Password
- **Bắt buộc chọn ngôn ngữ** (dropdown — 5 lựa chọn): Tiếng Việt | English | 中文 | 日本語 | 한국어

**Sau khi nhấn "Đăng nhập":**

1. `POST /api/auth/user/login` với `{ email, password, language_code }`
2. Lưu JWT token + `language_code` vào storage
3. **Background job (async, không chặn UI):**
   - Lấy vị trí hiện tại của user (GPS)
   - Truy vấn tất cả POI trong bán kính 20km
   - Với mỗi POI: kiểm tra xem đã có bản dịch `language_code` trong `poi_translations` chưa
   - Nếu chưa: gọi `translate.py` để dịch → lưu vào `poi_translations`
   - Tương tự cho Tour trong 20km (lưu vào `tour_translations`)
4. Hiển thị loading indicator nhỏ "Đang tải nội dung ngôn ngữ của bạn..."
5. Sau khi background job hoàn thành → redirect về màn hình chính

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

- Tên Tour (theo ngôn ngữ)
- Mô tả (theo ngôn ngữ — lấy từ `tour_translations` hoặc mô tả gốc nếu chưa dịch)
- Ảnh (thumbnail grid)
- Danh sách POI trong tour (theo thứ tự): số thứ tự + tên POI (theo ngôn ngữ)

**Khi nhấn vào 1 POI trong danh sách:**

1. Chuyển sang Tab Bản đồ
2. Bản đồ pan đến vị trí POI, highlight chấm POI
3. Mở Popup Modal thông tin POI (tên, mô tả theo ngôn ngữ, lat/lng, ảnh)

**Nút "Xem trên bản đồ":** Chuyển sang Tab Bản đồ, highlight tất cả POI trong tour (đánh số), POI khác vẫn hiển thị bình thường.

---

#### 7.4.2 Màn hình danh sách POI gần đây

- Thanh tìm kiếm (theo tên POI, ngôn ngữ hiện tại)
- Danh sách POI: tên + khoảng cách

**Nhấn vào 1 POI:**

1. Chuyển sang Tab Bản đồ
2. Pan đến POI, highlight
3. Mở Popup Modal: tên (ngôn ngữ), mô tả (ngôn ngữ), lat/lng, ảnh

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

- Bản đồ Leaflet full-screen
- Hiển thị **vị trí hiện tại của user** (chấm xanh dương, cập nhật GPS real-time)
- Hiển thị **tất cả POI** (chấm xanh lá) trong phạm vi nhìn thấy trên bản đồ
- Có thể zoom in/out, pan
- Circle hiển thị phạm vi Range của mỗi POI (nét đứt, màu xanh nhạt) nếu range > 0

**Nhấn vào chấm POI trên bản đồ:**

- Mở Popup Modal thông tin POI: tên (ngôn ngữ), mô tả (ngôn ngữ), lat/lng, ảnh

---

## 8. Audio Pipeline & Đa ngôn ngữ

### 8.1 Tổng quan Audio Trigger Logic (User App)

```
User di chuyển → GPS cập nhật vị trí
                     ↓
          Tính khoảng cách đến tất cả POI có range > 0
                     ↓
    ┌────────────────────────────────────────────────┐
    │  Với mỗi POI trong phạm vi theo dõi (5km):    │
    └────────────────────────────────────────────────┘
                     ↓
    Nếu khoảng cách ≤ (range + 100m):
      → CHECK: Đã có bản dịch mô tả ngôn ngữ user chưa?
      → Nếu chưa: dịch ngay (gọi API dịch)
      → CHECK: Đã có file audio ngôn ngữ user chưa?
      → Nếu chưa: TẠO audio (gọi TTS API)
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

**Khi pre-load audio (user cách range 30m):**

1. Kiểm tra dung lượng trống: Nếu < 50MB → bỏ qua download
2. Download file về cache local

**Khi phát (user vào phạm vi 3m):**

- Nếu file đã được download: phát từ local cache
- Nếu file chưa được download (thiếu dung lượng): phát stream từ server URL `/api/audio/stream/poi_{id}_{lang}_v{version}.mp3`
- Nếu không có internet: không phát, hiển thị icon (🔇) trên POI indicator

### 8.4 Luồng tạo Audio (Backend)

**Khi Admin/Business thêm POI mới:**

```
1. Lưu POI vào DB → lấy id mới
2. Spawn Python: python scripts/tts.py
   --text "{mô tả tiếng Việt}"
   --lang vi
   --voice "vi-VN-HoaiMyNeural"
   --output "/uploads/audio/poi_{id}_vi_v0.mp3"
3. Sau khi Python hoàn thành:
   INSERT INTO poi_audio_files (poi_id, language_code, version, file_path)
   VALUES ({id}, 'vi', 0, '/uploads/audio/poi_{id}_vi_v0.mp3')
```

**Khi Admin/Business sửa POI:**

```
1. Cập nhật POI trong DB
2. SELECT file_path FROM poi_audio_files WHERE poi_id = {id}
3. Xóa từng file vật lý: fs.unlink(file_path)
4. DELETE FROM poi_audio_files WHERE poi_id = {id}
5. DELETE FROM poi_translations WHERE poi_id = {id}
6. Spawn Python TTS → tạo poi_{id}_vi_v0.mp3 (version reset về 0)
7. INSERT record mới vào poi_audio_files
```

**Khi User tiến gần POI (khoảng cách ≤ range + 100m) với ngôn ngữ chưa có audio:**

```
1. Kiểm tra poi_translations: SELECT * WHERE poi_id = {id} AND language_code = {lang}
2. Nếu chưa có translation:
   a. Spawn Python: python scripts/translate.py
      --text "{mô tả gốc VI}"
      --source vi
      --target {lang}
   b. Lưu vào poi_translations
3. Kiểm tra poi_audio_files: SELECT * WHERE poi_id = {id} AND language_code = {lang}
4. Nếu chưa có audio:
   a. Spawn Python TTS với text đã dịch
   b. Output: poi_{id}_{lang}_v0.mp3
   c. INSERT vào poi_audio_files
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

---

## 9. Business Rules

| ID    | Rule                                                                                                                                              |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-01 | POI không thể xóa nếu đang nằm trong ít nhất 1 Tour (Admin hoặc User). Áp dụng cho cả Admin và Doanh nghiệp.                                      |
| BR-02 | Mô tả POI là bắt buộc (không được để trống) vì dùng để tạo audio TTS.                                                                             |
| BR-03 | Khi thêm mới POI → ngay lập tức tạo audio tiếng Việt (`vi_v0`).                                                                                   |
| BR-04 | Khi sửa POI → xóa toàn bộ file audio (mọi ngôn ngữ, mọi version) + xóa toàn bộ bản dịch → tạo lại audio tiếng Việt (`vi_v0`). Version reset về 0. |
| BR-05 | Khi xóa POI → xóa toàn bộ file audio + bản dịch + ảnh liên quan.                                                                                  |
| BR-06 | Admin không thể sửa POI của Doanh nghiệp. Chỉ có thể xem và xóa (khi POI không trong tour).                                                       |
| BR-07 | Doanh nghiệp không thể xóa POI của doanh nghiệp khác, không nhìn thấy POI của doanh nghiệp khác.                                                  |
| BR-08 | Tour do Admin tạo → tất cả User thấy trong mục "Tour đề xuất". Tour do User tạo → chỉ user đó thấy trong "Tour của tôi".                          |
| BR-09 | Âm thanh chỉ phát khi user vào phạm vi 3m và ở lại ≥ 3 giây liên tục.                                                                             |
| BR-10 | Khi overlap 2 POI, ưu tiên phát audio của POI có id lớn hơn.                                                                                      |
| BR-11 | Audio các ngôn ngữ khác ngoài tiếng Việt chỉ tạo khi User tiến gần (lazy generation), không tạo sẵn khi thêm POI.                                 |
| BR-12 | Bản dịch mô tả chỉ dịch nếu chưa tồn tại trong `poi_translations`. Không dịch lại nếu đã có.                                                      |
| BR-13 | Password của Business và User được hash bằng bcrypt trước khi lưu DB. Admin password cũng phải được hash.                                         |
| BR-14 | Tọa độ POI (Business Portal): lat ∈ [-90, 90], lng ∈ [-180, 180], tối đa 6 chữ số thập phân.                                                      |
| BR-15 | Số lượng ảnh tối đa: 5 ảnh/POI, 5 ảnh/Tour. Khi sửa có thể xóa từng ảnh và thêm mới (tổng ≤ 5).                                                   |
| BR-16 | Tour của Admin có: tên + mô tả + ảnh + danh sách POI. Tour của User có: tên + danh sách POI (không có mô tả và ảnh).                              |
| BR-17 | Khi xóa Tour → không xóa POI, chỉ xóa record Tour và các liên kết `tour_pois`.                                                                    |
| BR-18 | POI range mặc định = 0 nếu không nhập. POI với range = 0 không kích hoạt audio proximity trigger.                                                 |
| BR-19 | Khi User đăng nhập → dịch mô tả tất cả POI/Tour trong 20km sang ngôn ngữ đã chọn (nếu chưa có bản dịch). Background job, async.                   |
| BR-20 | Doanh nghiệp đăng ký không cần Admin duyệt. Tự động được phép đăng nhập ngay sau khi đăng ký.                                                     |

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
  range_m     INTEGER NOT NULL DEFAULT 0,  -- Phạm vi (mét), ≥ 0
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
-- Mô tả gốc tiếng Việt lưu trong pois.description
-- Bản dịch ngôn ngữ khác lưu ở đây
-- ============================================================
CREATE TABLE IF NOT EXISTS poi_translations (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  poi_id                INTEGER NOT NULL,
  language_code         TEXT    NOT NULL,   -- 'en', 'zh', 'ja', 'ko', ...
  translated_description TEXT   NOT NULL,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(poi_id, language_code),
  FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_poi_trans_lang ON poi_translations(poi_id, language_code);

-- ============================================================
-- poi_audio_files: File audio đã sinh bởi TTS
-- Naming: poi_{poi_id}_{lang}_v{version}.mp3
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
-- created_by_type: 'admin' hoặc 'user'
-- created_by_id: id trong admins hoặc users
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

> **Quy ước:**
>
> - Admin routes: Header `Authorization: Bearer <admin_token>`
> - Business routes: Header `Authorization: Bearer <business_token>`
> - User routes: Header `Authorization: Bearer <user_token>`
> - File upload: `Content-Type: multipart/form-data`
> - Các request khác: `Content-Type: application/json`

---

### 11.1 Authentication

```
POST /api/auth/admin/login
  Body: { email: string, password: string }
  200: { token: string, admin: { id, name, email } }
  401: { error: "Email hoặc mật khẩu không đúng" }

POST /api/auth/business/register
  Body: { name: string, email: string, password: string, confirm_password: string }
  201: { message: "Đăng ký thành công" }
  400: { error: "Email đã được sử dụng" }
  400: { error: "Mật khẩu xác nhận không khớp" }
  400: { error: "Validation error", fields: { field: "message" } }

POST /api/auth/business/login
  Body: { email: string, password: string }
  200: { token: string, business: { id, name, email } }
  401: { error: "Email hoặc mật khẩu không đúng" }

POST /api/auth/user/register
  Body: { name: string, email: string, password: string, confirm_password: string }
  201: { message: "Đăng ký thành công. Vui lòng đăng nhập." }
  400: { error: "...", fields: { ... } }

POST /api/auth/user/login
  Body: { email: string, password: string, language_code: string }
  200: { token: string, user: { id, name, email, language_code } }
  401: { error: "Email hoặc mật khẩu không đúng" }
  -- Side effect: Trigger background translation job cho POI/Tour trong 20km
```

---

### 11.2 Admin — POI

```
GET /api/admin/pois
  Query: ?search=<text>
  200: [{ id, name, description, lat, lng, range_m, owner_type, owner_id,
          images: [{ id, file_path }],
          audio_files: [{ language_code, version, file_path }],
          translations: [{ language_code, translated_description }] }]

POST /api/admin/pois
  Content-Type: multipart/form-data
  Body: { name, description, lat, lng, range_m?, images[] (≤5 files) }
  201: { id, name, ... }
  400: { error: "...", fields: { ... } }
  -- Side effect: Tạo audio VI ngay lập tức (async subprocess)

PUT /api/admin/pois/:id
  Content-Type: multipart/form-data
  Body: { name?, description?, lat?, lng?, range_m?,
          new_images[] (optional),
          delete_image_ids[] (optional — array of poi_image.id) }
  200: { success: true }
  404: { error: "POI không tồn tại" }
  403: { error: "Không có quyền sửa POI này" }
  -- Side effect: Xóa audio cũ, tạo audio VI mới, xóa translations

DELETE /api/admin/pois/:id
  200: { success: true }
  404: { error: "POI không tồn tại" }
  409: { error: "Không thể xóa POI đang nằm trong Tour",
         tours: [{ id, name }] }
  -- Side effect: Xóa ảnh, audio, translations
```

---

### 11.3 Admin — Tour

```
GET /api/admin/tours
  200: [{ id, name, description, created_by_type, created_by_id,
          images: [...],
          pois: [{ position, poi_id, name, lat, lng }] }]

POST /api/admin/tours
  Content-Type: multipart/form-data
  Body: { name, description?, images[] (≤5), poi_ids: JSON string "[1,2,3]" }
  201: { id, name, ... }
  400: { error: "..." }

PUT /api/admin/tours/:id
  Content-Type: multipart/form-data
  Body: { name?, description?, new_images[], delete_image_ids[], poi_ids? }
  200: { success: true }
  404: { error: "Tour không tồn tại" }

DELETE /api/admin/tours/:id
  200: { success: true }
  404: { error: "Tour không tồn tại" }
  -- Không xóa POI, chỉ xóa tour + tour_images + tour_pois
```

---

### 11.4 Admin — Doanh nghiệp

```
GET /api/admin/businesses
  Query: ?search=<text>
  200: [{ id, name, email, created_at, poi_count }]

GET /api/admin/businesses/:id
  200: { id, name, email, created_at,
         pois: [{ id, name, lat, lng, images: [...], audio_files: [...], translations: [...] }] }

DELETE /api/admin/pois/business/:poi_id
  -- Admin xóa POI của doanh nghiệp
  200: { success: true }
  409: { error: "Không thể xóa POI đang trong Tour", tours: [...] }
```

---

### 11.5 Admin — Dashboard

```
GET /api/admin/dashboard/stats
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
```

---

### 11.6 Business — POI

```
GET /api/business/pois
  Auth: business_token
  Query: ?search=<text>
  200: [{ id, name, description, lat, lng, range_m,
          images: [...], audio_files: [...], translations: [...] }]
  -- Chỉ trả về POI của business đang đăng nhập

POST /api/business/pois
  Auth: business_token
  Content-Type: multipart/form-data
  Body: { name, description, lat, lng, range_m?, images[] }
  201: { id, ... }
  -- Side effect: Tạo audio VI

PUT /api/business/pois/:id
  Auth: business_token
  Content-Type: multipart/form-data
  Body: { name?, description?, lat?, lng?, range_m?, new_images[], delete_image_ids[] }
  200: { success: true }
  403: { error: "Không có quyền sửa POI này" }
  -- Side effect: Xóa audio cũ, tạo audio VI mới, xóa translations

DELETE /api/business/pois/:id
  Auth: business_token
  200: { success: true }
  403: { error: "Không có quyền xóa POI này" }
  409: { error: "Không thể xóa POI đang nằm trong Tour", tours: [...] }
```

---

### 11.7 User — POI & Tour

```
GET /api/user/pois/nearby
  Auth: user_token
  Query: ?lat=<number>&lng=<number>&radius=20000  (radius in meters)
  200: [{ id, name, description_localized, lat, lng, range_m,
          images: [...], distance_m: number }]
  -- description_localized: lấy từ poi_translations nếu có, fallback về pois.description

GET /api/user/tours/nearby
  Auth: user_token
  Query: ?lat=<number>&lng=<number>&radius=20000
  200: [{ id, name, description_localized, images: [...],
          pois: [{ position, poi_id, name_localized, lat, lng }] }]
  -- Chỉ trả về tour do Admin tạo (created_by_type = 'admin')

GET /api/user/tours/mine
  Auth: user_token
  200: [{ id, name, pois: [{ position, poi_id, name, lat, lng }] }]
  -- Chỉ trả về tour do user đang đăng nhập tạo

POST /api/user/tours
  Auth: user_token
  Body: { name: string, poi_ids: [ordered array of poi_id] }
  201: { id, name, ... }

PUT /api/user/tours/:id
  Auth: user_token
  Body: { name?, poi_ids? }
  200: { success: true }
  403: { error: "Không có quyền sửa tour này" }

DELETE /api/user/tours/:id
  Auth: user_token
  200: { success: true }
  403: { error: "Không có quyền xóa tour này" }
```

---

### 11.8 Audio

```
GET /api/audio/stream/:filename
  -- Stream file audio trực tiếp từ server (dùng khi thiết bị hết dung lượng)
  -- Filename format: poi_{id}_{lang}_v{version}.mp3
  Auth: user_token
  200: Audio stream (Content-Type: audio/mpeg)
  404: { error: "File không tồn tại" }

POST /api/audio/generate
  -- Trigger tạo audio cho POI theo ngôn ngữ cụ thể (gọi khi user tiến gần)
  Auth: user_token
  Body: { poi_id: number, language_code: string }
  200: { file_path: string, already_existed: boolean }
  -- Nếu đã tồn tại: trả về đường dẫn file cũ
  -- Nếu chưa có: dịch (nếu cần) → TTS → trả về đường dẫn file mới

POST /api/translate/batch
  -- Dịch hàng loạt POI/Tour khi user đăng nhập
  Auth: user_token
  Body: {
    language_code: string,
    poi_ids: number[],
    tour_ids: number[]
  }
  200: { translated_count: number }
  -- Với mỗi POI/Tour: chỉ dịch nếu chưa tồn tại bản dịch ngôn ngữ đó
```

---

## 12. Non-functional Requirements

### 12.1 Performance

| Yêu cầu                                 | Giá trị                                               |
| --------------------------------------- | ----------------------------------------------------- |
| API response (không tính TTS/translate) | < 500ms                                               |
| Tạo audio TTS (Python subprocess)       | < 10 giây (async, không chặn response)                |
| Dịch thuật batch khi đăng nhập          | Background job, không chặn UI, hiện loading indicator |
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

**Implementation:** Dùng thư viện `slugify` hoặc custom normalize function để chuẩn hóa cả query và tên POI về dạng không dấu khi so sánh. Hoặc lưu thêm cột `name_normalized` trong DB.

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

_PRD v1.0 — GPS Du lịch Đa ngôn ngữ. Tài liệu này là Single Source of Truth. Mọi thay đổi cần cập nhật version._
