# 🗺️ GPS Admin Dashboard — POI & Tour Management System

<div align="center">

**Quản lý điểm tham quan (POI) và lộ trình Tour tương tác trên bản đồ**  
_Khu phố ẩm thực Vĩnh Khánh, Quận 4, TP.HCM_

![License](https://img.shields.io/badge/License-MIT-green.svg)
![Node.js](https://img.shields.io/badge/Node.js->=18-blue.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg)
![Express](https://img.shields.io/badge/Express-4-black.svg)
![SQLite](https://img.shields.io/badge/SQLite-3-003b57.svg)

</div>

---

## 📋 Giới thiệu

Hệ thống quản trị tập trung (Admin Dashboard) cho phép quản lý viên:

- ✅ **CRUD điểm tham quan (POIs)** trực tiếp trên bản đồ tương tác
- ✅ **CRUD lộ trình Tour** với sắp xếp thứ tự POI bằng thao tác click
- ✅ **Upload ảnh vật lý** cho POI và Tour (lưu trữ cục bộ)
- ✅ **Tìm kiếm & lọc** realtime theo tên
- ✅ **Bản đồ cô lập** khi chọn tour (hiển thị riêng POI lẫ polyline của tour đó)

Dự án này sử dụng **React 19 + Vite 6** (Frontend) và **Express 4 + SQLite** (Backend) với **Leaflet** cho tương tác bản đồ.

---

## 🛠️ Tech Stack

### Frontend

| Công nghệ                                                                               | Mục đích                  |
| --------------------------------------------------------------------------------------- | ------------------------- |
| ![React Badge](https://img.shields.io/badge/React-19-61dafb?style=flat)                 | Thư viện UI               |
| ![Vite Badge](https://img.shields.io/badge/Vite-6-646cff?style=flat)                    | Build tool & dev server   |
| ![TypeScript Badge](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat)        | Type safety               |
| ![Tailwind CSS Badge](https://img.shields.io/badge/Tailwind%20CSS-3-38b2ac?style=flat)  | Styling                   |
| ![Leaflet Badge](https://img.shields.io/badge/Leaflet-1.9-199D0C?style=flat)            | Interactive map           |
| ![react-leaflet Badge](https://img.shields.io/badge/react--leaflet-5-199D0C?style=flat) | React Leaflet integration |

### Backend

| Công nghệ                                                                                 | Mục đích               |
| ----------------------------------------------------------------------------------------- | ---------------------- |
| ![Node.js Badge](https://img.shields.io/badge/Node.js->=18-339933?style=flat)             | JavaScript runtime     |
| ![Express Badge](https://img.shields.io/badge/Express-4-000000?style=flat)                | Web framework          |
| ![SQLite Badge](https://img.shields.io/badge/SQLite-3-003b57?style=flat)                  | Database               |
| ![better-sqlite3 Badge](https://img.shields.io/badge/better--sqlite3-9-003b57?style=flat) | SQLite driver          |
| ![Multer Badge](https://img.shields.io/badge/Multer-1.4-FF6B6B?style=flat)                | File upload middleware |

---

## ✨ Tính năng chính

### 🗺️ Quản lý POI

- Hiển thị tất cả POIs trên bản đồ Leaflet (Light mode)
- **Thêm POI mới:**
  - Click trực tiếp trên bản đồ để chọn vị trí
  - Hoặc nhập thủ công tọa độ Lat/Lng
- **Chỉnh sửa POI:** Tên, loại (Chính/WC/Bán vé/Gửi xe/Bến thuyền), mô tả, bán kính (m)
- **Upload ảnh:** 1 ảnh vật lý cho mỗi POI (max 5MB)
- **Tìm kiếm:** Lọc realtime theo tên POI
- **Xóa POI:** Kèm theo xóa file ảnh vật lý từ storage

### 🎯 Quản lý Tour

- Tạo tour bằng cách **click chọn POIs theo thứ tự mong muốn** (không cần kéo-thả)
- Hiển thị thứ tự POI bằng **badge số (1, 2, 3...)** trên icon
- **Sửa tour:** Đổi tên, ảnh, thêm/bớt POI, điều chỉnh thứ tự (bỏ chọn rồi chọn lại)
- **Upload ảnh đại diện:** 1 ảnh cho mỗi tour
- **Tìm kiếm:** Lọc realtime theo tên tour
- **Xóa tour:** Kèm theo xóa file ảnh vật lý

### 🎨 Tương tác bản đồ

- **Click POI sidebar → Map flyTo + zoom + mở popup** chi tiết
- **Chọn tour → Bản đồ cô lập:** Chỉ hiển thị POIs của tour đó (có badge số thứ tự) + polyline nối liền
- **Bỏ chọn tour → Trở về bình thường:** Hiển thị tất cả POIs + polylines (trong suốt)
- Marker popup hiển thị: Tên, loại, mô tả, bán kính, ảnh (nếu có)

### 📱 Giao diện

- Light mode với bản đồ tile sáng (OpenStreetMap/CARTO Positron)
- Sidebar trái (**w-80**) với nav 2 tab: **POIs** | **Tours**
- Panel slide-in phải khi thêm/sửa POI hoặc Tour
- **Legend bản đồ** (bottom-left) giải thích biểu tượng POI theo loại

---

## 🚀 Getting Started

### Prerequisites

Hệ thống yêu cầu:

- **Node.js >= 18** (hoặc cao hơn)
- **npm** (đi kèm Node.js) hoặc **yarn**
- **SQLite 3** (tùy chọn, `better-sqlite3` sẽ build sẵn)

### 1. Clone Repository

```bash
git clone https://github.com/your-org/gps-admin-dashboard.git
cd gps-admin-dashboard
```

### 2. Cài đặt Dependencies

#### Frontend (Vite + React)

```bash
npm install
```

#### Backend (Express + SQLite)

Backend API chạy trong cùng workspace. Các packages cần thiết đã được liệt kê trong `package.json`:

```bash
# Tất cả dependencies (Frontend + Backend) được cài trong một lệnh
npm install
```

**Kiểm tra cài đặt:**

```bash
node --version    # Kiểm tra Node.js (≥ 18)
npm --version     # Kiểm tra npm
```

### 3. Cấu hình Environment Variables

Tạo file `.env.local` trong thư mục gốc dự án:

```bash
# .env.local (Frontend)
VITE_API_URL=http://localhost:3000
```

**Ghi chú:**

- `VITE_API_URL`: URL backend API (mặc định `http://localhost:3000`)
- Nếu backend chạy trên cổng khác, cập nhật URL này tương ứng

#### Backend Configuration

Backend sử dụng các cài đặt mặc định trong `server.ts`:

| Biến             | Giá trị mặc định          | Mục đích               |
| ---------------- | ------------------------- | ---------------------- |
| **PORT**         | `3000`                    | Cổng backend API nghe  |
| **DB_FILE**      | `./data/dashboard.sqlite` | Đường dẫn file SQLite  |
| **UPLOAD_DIR**   | `./uploads`               | Thư mục lưu ảnh upload |
| **POIS_UPLOAD**  | `./uploads/pois`          | Thư mục ảnh POI        |
| **TOURS_UPLOAD** | `./uploads/tours`         | Thư mục ảnh Tour       |

**Để thay đổi cấu hình:**

Chỉnh sửa các hằng số trong [server.ts](server.ts) (dòng ~30–40):

```typescript
const PORT = process.env.PORT || 3000;
const DB_FILE = process.env.DB_FILE || "./data/dashboard.sqlite";
const UPLOADS_DIR = process.env.UPLOADS_DIR || "./uploads";
const POIS_UPLOAD = path.join(UPLOADS_DIR, "pois");
const TOURS_UPLOAD = path.join(UPLOADS_DIR, "tours");
```

---

## ▶️ Chạy dự án

### Option 1: Chạy cả Frontend + Backend cùng lúc (Recommended)

Mở **2 terminal** trong workspace:

**Terminal 1 — Frontend (Vite dev server):**

```bash
npm run dev
```

Output mong đợi:

```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

**Terminal 2 — Backend (Express API):**

```bash
node server.ts
```

Output mong đợi:

```
Server running on http://localhost:3000
Database initialized at ./data/dashboard.sqlite
Uploads directory ready: ./uploads
```

### Option 2: Production Build

#### Build Frontend

```bash
npm run build
```

Output:

```
Γ£ô built in 6.46s
```

#### Run Backend in Production

```bash
NODE_ENV=production node server.ts
```

> **Lưu ý:** Cần phục vụ file static từ `dist/` qua Express. Xem phần [Advanced Setup](#advanced-setup) (tùy chọn).

---

## 📖 Hướng dẫn sử dụng cơ bản

### Đăng nhập

1. Mở trình duyệt: `http://localhost:5173/`
2. Nhập **Email:** `admin@example.com` | **Password:** `admin123`
3. Nhấn **Đăng nhập** → Vào Dashboard

### Quản lý POI

#### Thêm POI mới

1. Chọn tab **POIs** (sidebar trái)
2. **Cách 1 — Click bản đồ:**
   - Click vị trí trên bản đồ → Panel "Thêm POI mới" hiện ra
   - Tọa độ Lat/Lng tự động điền từ vị trí click
3. **Cách 2 — Nhập tạo hợp (nếu muốn):**
   - Nhập Lat/Lng trực tiếp vào form → Marker tạm nhảy đến vị trí đó

#### Điền thông tin POI

- **Tên điểm:** Tên POI (required, max 255 ký tự)
- **Loại:** Chọn từ dropdown (Chính / WC / Bán vé / Gửi xe / Bến thuyền)
- **Mô tả:** Thông tin mô tả (optional)
- **Vĩ độ (Lat):** Có thể click map hoặc nhập tay
- **Kinh độ (Lng):** Có thể click map hoặc nhập tay
- **Bán kính (Radius):** Nhập số (m), mặc định 0
- **Ảnh:** Upload file ảnh (optional, max 5MB)

Nhấn **Lưu địa điểm** → POI được lưu vào DB + file ảnh lưu vào `/uploads/pois/`

#### Tìm kiếm POI

- Gõ tên POI trong thanh `🔍` (sidebar) → Danh sách lọc realtime
- Xóa text tìm kiếm → Hiển thị toàn bộ POI

#### Chỉnh sửa POI

1. Click vào POI trong sidebar hoặc click marker trên bản đồ
2. Nhấn nút **Sửa** → Panel "Sửa POI" mở ra
3. Đổi thông tin cần thiết
4. Nhấn **Lưu địa điểm** → Cập nhật vào DB

#### Xóa POI

- Hover vào POI trong sidebar → Icon trash xuất hiện
- Nhấn icon → Xác nhận xóa → POI bị xóa khỏi DB + file ảnh bị xóa khỏi `/uploads/pois/`

### Quản lý Tour

#### Tạo Tour mới

1. Chọn tab **Tours** (sidebar trái)
2. Nhấn nút **+** → Panel "Tạo Tour mới" mở ra

#### Điền thông tin Tour

- **Ảnh đại diện:** Upload file ảnh (optional, max 5MB)
- **Tên tour:** Tiêu đề tour (required, max 255 ký tự)
- **Mô tả:** Thông tin ngắn về lộ trình (optional, max 1000 ký tự)
- **Tìm kiếm POI:** Gõ tên POI trong thanh `🔍` (trong panel) để lọc danh sách

#### Chọn POI theo thứ tự

- Danh sách POIs hiển thị bên dưới
- **Click POI chưa chọn** → POI được thêm vào tour (ở cuối chuỗi), badge số (1, 2, 3...) hiện lên
- **Click POI đã chọn** → POI bị xóa khỏi tour
- **Thay đổi thứ tự:**
  - Bỏ chọn POI đó (click lại) → POI bị remove
  - Click chọn lại → POI được đưa xuống cuối chuỗi (position mới)

**Phần "Lộ trình đã chọn"** (phía trên danh sách) hiển thị: `[1: POI A] → [2: POI B] → [3: POI C]` để kiểm tra thứ tự tổng thể

#### Lưu Tour

- Nhấn **Lưu lộ trình** → Tour được lưu vào DB + file ảnh lưu vào `/uploads/tours/`
- Nút **disabled** khi: thiếu tên hoặc chưa chọn ≥ 1 POI

#### Chỉnh sửa Tour

1. Nhấn icon **Edit** trên tour item trong sidebar
2. Panel "Sửa Tour" mở ra với dữ liệu hiện tại
3. Đổi thông tin cần thiết (tên, mô tả, ảnh, thêm/bớt POI)
4. Nhấn **Lưu thay đổi** → Cập nhật vào DB

#### Xóa Tour

- Hover vào tour trong sidebar → Icon trash xuất hiện
- Nhấn icon → Xác nhận xóa → Tour bị xóa khỏi DB + file ảnh bị xóa

#### Chọn Tour trên bản đồ

- Click vào tour item trong sidebar
- **Bản đồ tự động:**
  - `fitBounds` bao quanh toàn bộ POIs của tour đó
  - Chỉ hiển thị POIs nằm trong tour (với badge số thứ tự 1/2/3...)
  - Chỉ hiển thị polyline nối liền POIs của tour đó
  - Ẩn toàn bộ POI markers và polylines từ tour khác

- **Click lại tour đang chọn** → Deselect → Quay về trạng thái mặc định (hiển thị tất cả)

---

## 📚 Tài liệu tham khảo

- **[PRD v1.4](./PRD_v1.0.md)** — Tài liệu yêu cầu chức năng hoàn chỉnh (BEING UPDATED)
- **[API Specification](./docs/API.md)** — Danh sách endpoint (to be linked)
- **[Database Schema](./docs/SCHEMA.md)** — Cấu trúc bảng SQL (to be linked)
- **[Deployment Guide](./docs/DEPLOYMENT.md)** — Hướng dẫn deploy lên production (to be linked)

---

## 🔧 Advanced Setup (Tùy chọn)

### Serve Frontend từ Backend (Production)

Nếu muốn chạy cả frontend + backend từ cùng port (3000):

1. Build frontend:

   ```bash
   npm run build
   ```

2. Thêm middleware static vào [server.ts](server.ts):

   ```typescript
   app.use(express.static(path.join(__dirname, "../dist")));
   ```

3. Chạy backend:

   ```bash
   node server.ts
   ```

4. Truy cập: `http://localhost:3000/`

### Database Migration

Nếu muốn reset/migrate database:

```bash
# Xóa file DB hiện tại
rm ./data/dashboard.sqlite

# Backend sẽ tự tạo DB mới khi khởi động
node server.ts
```

### Upload Storage

Tất cả ảnh upload được lưu tại:

- **POI ảnh:** `./uploads/pois/{uuid}.{ext}`
- **Tour ảnh:** `./uploads/tours/{uuid}.{ext}`

Để backup hoặc migrate ảnh:

```bash
cp -r ./uploads /path/to/backup/
```

---

## 📝 License

MIT License — Xem [LICENSE](./LICENSE) để chi tiết.

---

## 📧 Support & Feedback

Nếu gặp vấn đề hoặc có đề xuất:

- **GitHub Issues:** [Report Issue](https://github.com/your-org/gps-admin-dashboard/issues)
- **Email:** admin@example.com

---

**Last Updated:** March 2026  
**Version:** v1.4
