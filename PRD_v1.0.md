# PRD v1.4 — POI & Tour Admin Dashboard

**Version:** 1.4
**Trạng thái:** Draft — Chờ xác nhận
**Ngày cập nhật:** 2026-03-15
**Tác giả:** Senior BA / PO / DB Architect

---

### 📋 Changelog v1.3 → v1.4

| #       | Hạng mục                                | Thay đổi                                                                                                                                                                                         |
| ------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **C17** | **Audit Timestamps — Tracking dữ liệu** | **Thêm 2 trường `created_at` và `updated_at` (TEXT, DEFAULT CURRENT_TIMESTAMP) vào CẢ HAI bảng `pois` và `tours` để theo dõi thời gian tạo và chỉnh sửa dữ liệu. Phục vụ audit trail & backup.** |

> Các thay đổi từ v1.0 → v1.3 vẫn còn hiệu lực. Xem changelog đầy đủ trong lịch sử tài liệu.

---

### 📋 Changelog v1.2 → v1.3

| #       | Hạng mục                                 | Thay đổi                                                                                                                                                                                       |
| ------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **C13** | **Tour — Bỏ kéo-thả**                    | **Loại bỏ hoàn toàn tính năng drag-to-reorder POIs trong panel Thêm/Sửa Tour. Không còn cần thư viện `@hello-pangea/dnd` hay `dnd-kit`.**                                                      |
| **C14** | **Tour — Cơ chế sắp xếp thứ tự POI mới** | **Thứ tự POI trong Tour được xác định đơn giản bằng thứ tự click: POI click trước → vị trí 1, click sau → vị trí 2, 3... Để đổi thứ tự: bỏ chọn POI rồi click lại → POI được đẩy xuống cuối.** |
| **C15** | **Tour — Badge thứ tự trên icon**        | **Badge số thứ tự (1, 2, 3...) hiển thị trực tiếp trên/cạnh icon của từng POI trong danh sách chọn, không phải trên badge riêng biệt.**                                                        |
| **C16** | **Tour — Search POI trong panel**        | **Panel Thêm/Sửa Tour có thanh `🔍` tìm kiếm POI theo tên ngay trong panel để Admin dễ tìm POI muốn thêm vào tour.**                                                                           |

> Các thay đổi từ v1.0 → v1.2 vẫn còn hiệu lực. Xem changelog đầy đủ trong lịch sử tài liệu.

**Repo tham chiếu:** `poi-_-tour-admin-dashboard` (AI Studio App `cc7e0a12`)

---

## Mục lục

1. [Overview & Goals](#1-overview--goals)
2. [In-scope / Out-of-scope](#2-in-scope--out-of-scope-mvp)
3. [Personas / Roles](#3-personas--roles)
4. [Màn hình & Luồng UI](#4-màn-hình--luồng-ui)
5. [User Stories](#5-user-stories)
6. [Functional Requirements](#6-functional-requirements)
7. [Acceptance Criteria](#7-acceptance-criteria-given-when-then)
8. [Non-functional Requirements](#8-non-functional-requirements)
9. [Data Requirements & DB Schema](#9-data-requirements--db-schema)
10. [API Specification](#10-api-specification)
11. [Dependencies & Risks](#11-dependencies--risks)
12. [Open Questions](#12-open-questions)
13. [Future Enhancements](#13-future-enhancements)

---

## 1. Overview & Goals

### Bối cảnh

Admin Dashboard là ứng dụng web nội bộ cho phép quản trị viên quản lý tập trung các **điểm tham quan (POI)** và **lộ trình tour** trên bản đồ tương tác. Địa bàn mặc định: **Khu phố ẩm thực Vĩnh Khánh, Quận 4, TP.HCM** (tọa độ trung tâm: `10.7570°N, 106.7000°E`, zoom 16). Giao diện sử dụng **Light mode** với bản đồ tile sáng.

Stack: React 19 + Vite 6 (frontend), Express 4 + SQLite via `better-sqlite3` (backend), Leaflet / react-leaflet (bản đồ), Tailwind CSS 3 (styling), `multer` (file upload middleware).

### Mục tiêu MVP

| #   | Mục tiêu                                                                                                                                                  | Đo lường thành công                                                    |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| G1  | Admin đăng nhập an toàn                                                                                                                                   | Đăng nhập thành công, session hợp lệ                                   |
| G2  | Admin CRUD POIs trên bản đồ: thêm qua click map **hoặc nhập tay tọa độ**, có ảnh vật lý, **tìm kiếm theo tên**, **bán kính**                              | POI lưu đúng, ảnh persist, search hoạt động                            |
| G3  | Admin phân loại POI major/minor, tương tác map ↔ sidebar đồng bộ (**flyTo + popup**)                                                                      | Click sidebar → map bay đến POI; click marker → popup                  |
| G4  | Admin CRUD đầy đủ Tour: tạo/sửa (**chọn và sắp thứ tự POI bằng click**)/xóa, **tìm kiếm theo tên**, ảnh vật lý, **bản đồ cô lập hoàn toàn** khi chọn tour | Tour hoạt động đúng; chọn tour ẩn toàn bộ POI/polyline không liên quan |

---

## 2. In-scope / Out-of-scope (MVP)

### ✅ In-scope

- **Module 1** — Admin Login (email + password)
- **Module 2** — POIs Management:
  - CRUD trên bản đồ
  - Thêm POI bằng **2 cách: click map HOẶC nhập tay lat/lng**
  - Phân loại major/minor (5 loại)
  - Upload & lưu **file ảnh vật lý** (1 ảnh/POI); xóa POI → **xóa file vật lý**
  - Trường **`radius`** (bán kính, integer, mét)
  - **Thanh tìm kiếm POI theo tên**
  - **Click marker map → popup chi tiết**
  - **Click POI sidebar → map flyTo + zoom + popup**
- **Module 3** — Tours Management:
  - CRUD đầy đủ (Thêm + Sửa + Xóa)
  - **Sắp xếp thứ tự POI trong Tour bằng thứ tự click** _(cập nhật v1.3 — thay thế kéo-thả)_
  - **Thanh tìm kiếm POI ngay trong panel Thêm/Sửa Tour** _(mới v1.3)_
  - Upload & lưu **file ảnh vật lý** (1 ảnh/Tour); xóa Tour → **xóa file vật lý**
  - **Thanh tìm kiếm Tour theo tên**
  - Bản đồ cô lập khi chọn tour: **ẩn toàn bộ POI markers và polyline không thuộc tour**
- REST API với `multipart/form-data` (multer), **`fs.unlink` xóa file vật lý**
- Giao diện Light mode, tile sáng (OpenStreetMap / CARTO Positron)
- **DB Schema chuẩn hóa**: bảng `tour_pois`

### ❌ Out-of-scope (MVP)

- Quản lý user / phân quyền nhiều role
- Upload nhiều ảnh (gallery) cho POI hoặc Tour
- Export/import dữ liệu (CSV, JSON)
- ~~Tìm kiếm POI / Tour theo tên~~ _(đã rút vào In-scope)_
- Thống kê / analytics dashboard
- Giao diện responsive cho màn nhỏ / mobile
- Tích hợp Gemini AI
- Public-facing tour viewer
- Multi-language / Dark mode toggle
- Object storage (S3/GCS/Cloudinary) — dùng filesystem local trong MVP
- **~~Kéo-thả (drag-to-reorder) thứ tự POI trong Tour~~** _(đã loại bỏ v1.3 — thay bằng cơ chế click)_

---

## 3. Personas / Roles

**Duy nhất một role trong MVP: Admin**

| Thuộc tính       | Mô tả                                                                               |
| ---------------- | ----------------------------------------------------------------------------------- |
| Vai trò          | Admin                                                                               |
| Số lượng         | 1–5 người nội bộ                                                                    |
| Kỹ năng kỹ thuật | Trung bình — dùng web app, không cần kỹ năng lập trình                              |
| Nhu cầu chính    | Quản lý POIs/Tours nhanh, có ảnh, tìm được điểm/tour dễ, tương tác bản đồ trực quan |
| Thiết bị         | Desktop browser (Chrome / Edge / Firefox)                                           |
| Ngữ cảnh         | Văn phòng, trước buổi dẫn tour hoặc cập nhật dữ liệu định kỳ                        |

---

## 4. Màn hình & Luồng UI

### 4.1 Màn hình Login

- Layout: centered card, nền trắng/xám nhạt (light mode)
- Components: icon MapPin (emerald), tiêu đề "Admin Dashboard", form email + password, nút "Đăng nhập"

| State   | Mô tả                                    |
| ------- | ---------------------------------------- |
| Default | Form, email prefill `admin@example.com`  |
| Loading | Spinner trên nút Submit khi gọi API      |
| Error   | Thông báo lỗi inline khi sai credentials |

---

### 4.2 Layout chính (post-login) — Light mode

- **Nền:** trắng (`white`) / xám nhạt (`gray-50`)
- **Sidebar trái (w-80):** nền trắng, viền xám nhạt; logo "TourAdmin"; nav 2 tab (POIs / Tours); danh sách dynamic; nút Đăng xuất
- **Main area:** bản đồ Leaflet full-height (tile sáng); overlay panel slide-in từ phải; legend bottom-left

---

### 4.3 Tab POIs — Chi tiết

#### Sidebar POIs

- **Header:** "Danh sách POIs" + badge count tổng số
- **`🔍` Thanh tìm kiếm:** input text ở đầu danh sách, lọc realtime theo `name` (case-insensitive). Khi có text → chỉ hiển thị POIs khớp; khi xóa → reset toàn bộ danh sách.
- **Mỗi item:** icon emoji (theo type) + tên + type label + thumbnail ảnh nhỏ (nếu có) + nút xóa (hiện khi hover)
- **Click item trong sidebar:**
  1. Item được highlight trong danh sách
  2. Bản đồ thực hiện `flyTo([lat, lng], zoom: 18)` — bay mượt đến vị trí POI
  3. Popup chi tiết của marker tương ứng tự động mở (tên, type, description, radius, ảnh nếu có)

#### Bản đồ — Tab POIs

- Hiển thị tất cả POI markers (tile sáng)
- **Click marker:** mở popup chi tiết — tên, type, description, **radius (m)**, ảnh (nếu có); popup có nút "Sửa" để mở panel Edit POI
- **Click vùng trống** (khi không có panel nào mở): đặt marker tạm + mở panel "Thêm POI mới" với lat/lng tự động điền từ tọa độ click

#### Panel Create / Edit POI (slide-in từ phải)

- **Header:** "Thêm POI mới" hoặc "Sửa POI"
- **Fields:**

| Field             | Type             | Required | Ghi chú                                         |
| ----------------- | ---------------- | -------- | ----------------------------------------------- |
| Tên điểm          | text             | ✅       | max 255 ký tự                                   |
| Loại điểm         | select           | ✅       | Enum: Chính / WC / Bán vé / Gửi xe / Bến thuyền |
| Mô tả             | textarea         | ❌       | Plain text                                      |
| Vĩ độ (Lat)       | number           | ✅       | **Editable** — nhập tay hoặc từ click map       |
| Kinh độ (Lng)     | number           | ✅       | **Editable** — nhập tay hoặc từ click map       |
| Bán kính (Radius) | number (integer) | ❌       | Đơn vị: mét. Mặc định 0.                        |
| Ảnh               | file input       | ❌       | `image/*`, max 5MB, lưu file vật lý             |

- **Luồng nhập tọa độ:**
  - **Cách 1 — Click map:** khi panel đang mở, Admin click lên bản đồ → marker tạm di chuyển → Lat/Lng tự động cập nhật vào form
  - **Cách 2 — Nhập tay:** Admin gõ giá trị vào ô Lat/Lng → sau khi blur, marker tạm nhảy đến vị trí tương ứng
- **Upload ảnh:** input `file`, preview thumbnail sau khi chọn, nút ❌ xóa ảnh. Khi lưu: file upload lên `/uploads/pois/`, DB lưu tên file. **Khi xóa ảnh hoặc xóa POI: backend `fs.unlink` file vật lý.**
- **Nút "Lưu địa điểm"** + **X** đóng panel

| State          | Mô tả                                                    |
| -------------- | -------------------------------------------------------- |
| Loading save   | Spinner, nút disabled                                    |
| Upload loading | Progress indicator (%) khi upload file                   |
| Success        | Đóng panel, refresh danh sách, marker thật hiện trên map |
| Error save     | Toast/inline error, giữ nguyên form                      |
| Error upload   | Inline error trong khu vực upload, form không đóng       |

---

### 4.4 Tab Tours — Chi tiết

#### Sidebar Tours

- **Header:** "Danh sách Tours" + nút **`+`** tạo tour
- **`🔍` Thanh tìm kiếm:** input text lọc realtime theo `title` (case-insensitive)
- **Mỗi tour item:**
  - Thumbnail ảnh đại diện (nếu có)
  - Tên tour
  - Chuỗi POI theo thứ tự: badge tên ngắn + ChevronRight
  - Icon **Edit** (bút) — click mở panel Sửa Tour
  - Icon **Delete** (thùng rác) — hiện khi hover
- **Click tour item:**
  1. Tour được đánh dấu "selected" (highlight row)
  2. Bản đồ **cô lập hoàn toàn**: **ẩn tất cả markers POI không thuộc tour này** + **ẩn tất cả polylines của tour khác**
  3. **Chỉ hiển thị:** markers của các POIs thuộc tour (với số thứ tự 1, 2, 3...) + polyline kết nối (màu emerald, opacity 1.0)
  4. Bản đồ `fitBounds` bao quanh toàn bộ POIs của tour đó
- **Click lại tour đang selected** → deselect → trở về trạng thái mặc định (hiện tất cả)

#### Bản đồ — Tab Tours

| Trạng thái                 | Hiển thị                                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Không có tour nào selected | Tất cả POI markers + tất cả polylines (emerald, nét đứt, opacity 0.4)                                                                                  |
| Có tour selected           | **Chỉ markers POIs thuộc tour** (đánh số thứ tự 1/2/3) + **polyline của tour đó** (opacity 1.0, màu đậm). **Ẩn toàn bộ markers và polylines còn lại.** |

#### Panel Create Tour (slide-in phải)

- **Header:** "Tạo Tour mới"
- **Upload ảnh đại diện** (file, optional): preview thumbnail, lưu file vật lý
- **Field `title`** (required, max 255)
- **Field `description`** (optional, textarea, max 1000 ký tự): Admin ghi chú thông tin ngắn gọn về lộ trình tour
- **`🔍` Thanh tìm kiếm POI trong panel** _(mới v1.3)_: input text lọc realtime danh sách POI bên dưới theo tên, giúp Admin tìm nhanh POI muốn thêm
- **Danh sách POIs để chọn — cơ chế click theo thứ tự** _(cập nhật v1.3)_:
  - Hiển thị tất cả POIs (có thể lọc qua search)
  - **Mỗi POI item hiển thị: icon type + tên + badge số thứ tự nếu đã chọn**
  - **Click POI chưa chọn → POI được thêm vào cuối chuỗi, badge hiện số thứ tự tiếp theo**
  - **Click POI đã chọn → POI bị remove khỏi chuỗi, badge biến mất, các badge phía sau tự giảm số**
  - **Để đổi thứ tự:** Admin bỏ chọn POI cần di chuyển rồi click lại → POI được đưa xuống cuối
  - Phần "Lộ trình đã chọn" phía trên danh sách: hiển thị chuỗi badge `[1: Tên A] → [2: Tên B] → [3: Tên C]` để Admin dễ kiểm tra thứ tự tổng thể
- **Nút "Lưu lộ trình"** (disabled khi thiếu title hoặc chưa chọn ≥ 1 POI)

#### Panel Edit Tour (slide-in phải)

- **Header:** "Sửa Tour"
- Điền sẵn: ảnh hiện tại, tên, mô tả, danh sách POIs đã chọn (hiển thị theo đúng thứ tự lưu trong DB)
- Admin có thể:
  - Đổi ảnh (upload file mới) hoặc xóa ảnh (backend `fs.unlink`)
  - Sửa tên
  - Sửa mô tả (textarea, max 1000 ký tự)
  - **`🔍` Tìm kiếm POI trong panel** _(mới v1.3)_: lọc danh sách POI để dễ thêm/bớt
  - **Thêm/bớt POIs bằng click** _(cập nhật v1.3)_: cơ chế giống Create — click để chọn/bỏ chọn, badge số thứ tự, bỏ chọn rồi click lại để đổi vị trí xuống cuối
- **Nút "Lưu thay đổi"** → `PUT /api/tours/:id` → đóng panel → refresh danh sách

| State   | Mô tả                                                    |
| ------- | -------------------------------------------------------- |
| Loading | Spinner, nút disabled                                    |
| Success | Đóng panel, refresh, tour vừa sửa được highlight briefly |
| Error   | Inline error, giữ nguyên form                            |

---

## 5. User Stories

| ID                     | Module   | Tôi muốn...                                                                               | Để...                                                    | Priority |
| ---------------------- | -------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------- | -------- |
| US-01                  | Login    | Đăng nhập bằng email và password                                                          | Truy cập dashboard an toàn                               | Must     |
| US-02                  | Login    | Đăng xuất khỏi hệ thống                                                                   | Bảo mật phiên làm việc                                   | Must     |
| US-03                  | POI      | Xem tất cả POIs trên bản đồ sáng và sidebar                                               | Nắm bắt tổng quan                                        | Must     |
| US-04a                 | POI      | Click bản đồ để chọn vị trí tạo POI mới                                                   | Đặt POI chính xác bằng thao tác trực quan                | Must     |
| US-04b                 | POI      | Nhập thủ công tọa độ Lat/Lng trong form để tạo POI                                        | Tạo POI khi đã biết trước tọa độ                         | Must     |
| US-05                  | POI      | Xem và chỉnh sửa thông tin POI (tên, loại, mô tả, ảnh, radius)                            | Cập nhật dữ liệu khi cần                                 | Must     |
| US-06                  | POI      | Xóa một POI (kèm xóa file ảnh vật lý)                                                     | Dọn dẹp dữ liệu và storage                               | Must     |
| US-07                  | POI      | Phân loại POI (Chính / WC / Bán vé / Gửi xe / Bến thuyền)                                 | Phân biệt chức năng từng điểm                            | Must     |
| US-08                  | POI      | Tải lên 1 file ảnh vật lý cho POI                                                         | Minh họa trực quan                                       | Must     |
| US-09                  | POI      | Tìm kiếm POI theo tên trong sidebar                                                       | Nhanh chóng tìm đúng điểm cần quản lý                    | Must     |
| US-10                  | POI      | Click vào marker POI trên bản đồ để xem popup chi tiết                                    | Xem thông tin POI trực tiếp trên map                     | Must     |
| US-11                  | POI      | Click vào POI trong sidebar → bản đồ flyTo + zoom + mở popup                              | Định vị nhanh POI trên bản đồ từ danh sách               | Must     |
| US-12                  | POI      | Đặt bán kính (radius) cho POI                                                             | Xác định phạm vi/diện tích ảnh hưởng của điểm            | Must     |
| US-13                  | Tour     | Xem danh sách tất cả tours                                                                | Quản lý tổng quan                                        | Must     |
| US-14                  | Tour     | Tạo tour mới bằng cách **click chọn POIs theo thứ tự mong muốn**                          | Xây dựng lộ trình theo đúng thứ tự tham quan             | Must     |
| US-15                  | Tour     | **Sửa tour: đổi tên, ảnh, thêm/bớt POI, điều chỉnh thứ tự POI bằng bỏ chọn rồi chọn lại** | Cập nhật lộ trình linh hoạt không cần kéo-thả            | Must     |
| US-16                  | Tour     | Xóa một tour (kèm xóa file ảnh vật lý)                                                    | Xóa lộ trình không dùng + dọn storage                    | Must     |
| US-17                  | Tour     | Tải lên 1 file ảnh đại diện cho tour                                                      | Nhận diện trực quan lộ trình                             | Must     |
| US-18                  | Tour     | Click vào tour → bản đồ cô lập: chỉ POIs + polyline của tour đó                           | Kiểm tra lộ trình mà không bị rối bởi tour khác          | Must     |
| US-19                  | Tour     | Tìm kiếm Tour theo tên trong sidebar                                                      | Nhanh chóng tìm đúng tour cần quản lý                    | Must     |
| **US-20** _(mới v1.3)_ | Tour     | **Tìm kiếm POI theo tên ngay trong panel Thêm/Sửa Tour**                                  | **Dễ tìm POI muốn thêm khi có nhiều POI trong hệ thống** | Must     |
| US-21                  | POI/Tour | Nhận xác nhận trước khi xóa POI hoặc Tour                                                 | Tránh xóa nhầm                                           | Must     |

---

## 6. Functional Requirements

### FR-01: Authentication

| ID      | Requirement                                                     |
| ------- | --------------------------------------------------------------- |
| FR-01.1 | Hệ thống hiển thị màn hình login (light mode) khi chưa xác thực |
| FR-01.2 | Form login: Email (required) + Password (required)              |
| FR-01.3 | Submit → gọi API xác thực; thành công → vào dashboard           |
| FR-01.4 | Thất bại → thông báo lỗi inline, không redirect                 |
| FR-01.5 | Session duy trì bằng cookie/token có TTL                        |
| FR-01.6 | Nút Đăng xuất → xóa session → redirect login                    |

---

### FR-02: POIs Management

| ID       | Requirement                                                                                                                                          |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-02.1  | Sau login, tải và hiển thị toàn bộ POIs từ `GET /api/pois`                                                                                           |
| FR-02.2  | Mỗi POI hiển thị bằng Leaflet Marker trên bản đồ tile sáng                                                                                           |
| FR-02.3  | Click marker → Popup chi tiết: tên, type, description, radius (m), ảnh (nếu có), nút "Sửa"                                                           |
| FR-02.4  | Sidebar: icon emoji + tên + type label + thumbnail ảnh nhỏ (nếu có)                                                                                  |
| FR-02.5  | `🔍` Thanh search ở đầu sidebar POI: lọc realtime theo name, case-insensitive; xóa text → reset                                                      |
| FR-02.6  | Badge count cập nhật theo kết quả tìm kiếm hiện tại                                                                                                  |
| FR-02.7  | Click POI trong sidebar → `map.flyTo([lat,lng], 18)` → popup của marker đó tự mở                                                                     |
| FR-02.8  | Click vùng trống trên map (tab POI active, không có panel mở) → đặt marker tạm + mở panel "Thêm POI mới" với lat/lng từ click                        |
| FR-02.9  | Panel POI form: `name` (required), `type` (select), `description` (optional), `lat` (editable), `lng` (editable), `radius` (integer ≥ 0, mặc định 0) |
| FR-02.10 | Cách 1 — Click map khi panel đang mở: marker tạm di chuyển đến vị trí click → lat/lng trong form tự cập nhật                                         |
| FR-02.11 | Cách 2 — Nhập tay lat/lng: Admin gõ giá trị vào ô → sau khi blur, marker tạm nhảy đến vị trí tương ứng                                               |
| FR-02.12 | Panel có input upload ảnh: `file`, `image/*`, max 5MB, preview thumbnail, nút ❌ xóa ảnh                                                             |
| FR-02.13 | Submit Create → multer lưu file vào `/uploads/pois/{uuid}.{ext}` → `POST /api/pois` với `image = filename` → đóng panel → refresh                    |
| FR-02.14 | Submit Edit → nếu có ảnh mới: **`fs.unlink` file cũ** → multer lưu file mới → `PUT /api/pois/:id` → đóng panel → refresh                             |
| FR-02.15 | Nút ❌ xóa ảnh trong panel Edit: client đánh dấu `remove_image=true` → khi lưu, backend `fs.unlink` file vật lý + set `image = NULL`                 |
| FR-02.16 | Nút xóa POI (hover) → confirm dialog → **backend `fs.unlink` file ảnh (nếu có) → `DELETE /api/pois/:id`** → refresh                                  |
| FR-02.17 | Xóa POI đang được dùng trong ≥ 1 tour → **server trả 409**, không xóa                                                                                |
| FR-02.18 | Đóng panel (X) → hủy thao tác, xóa marker tạm nếu đang tạo mới                                                                                       |
| FR-02.19 | Legend bản đồ hiển thị mapping icon ↔ type cho 5 loại POI                                                                                            |
| FR-02.20 | Bản đồ mặc định center `[10.7570, 106.7000]`, zoom 16                                                                                                |

---

### FR-03: Tours Management

| ID                             | Requirement                                                                                                                                                                                          |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-03.1                        | Sau login, tải toàn bộ Tours từ `GET /api/tours`                                                                                                                                                     |
| FR-03.2                        | Sidebar: thumbnail ảnh (nếu có) + tên + chuỗi POI theo thứ tự (badge + ChevronRight) + icon Edit + icon Delete (hover)                                                                               |
| FR-03.3                        | `🔍` Thanh search ở đầu sidebar Tour: lọc realtime theo title, case-insensitive                                                                                                                      |
| FR-03.4                        | Nút `+` → mở panel "Tạo Tour mới"                                                                                                                                                                    |
| FR-03.5                        | Panel tạo/sửa tour có `upload ảnh đại diện` (optional) + `title` (required, max 255) + `description` (optional, textarea, max 1000 ký tự) + **`🔍` thanh tìm kiếm POI trong panel** + danh sách POIs |
| **FR-03.6** _(cập nhật v1.3)_  | **Cơ chế chọn POI theo thứ tự click: click POI chưa chọn → thêm vào cuối chuỗi (position = max + 1); click POI đã chọn → remove, các position phía sau giảm 1**                                      |
| **FR-03.7** _(cập nhật v1.3)_  | **Badge số thứ tự (1, 2, 3...) hiển thị trực tiếp trên/cạnh icon của POI trong danh sách chọn; badge ẩn khi POI chưa được chọn**                                                                     |
| **FR-03.8** _(cập nhật v1.3)_  | **Phần "Lộ trình đã chọn" hiển thị chuỗi `[1: Tên A] → [2: Tên B] → ...` phía trên danh sách để Admin kiểm tra thứ tự tổng thể**                                                                     |
| **FR-03.9** _(cập nhật v1.3)_  | **Để thay đổi vị trí một POI trong chuỗi: Admin click bỏ chọn POI đó → POI bị remove → click chọn lại → POI được đưa xuống cuối chuỗi; các badge tự cập nhật**                                       |
| **FR-03.10** _(cập nhật v1.3)_ | **`🔍` Thanh search POI trong panel: lọc realtime danh sách POI theo tên, case-insensitive; POI đã chọn vẫn hiển thị badge dù có đang lọc hay không**                                                |
| FR-03.11                       | Nút "Lưu lộ trình" / "Lưu thay đổi" disabled khi `title` rỗng hoặc chưa chọn ≥ 1 POI                                                                                                                 |
| FR-03.12                       | Submit Create → multer lưu ảnh vào `/uploads/tours/{uuid}.{ext}` → `POST /api/tours` với `image = filename` → đóng panel → refresh                                                                   |
| FR-03.13                       | Icon Edit trên tour item → mở panel "Sửa Tour" với dữ liệu hiện tại điền sẵn (ảnh, tên, description, POIs theo đúng thứ tự position)                                                                 |
| FR-03.14                       | Panel Edit Tour: đổi ảnh (`fs.unlink` ảnh cũ), sửa tên, sửa description (textarea, max 1000 ký tự), thêm/bớt POI bằng click (cơ chế giống FR-03.6–FR-03.10)                                          |
| FR-03.15                       | Submit Edit → nếu có ảnh mới: **`fs.unlink` ảnh cũ** → multer lưu ảnh mới → `PUT /api/tours/:id` → đóng panel → refresh                                                                              |
| FR-03.16                       | Nút ❌ xóa ảnh trong panel Edit Tour: backend `fs.unlink` file vật lý + set `image = NULL`                                                                                                           |
| FR-03.17                       | Nút xóa tour (hover) → confirm → **backend `fs.unlink` ảnh vật lý (nếu có)** → `DELETE /api/tours/:id` → refresh                                                                                     |
| FR-03.18                       | **Mặc định (không tour nào selected):** hiển thị tất cả POI markers + tất cả polylines (opacity 0.4)                                                                                                 |
| FR-03.19                       | **Click tour item → selected: ẩn TẤT CẢ markers POI không thuộc tour + ẩn TẤT CẢ polylines tour khác; chỉ hiện markers (đánh số) + polyline của tour này (opacity 1.0); fitBounds**                  |
| FR-03.20                       | Click lại tour đang selected → deselect → trở về trạng thái mặc định                                                                                                                                 |
| FR-03.21                       | POI không tìm thấy trong DB → hiển thị "Unknown" (graceful degradation)                                                                                                                              |

---

## 7. Acceptance Criteria (Given-When-Then)

| US                          | Scenario                                      | Given                                                                                            | When                                                            | Then                                                                                                                          |
| --------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| US-01                       | Đăng nhập thành công                          | Admin ở màn Login, nhập đúng credentials                                                         | Nhấn "Đăng nhập"                                                | Dashboard light mode hiển thị, bản đồ center Vĩnh Khánh Q4 zoom 16, tab POIs active                                           |
| US-01                       | Đăng nhập thất bại                            | Admin nhập sai password                                                                          | Nhấn "Đăng nhập"                                                | Lỗi inline "Sai email hoặc mật khẩu", form giữ nguyên                                                                         |
| US-04a                      | Tạo POI — click map                           | Tab POIs active, không có panel mở                                                               | Admin click vị trí trên map                                     | Marker tạm xuất hiện; panel "Thêm POI mới" slide-in; Lat/Lng điền từ tọa độ click                                             |
| US-04b                      | Tạo POI — nhập tay tọa độ                     | Panel "Thêm POI mới" đang mở                                                                     | Admin xóa Lat/Lng hiện tại và gõ `10.755, 106.702`              | Marker tạm nhảy đến tọa độ vừa nhập; nếu giá trị ngoài range thì hiển thị lỗi inline                                          |
| US-04b                      | Cập nhật marker khi gõ tọa độ                 | Panel đang mở, Admin đã nhập Lat mới                                                             | Admin blur khỏi ô Lat                                           | Marker tạm di chuyển đến vĩ độ mới, Lng giữ nguyên                                                                            |
| US-09                       | Search POI theo tên                           | Tab POIs, sidebar hiển thị 10 POIs                                                               | Admin gõ "Bến" vào thanh search                                 | Sidebar chỉ hiển thị POIs tên chứa "Bến"; badge count cập nhật; map vẫn hiện tất cả markers                                   |
| US-09                       | Xóa search POI                                | Đang có text trong search bar                                                                    | Admin xóa hết text                                              | Danh sách reset, hiện toàn bộ POIs, badge count về số ban đầu                                                                 |
| US-10                       | Click marker → popup chi tiết                 | Tab POIs active, map có POI markers                                                              | Admin click marker "Cổng chính"                                 | Popup mở: tên, type, description, radius (m), ảnh (nếu có), nút "Sửa"                                                         |
| US-10                       | Nút "Sửa" trong popup                         | Popup POI đang mở                                                                                | Admin nhấn nút "Sửa"                                            | Popup đóng; panel "Sửa POI" slide-in với dữ liệu POI điền sẵn                                                                 |
| US-11                       | Click sidebar → flyTo + popup                 | Tab POIs active, map đang zoom xa                                                                | Admin click item "Bến thuyền A" trong sidebar                   | Map flyTo([lat,lng], 18) animation mượt; popup của marker tự mở; item highlight trong sidebar                                 |
| US-12                       | Thêm radius cho POI                           | Panel "Thêm POI mới" đang mở                                                                     | Admin nhập 50 vào trường "Bán kính (m)"                         | Khi lưu, DB `radius = 50`; popup hiển thị "Bán kính: 50m"                                                                     |
| US-12                       | Radius không hợp lệ                           | Panel POI mở                                                                                     | Admin nhập -10 hoặc ký tự chữ                                   | Validation inline "Bán kính phải là số nguyên ≥ 0"; nút Lưu disabled                                                          |
| US-06                       | Xóa POI — xóa file vật lý                     | POI "Cổng A" có ảnh `/uploads/pois/abc.jpg`                                                      | Admin click Trash → xác nhận                                    | Server `fs.unlink('/uploads/pois/abc.jpg')`; record xóa khỏi DB; marker biến mất                                              |
| US-06                       | Xóa POI đang trong Tour                       | POI "Bến X" đang thuộc "Tour 1"                                                                  | Admin click Trash → xác nhận                                    | Server trả 409 "POI đang được dùng trong Tour: Tour 1"; file ảnh không bị xóa; POI giữ nguyên                                 |
| US-08                       | Upload ảnh POI hợp lệ                         | Panel POI mở                                                                                     | Admin chọn file JPG 2MB                                         | Thumbnail preview hiển thị; khi lưu, file lưu vào `/uploads/pois/`, DB lưu tên file                                           |
| US-08                       | Upload ảnh vượt 5MB                           | Panel POI mở                                                                                     | Admin chọn file 8MB                                             | Lỗi "Ảnh không được vượt quá 5MB", file từ chối                                                                               |
| US-08                       | Xóa ảnh POI — xóa file vật lý                 | Panel "Sửa POI" mở, POI có ảnh                                                                   | Admin nhấn ❌ xóa ảnh → nhấn "Lưu"                              | Server `fs.unlink` file; DB set `image = NULL`; popup và sidebar không còn hiện ảnh                                           |
| **US-14** _(cập nhật v1.3)_ | **Chọn POI theo thứ tự click — tạo tour mới** | **Panel "Tạo Tour mới" mở, hệ thống có POIs: A, B, C, D**                                        | **Admin click POI "C" → rồi click POI "A" → rồi click POI "D"** | **Chuỗi "Lộ trình đã chọn" hiển thị `[1: C] → [2: A] → [3: D]`; badge "1" trên icon C, "2" trên A, "3" trên D**               |
| **US-14** _(cập nhật v1.3)_ | **Bỏ chọn POI — badge tự cập nhật**           | **Panel tạo tour, chuỗi đang là `[1: C] → [2: A] → [3: D]`**                                     | **Admin click POI "A" để bỏ chọn**                              | **Chuỗi cập nhật thành `[1: C] → [2: D]`; badge "A" biến mất; badge "D" đổi từ 3 → 2**                                        |
| **US-15** _(cập nhật v1.3)_ | **Đổi vị trí POI bằng bỏ chọn + chọn lại**    | **Panel "Sửa Tour" mở, chuỗi đang là `[1: A] → [2: B] → [3: C]`. Admin muốn đưa "A" xuống cuối** | **Admin click "A" để bỏ chọn → click "A" để chọn lại**          | **Chuỗi cập nhật thành `[1: B] → [2: C] → [3: A]`; polyline preview trên map cập nhật theo thứ tự mới**                       |
| **US-15** _(cập nhật v1.3)_ | **Lưu Tour sau khi chỉnh thứ tự**             | **Chuỗi là `[1: B] → [2: C] → [3: A]`**                                                          | **Admin nhấn "Lưu thay đổi"**                                   | **`PUT /api/tours/:id` với `poi_ids=[B,C,A]`; panel đóng; sidebar hiển thị chuỗi B→C→A**                                      |
| US-15                       | Mở panel Sửa Tour                             | Danh sách có ≥ 1 tour                                                                            | Admin click icon Edit                                           | Panel "Sửa Tour" slide-in, điền sẵn ảnh, tên, POIs theo đúng thứ tự đã lưu                                                    |
| **US-20** _(mới v1.3)_      | **Search POI trong panel Tour**               | **Panel "Tạo Tour mới" mở, hệ thống có 15 POIs**                                                 | **Admin gõ "Bến" vào thanh search trong panel**                 | **Danh sách POI trong panel thu hẹn, chỉ hiện POIs tên chứa "Bến"; POIs đã chọn vẫn hiện badge thứ tự dù đang lọc hay không** |
| **US-20** _(mới v1.3)_      | **Xóa search trong panel**                    | **Đang lọc "Bến" trong panel tour**                                                              | **Admin xóa text search**                                       | **Danh sách POI reset, hiện toàn bộ; POIs đã chọn vẫn có badge**                                                              |
| US-16                       | Xóa Tour — xóa file ảnh vật lý                | Tour "Tour Ẩm Thực" có ảnh `/uploads/tours/def.jpg`                                              | Admin click Trash → xác nhận                                    | Server `fs.unlink('/uploads/tours/def.jpg')`; record xóa; polyline biến mất                                                   |
| US-19                       | Search Tour theo tên                          | Sidebar Tours có 5 tours                                                                         | Admin gõ "Ẩm thực" vào thanh search                             | Sidebar chỉ hiển thị tours tên chứa "Ẩm thực"                                                                                 |
| US-18                       | Cô lập hoàn toàn khi chọn tour                | 3 tours trên map, mỗi tour có 3 POIs                                                             | Admin click "Tour Vĩnh Khánh"                                   | Chỉ hiện 3 markers của Tour Vĩnh Khánh (đánh số 1/2/3) + polyline. TẤT CẢ markers và polylines khác BỊ ẨN. Map fitBounds      |
| US-18                       | Bỏ chọn tour                                  | Tour đang selected                                                                               | Admin click lại tour đó                                         | Deselect; tất cả markers và polylines hiện lại                                                                                |
| US-21                       | Xóa POI — confirm                             | Admin hover POI item                                                                             | Click Trash                                                     | Dialog confirm; Cancel → không xóa; OK → xóa                                                                                  |

---

## 8. Non-functional Requirements

### 8.1 Authentication & Security

| ID         | Requirement                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------- |
| NFR-SEC-01 | API endpoints `/api/pois`, `/api/tours`, `/api/upload`, `/uploads/*` phải yêu cầu xác thực                    |
| NFR-SEC-02 | Password lưu hash (bcrypt); không lưu plaintext                                                               |
| NFR-SEC-03 | Session/token TTL: min 8h, max 24h                                                                            |
| NFR-SEC-04 | HTTPS bắt buộc trên production                                                                                |
| NFR-SEC-05 | File upload validate MIME type server-side (multer `fileFilter`): chỉ `image/jpeg`, `image/png`, `image/webp` |
| NFR-SEC-06 | Static file serving `/uploads/*` chỉ khả dụng khi đã xác thực (không public)                                  |

### 8.2 Validation

| ID         | Requirement                                                                                           |
| ---------- | ----------------------------------------------------------------------------------------------------- |
| NFR-VAL-01 | `name` POI: required, không rỗng/whitespace, max 255 ký tự                                            |
| NFR-VAL-02 | `type` POI: một trong 5 enum hợp lệ                                                                   |
| NFR-VAL-03 | `lat` ∈ [-90, 90]; `lng` ∈ [-180, 180] — validate cả client lẫn server                                |
| NFR-VAL-04 | `radius`: số nguyên (INTEGER) ≥ 0; default 0 nếu không nhập; từ chối nếu âm hoặc không phải số nguyên |
| NFR-VAL-05 | `title` Tour: required, max 255 ký tự                                                                 |
| NFR-VAL-06 | `poi_ids` Tour: ≥ 1 phần tử; mỗi ID phải tồn tại trong bảng `pois`                                    |
| NFR-VAL-07 | File ảnh: max 5MB; chỉ JPEG/PNG/WebP — validate client + server                                       |
| NFR-VAL-08 | Validation xảy ra cả client (UX) và server (integrity)                                                |

### 8.3 Error Handling & File Cleanup

| ID         | Requirement                                                                                                                |
| ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| NFR-ERR-01 | Mọi API 4xx/5xx hiển thị thông báo rõ ràng (toast/inline)                                                                  |
| NFR-ERR-02 | Fetch POIs/Tours thất bại → empty state + thông báo                                                                        |
| NFR-ERR-03 | Xóa POI đang trong Tour → 409 với tên các tour liên quan                                                                   |
| NFR-ERR-04 | Upload ảnh thất bại → inline error, panel không đóng                                                                       |
| NFR-ERR-05 | Nếu `fs.unlink` thất bại (file không tồn tại), server log cảnh báo nhưng KHÔNG trả lỗi cho client — tiếp tục xóa record DB |
| NFR-ERR-06 | Nếu DB delete thành công nhưng `fs.unlink` thất bại → log lỗi để admin biết file orphan; không rollback DB                 |

### 8.4 Loading States

| ID          | Requirement                                             |
| ----------- | ------------------------------------------------------- |
| NFR-LOAD-01 | Fetch/save/delete có visual feedback (spinner/skeleton) |
| NFR-LOAD-02 | Nút submit disabled khi đang gọi API                    |
| NFR-LOAD-03 | Upload ảnh hiển thị progress indicator (%)              |

### 8.5 Performance

| ID          | Requirement                                                              |
| ----------- | ------------------------------------------------------------------------ |
| NFR-PERF-01 | Tải trang lần đầu < 3s / 10 Mbps                                         |
| NFR-PERF-02 | CRUD phản hồi < 1s                                                       |
| NFR-PERF-03 | Map render < 2s                                                          |
| NFR-PERF-04 | Upload ≤ 5MB hoàn thành < 5s / 10 Mbps                                   |
| NFR-PERF-05 | Search/filter POI và Tour phản hồi realtime < 100ms (client-side filter) |

### 8.6 Logging

| ID         | Requirement                                                     |
| ---------- | --------------------------------------------------------------- |
| NFR-LOG-01 | Server log: timestamp, method, path, status code                |
| NFR-LOG-02 | Lỗi server log với stack trace; không expose ra response        |
| NFR-LOG-03 | Log mọi thao tác `fs.unlink`: path file, kết quả (success/fail) |

---

## 9. Data Requirements & DB Schema

### 9.1 Bảng `pois`

```sql
CREATE TABLE pois (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,                   -- Tên POI, max 255
  type        TEXT    NOT NULL,                   -- Enum: 'Chính'|'WC'|'Bán vé'|'Gửi xe'|'Bến thuyền'
  lat         REAL    NOT NULL,                   -- [-90, 90]
  lng         REAL    NOT NULL,                   -- [-180, 180]
  description TEXT,                              -- Nullable, plain text
  radius      INTEGER NOT NULL DEFAULT 0,        -- Bán kính (mét), ≥ 0
  image       TEXT,                              -- Tên file vật lý (VD: 'abc123.jpg')
                                                 -- NULL nếu không có ảnh
                                                 -- File lưu tại: /uploads/pois/{image}
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- Ngày/giờ tạo POI (ISO8601 format)
  updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP   -- Ngày/giờ chỉnh sửa lần cuối (ISO8601 format)
);
```

> **Ghi chú:** Cột `image` chỉ lưu **tên file** (VD: `abc123.jpg`). URL đầy đủ tổng hợp runtime: `${BASE_URL}/uploads/pois/${image}`.

**Icon mapping:**

| `type`       | Emoji | Ý nghĩa              |
| ------------ | ----- | -------------------- |
| `Chính`      | 📍    | Điểm tham quan chính |
| `WC`         | 🚻    | Nhà vệ sinh          |
| `Bán vé`     | 🎫    | Điểm bán vé          |
| `Gửi xe`     | 🅿️    | Bãi đỗ xe            |
| `Bến thuyền` | ⚓    | Bến thuyền           |

---

### 9.2 Bảng `tours`

```sql
CREATE TABLE tours (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,                  -- Tên tour, max 255
  description TEXT,                              -- Mô tả lộ trình (optional), max 1000 ký tự
  image       TEXT,                              -- Tên file ảnh đại diện (VD: 'tour_xyz.png')
                                                 -- NULL nếu không có ảnh
                                                 -- File lưu tại: /uploads/tours/{image}
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- Ngày/giờ tạo Tour (ISO8601 format)
  updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP   -- Ngày/giờ chỉnh sửa lần cuối (ISO8601 format)
);
```

---

### 9.3 Bảng `tour_pois` — NƠI DUY NHẤT lưu trữ quan hệ Tour ↔ POI

```sql
CREATE TABLE tour_pois (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id  INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  poi_id   INTEGER NOT NULL REFERENCES pois(id),
  position INTEGER NOT NULL,  -- Thứ tự trong tour, bắt đầu từ 1
                              -- Xác định bởi thứ tự click chọn của Admin
  UNIQUE (tour_id, position)  -- Mỗi vị trí trong tour chỉ có 1 POI
);

-- Index để query nhanh
CREATE INDEX idx_tour_pois_tour ON tour_pois(tour_id, position);
CREATE INDEX idx_tour_pois_poi ON tour_pois(poi_id);
```

> **⚠️ Chuẩn hóa DB:** ✅ Bảng `tour_pois` là **NƠI DUY NHẤT** lưu trữ thông tin quan hệ giữa Tour và POI. Bảng `tours` **KHÔNG** chứa cột `poi_ids` (đã loại bỏ hoàn toàn để tránh dư thừa dữ liệu). Khi query POIs của một Tour, Backend phải dùng **JOIN** giữa `tours` → `tour_pois` → `pois` với `ORDER BY position ASC`.

> **Cơ chế `position`:** Khi Admin click chọn POIs theo thứ tự, frontend gửi `poi_ids = [id1, id2, id3]` theo đúng thứ tự click. Backend INSERT vào `tour_pois` với `position = index + 1` (tuyệt đối KHÔNG lưu mảy này vào cột nào của bảng `tours`). Khi Admin bỏ chọn POI giữa chuỗi, frontend tự re-index lại mảy trước khi gửi.

**Lý do dùng bảng quan hệ thay JSON/array trong tours:**

- ✅ Đảm bảo referential integrity (FK constraint) — POI phải tồn tại trong bảng `pois`
- ✅ Query linh hoạt: lấy tất cả POI theo tour, hoặc tất cả tour chứa 1 POI
- ✅ Cập nhật thứ tự dễ dàng (UPDATE position hoặc DELETE + re-INSERT)
- ✅ Dễ kiểm tra POI đang dùng trong Tour nào để block DELETE
- ✅ **Tuân thủ chuẩn hóa DB (3NF)** — tránh dư thừa dữ liệu (data redundancy)

---

### 9.4 Migration từ schema cũ

```sql
-- Bước 1: Thêm cột mới vào pois
ALTER TABLE pois ADD COLUMN radius INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pois ADD COLUMN image TEXT;
-- Migrate data nếu có image_url cũ:
UPDATE pois SET image = SUBSTR(image_url, INSTR(image_url, '/pois/') + 6)
  WHERE image_url IS NOT NULL;

-- Bước 2: Tạo bảng tour_pois
CREATE TABLE tour_pois (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  poi_id INTEGER NOT NULL REFERENCES pois(id),
  position INTEGER NOT NULL,
  UNIQUE (tour_id, poi_id),
  UNIQUE (tour_id, position)
);
CREATE INDEX idx_tour_pois_tour ON tour_pois(tour_id, position);

-- Bước 3: Migrate poi_ids JSON → tour_pois
-- (Dùng script Node.js: parse JSON, INSERT từng row với position = index + 1)

-- Bước 4: Thêm cột description vào tours (mới v1.3)
ALTER TABLE tours ADD COLUMN description TEXT;
-- description tạm NULL cho các tour hiện tại, admin có thể sửa sau

-- Bước 5: Thêm cột image vào tours
ALTER TABLE tours ADD COLUMN image TEXT;
UPDATE tours SET image = SUBSTR(image_url, INSTR(image_url, '/tours/') + 7)
  WHERE image_url IS NOT NULL;

-- Bước 6: Xóa cột poi_ids khỏi tours (chuẩn hóa DB v1.3)
-- ⚠️ SQLite không hỗ trợ DROP COLUMN, cần recreate table:
-- CREATE TABLE tours_new (...) WITHOUT poi_ids column
-- INSERT INTO tours_new SELECT id, title, description, image FROM tours
-- DROP TABLE tours
-- ALTER TABLE tours_new RENAME TO tours
-- (Hoặc dùng tool migration như Prisma, Alembic)

-- Bước 7: Xóa cột image_url cũ (nếu có)
-- (Tương tự như Bước 6: recreate table)

-- Bước 8: Thêm audit timestamps vào pois (mới v1.4)
ALTER TABLE pois ADD COLUMN created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE pois ADD COLUMN updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP;
COMMENT: SQLite tự động gán CURRENT_TIMESTAMP cho các record hiện tại
COMMENT: Các record mới sẽ tự động nhận timestamp hiện tại

-- Bước 9: Thêm audit timestamps vào tours (mới v1.4)
ALTER TABLE tours ADD COLUMN created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE tours ADD COLUMN updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP;
COMMENT: SQLite tự động gán CURRENT_TIMESTAMP cho các record hiện tại
COMMENT: Các record mới sẽ tự động nhận timestamp hiện tại
```

---

### 9.5 Quy ước lưu file ảnh vật lý

| Thuộc tính          | Quy định                                                                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Định dạng chấp nhận | JPEG, PNG, WebP                                                                                                                              |
| Kích thước tối đa   | 5 MB/file                                                                                                                                    |
| Số lượng            | 1 ảnh/POI, 1 ảnh/Tour                                                                                                                        |
| Thư mục POI         | `/uploads/pois/`                                                                                                                             |
| Thư mục Tour        | `/uploads/tours/`                                                                                                                            |
| Đặt tên file        | `{uuid_v4}.{ext}` — tránh conflict                                                                                                           |
| Cột DB lưu          | Chỉ tên file (VD: `a1b2c3.jpg`), **không lưu path đầy đủ**                                                                                   |
| URL trả về API      | `${BASE_URL}/uploads/pois/{filename}` (tổng hợp runtime)                                                                                     |
| **Xóa file**        | **`fs.unlink(path.join(__dirname, 'uploads', folder, filename))` — bắt buộc khi: (1) xóa POI/Tour, (2) thay ảnh mới, (3) user nhấn xóa ảnh** |

---

## 10. API Specification

> **Content-Type:** Các endpoint CREATE/UPDATE dùng `multipart/form-data` (multer). GET/DELETE dùng JSON.

### 10.1 Authentication

```
POST /api/auth/login
  Content-Type: application/json
  Body:   { email: string, password: string }
  200:    { token: string, expiresAt: ISO8601 }
  401:    { error: "Invalid credentials" }

POST /api/auth/logout
  Authorization: Bearer <token>
  200:    { success: true }
```

---

### 10.2 POIs

```
GET /api/pois
  Authorization: Bearer <token>
  Query params:  ?search=<text>  (optional)
  200:    POI[]
  -- Mỗi POI object:
  -- { id, name, type, lat, lng, description, radius, image,
  --   created_at: ISO8601 timestamp (VD: "2026-03-15T10:30:45.000Z"),
  --   updated_at: ISO8601 timestamp,
  --   image_url: `${BASE_URL}/uploads/pois/${image}` | null }
```

```
POST /api/pois
  Authorization: Bearer <token>
  Content-Type:  multipart/form-data
  Body fields:
    name         (string, required)
    type         (string, required, enum)
    lat          (number, required)
    lng          (number, required)
    description  (string, optional)
    radius       (integer ≥ 0, optional, default 0)
    image        (File, optional, max 5MB, image/*)
  201:    { id: number, created_at: ISO8601, updated_at: ISO8601 }
  400:    { error: string }
  -- Server logic:
  -- 1. multer lưu file → /uploads/pois/{uuid}.{ext}
  -- 2. INSERT INTO pois (name, type, lat, lng, description, radius, image)
  --    (created_at, updated_at tự động được SQLite gán CURRENT_TIMESTAMP)
```

```
PUT /api/pois/:id
  Authorization: Bearer <token>
  Content-Type:  multipart/form-data
  Body fields:
    name, type, lat, lng, description, radius  (như POST)
    image          (File, optional — ảnh mới)
    remove_image   (boolean string "true", optional)
  200:    { success: true, updated_at: ISO8601 }
  404:    { error: "POI not found" }
  -- Server logic:
  -- 1. Lấy record hiện tại để biết image cũ
  -- 2. Nếu có image mới: fs.unlink(image cũ nếu có) → multer lưu file mới
  -- 3. Nếu remove_image="true": fs.unlink(image cũ nếu có) → set image = NULL
  -- 4. UPDATE pois SET ... (updated_at được SQLite tự động cập nhật CURRENT_TIMESTAMP)
```

```
DELETE /api/pois/:id
  Authorization: Bearer <token>
  200:    { success: true }
  404:    { error: "POI not found" }
  409:    { error: "POI đang được dùng trong tour: ['Tour A', 'Tour B']" }
  -- Server logic:
  -- 1. Kiểm tra tour_pois: SELECT * FROM tour_pois WHERE poi_id = :id
  -- 2. Nếu có → trả 409
  -- 3. Lấy image filename từ DB
  -- 4. DELETE FROM pois WHERE id = :id
  -- 5. fs.unlink(/uploads/pois/{image}) nếu image != NULL
  --    (log warning nếu unlink fail, không throw error)
```

---

### 10.3 Tours

```
GET /api/tours
  Authorization: Bearer <token>
  Query params:  ?search=<text>  (optional)
  200:    Tour[]
  -- Mỗi Tour object:
  -- {
  --   id: number,
  --   title: string,
  --   description: string | null,
  --   image: string | null,
  --   created_at: ISO8601 timestamp (VD: "2026-03-15T10:30:45.000Z"),
  --   updated_at: ISO8601 timestamp,
  --   image_url: `${BASE_URL}/uploads/tours/${image}` | null,
  --   pois: [  -- ← Data từ tour_pois JOIN pois table, sắp xếp theo position
  --     { poi_id, position, name, type, lat, lng, description, radius }
  --   ]
  -- }
  -- ⚠️ IMPORTANT: pois array được lấy từ JOIN:
  --   SELECT tp.poi_id, tp.position, p.name, p.type, p.lat, p.lng, p.description, p.radius
  --   FROM tour_pois tp
  --   JOIN pois p ON tp.poi_id = p.id
  --   WHERE tp.tour_id = :tour_id
  --   ORDER BY tp.position ASC
```

```
POST /api/tours
  Authorization: Bearer <token>
  Content-Type:  multipart/form-data
  Body fields:
    title         (string, required, max 255)
    description   (string, optional, max 1000)
    poi_ids       (JSON string của number[], VD: "[3,1,4]", required, ≥ 1 item)
                  -- Thứ tự trong mảy = thứ tự click của Admin = position trong tour_pois
    image         (File, optional)
  201:    { id: number, created_at: ISO8601, updated_at: ISO8601 }
  400:    { error: string }
  -- Server logic:
  -- 1. Parse poi_ids JSON, validate từng ID tồn tại trong pois
  -- 2. multer lưu ảnh → /uploads/tours/{uuid}.{ext} (nếu có)
  -- 3. INSERT INTO tours (title, description, image)  ← KHÔNG INSERT poi_ids vào tours
  --    (created_at, updated_at tự động được SQLite gán CURRENT_TIMESTAMP)
  -- 4. Lấy tour_id từ lastInsertRowid
  -- 5. Xóa cách dữ liệu cũ (nếu tồn tại): DELETE FROM tour_pois WHERE tour_id = ?
  -- 6. INSERT INTO tour_pois (tour_id, poi_id, position)
  --    cho từng poi_id: position = index + 1 (theo thứ tự mảy)
  -- ⚠️ CRITICAL: poi_ids CHỈ được lưu trong bảng tour_pois, KHÔNG lưu trong bảng tours
```

```
PUT /api/tours/:id
  Authorization: Bearer <token>
  Content-Type:  multipart/form-data
  Body fields:
    title         (string, required, max 255)
    description   (string, optional, max 1000)
    poi_ids       (JSON string, required — thứ tự = thứ tự mới sau khi Admin chỉnh)
    image         (File, optional — ảnh mới)
    remove_image  (boolean string "true", optional)
  200:    { success: true, updated_at: ISO8601 }
  404:    { error: "Tour not found" }
  -- Server logic:
  -- 1. Parse poi_ids JSON, validate từng ID
  -- 2. Lấy image cũ từ DB để xử lý file
  -- 3. Xử lý ảnh: fs.unlink cũ + lưu mới (nếu cần)
  -- 4. UPDATE tours SET title = ?, description = ?, image = ?  ← KHÔNG UPDATE poi_ids vào tours
  --    (updated_at được SQLite tự động cập nhật CURRENT_TIMESTAMP)
  -- 5. DELETE FROM tour_pois WHERE tour_id = :id
  -- 6. INSERT tour_pois mới theo thứ tự poi_ids lúc (position = index + 1)
  -- ⚠️ CRITICAL: poi_ids CHỈ được lưu trong bảng tour_pois, KHÔNG lưu trong bảng tours
```

```
DELETE /api/tours/:id
  Authorization: Bearer <token>
  200:    { success: true }
  404:    { error: "Tour not found" }
  -- Server logic:
  -- 1. Lấy image filename từ tours table
  -- 2. DELETE FROM tours WHERE id = :id
  --    (tour_pois tự xóa do ON DELETE CASCADE trong FK constraint)
  -- 3. fs.unlink(/uploads/tours/{image}) nếu image != NULL
  -- ⚠️ NOTE: tour_pois được tự động xóa bởi database, không cần explicit DELETE
```

---

### 10.4 Static Files

```
GET /uploads/pois/:filename
GET /uploads/tours/:filename
  Authorization: Bearer <token>  ← Bảo vệ, không public
  200:    Binary (image file)
  401:    Unauthorized
  404:    Not found
```

---

## 11. Dependencies & Risks

### 11.1 Dependencies

| Dependency                     | Loại            | Trạng thái | Ghi chú                                      |
| ------------------------------ | --------------- | ---------- | -------------------------------------------- |
| React 19 + Vite 6              | Frontend        | Đã có      |                                              |
| react-leaflet 5 + Leaflet 1.9  | Bản đồ          | Đã có      | Đổi tile sang sáng                           |
| OpenStreetMap / CARTO Positron | Map tile        | Free       | Không cần API key                            |
| Express 4                      | Backend         | Đã có      |                                              |
| better-sqlite3                 | Database        | Đã có      | Cần migration schema                         |
| `multer`                       | File upload     | Cần cài    | `npm install multer`                         |
| `uuid`                         | Đặt tên file    | Cần cài    | `npm install uuid` — tránh tên file conflict |
| `fs` (Node built-in)           | Xóa file vật lý | Built-in   | `fs.unlink` / `fs.promises.unlink`           |
| Tailwind CSS 3                 | Styling         | Đã có      | Palette light                                |
| Motion (Framer)                | Animation       | Đã có      |                                              |
| Node.js >= 18                  | Runtime         | Cần verify |                                              |

> **Lưu ý v1.3:** Đã loại bỏ `@hello-pangea/dnd` / `dnd-kit` khỏi danh sách dependencies. Không cần cài thêm thư viện nào cho tính năng sắp xếp thứ tự POI — cơ chế click thuần túy, không phụ thuộc thư viện bên ngoài.

### 11.2 Risks

| #                   | Rủi ro                                                                                                   | Mức độ           | Giảm thiểu                                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| R1                  | **Auth chưa implement:** login = `setIsLoggedIn(true)`, API không bảo vệ                                 | Cao              | Implement auth middleware trước production                                                                                   |
| R2                  | **SQLite concurrent writes** (ít dùng, OK cho MVP)                                                       | Thấp             | Plan migration PostgreSQL khi scale                                                                                          |
| R3                  | **File orphan:** DB delete OK nhưng `fs.unlink` fail → file rác trên disk                                | Trung bình       | Log + script dọn file orphan định kỳ                                                                                         |
| R4                  | **File storage ephemeral** trên container → mất ảnh khi restart                                          | Cao (production) | Mount persistent volume; long-term dùng S3/GCS                                                                               |
| R5                  | **Migration schema** (thêm `radius`, đổi `image_url`→`image`, `poi_ids`→`tour_pois`) có thể gây downtime | Trung bình       | Viết migration script, test staging trước                                                                                    |
| ~~R6~~              | ~~Drag-to-reorder library tăng bundle size~~                                                             | ~~Thấp~~         | **Đã loại bỏ v1.3 — không còn rủi ro**                                                                                       |
| R6                  | Contrast marker/polyline trên tile sáng                                                                  | Thấp             | Test visual trước release                                                                                                    |
| R7                  | `confirm()` native browser không nhất quán                                                               | Thấp             | Thay bằng modal component                                                                                                    |
| **R8** _(mới v1.3)_ | **UX cơ chế click để đổi thứ tự (bỏ chọn + chọn lại) ít trực quan hơn kéo-thả** — Admin có thể nhầm lẫn  | Thấp-Trung       | Thêm tooltip hướng dẫn: "Để đổi vị trí, bỏ chọn rồi click lại"; hiển thị chuỗi "Lộ trình đã chọn" rõ ràng để Admin kiểm soát |

---

## 12. Open Questions

| #         | Câu hỏi                                                                                                                 | Trạng thái                                                                          | Owner        | Deadline |
| --------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------ | -------- |
| OQ-01     | Auth: Session-based hay JWT? Token lưu ở đâu (httpOnly cookie vs localStorage)?                                         | 🔴 Mở                                                                               | Backend Lead | Sprint 1 |
| OQ-02     | Admin credentials: hard-code env var hay bảng `users` trong DB?                                                         | 🔴 Mở                                                                               | Backend Lead | Sprint 1 |
| ~~OQ-03~~ | ~~Có cần Edit Tour?~~                                                                                                   | ✅ Đóng — In-scope, PUT + click-to-order                                            | —            | —        |
| ~~OQ-04~~ | ~~Xóa POI trong Tour: Chặn hay cascade?~~                                                                               | ✅ Đóng — Chặn 409, không cascade                                                   | —            | —        |
| OQ-05     | Số lượng POI/Tour dự kiến? Ảnh hưởng pagination                                                                         | 🔴 Mở                                                                               | PO           | Sprint 2 |
| OQ-06     | CARTO Positron tile có cần API key production?                                                                          | 🟡 Thấp                                                                             | DevOps       | Sprint 1 |
| ~~OQ-07~~ | ~~Tọa độ trung tâm?~~                                                                                                   | ✅ Đóng — `10.7570, 106.7000`, zoom 16                                              | —            | —        |
| OQ-08     | `description` POI: giới hạn độ dài? Rich text?                                                                          | 🔴 Mở                                                                               | PO           | Sprint 2 |
| OQ-09     | Package `firebase` cài nhưng không dùng — xóa?                                                                          | 🟡 Thấp                                                                             | Dev          | Sprint 1 |
| OQ-10     | Package `@google/genai` — có AI feature nào trong MVP?                                                                  | 🔴 Mở                                                                               | PO           | Sprint 2 |
| ~~OQ-11~~ | ~~File storage: filesystem hay object storage?~~                                                                        | ✅ Đóng — Filesystem local (`/uploads/`), `fs.unlink`, persistent volume production | —            | —        |
| OQ-12     | `radius` có cần hiển thị vòng tròn `L.circle` trên map không, hay chỉ text trong popup?                                 | 🔴 Mở                                                                               | PO           | Sprint 1 |
| OQ-13     | Thư mục `/uploads` có commit vào git không? Cần `.gitignore` với placeholder?                                           | 🟡 Thấp                                                                             | DevOps       | Sprint 1 |
| OQ-14     | Search POI/Tour: client-side (filter mảng đã fetch) hay server-side (`?search=`)? Client-side đủ dùng khi < 500 records | 🔴 Mở                                                                               | Backend Lead | Sprint 1 |

---

## 13. Future Enhancements

> Các tính năng dưới đây **ngoài scope MVP**. Ghi nhận để ưu tiên cho sprint sau.

- **Kéo-thả (drag-to-reorder) thứ tự POI trong Tour** — đã loại bỏ khỏi MVP v1.3; có thể thêm lại sau nếu UX click-to-order không đủ trực quan
- **Circle overlay trên map** cho `radius` POI (xem OQ-12)
- Upload nhiều ảnh (gallery) cho POI hoặc Tour
- Export tour ra PDF hoặc chia sẻ link public
- Undo/Redo cho thao tác xóa POI/Tour
- Clustering marker khi zoom out (nhiều POI chồng nhau)
- Thống kê: số POI theo loại, số tour, POI phổ biến nhất
- Audit log: lịch sử thao tác của Admin
- Script tự động dọn file orphan (`/uploads` không có DB record tương ứng)
- Object storage migration (S3/GCS/Cloudinary) thay filesystem local
- Phân quyền nhiều role (Admin, Editor, Viewer)
- Quản lý nhiều khu vực bản đồ (config địa điểm động)
- Mobile responsive
- Dark mode toggle (opt-in)
- Multi-language (EN/VI)
- Tích hợp Gemini AI (mô tả POI tự động, gợi ý lộ trình)
- Audio guide cho POI

---

_PRD v1.3 — Cập nhật từ v1.2. Thay đổi: Loại bỏ kéo-thả, thay bằng cơ chế click-to-order; thêm search POI trong panel Tour; cập nhật US-14, US-15, FR-03.6–FR-03.10, Dependencies (bỏ dnd library), Risks (bỏ R6, thêm R8). Mọi thay đổi scope cần PO xác nhận và update version._
