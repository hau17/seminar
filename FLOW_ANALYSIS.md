# Phân Tích Chi Tiết Luồng Hoạt Động Dự Án

## 📋 Tổng Quan Dự Án

- **Loại**: React + TypeScript + Express.js (Vite + Leaflet Maps)
- **Chức năng chính**: Admin Dashboard quản lý POIs (Points of Interest) và Tours
- **Database**: SQLite (data.db)
- **Port**: 3000

---

## 🔐 LUỒNG ĐĂNG NHẬP (Login Flow)

### 1. **Điểm Bắt Đầu** - `index.html` → `src/main.tsx`

```
index.html
    ↓
<div id="root"></div>  (mounting point)
    ↓
src/main.tsx
    ├─ import App from './App.tsx'
    ├─ createRoot(document.getElementById('root')!)
    └─ render(<App />)
```

**File**: [index.html](index.html)

- Chứa div#root để mount React
- Chứa div#toast-root cho notification

**File**: [src/main.tsx](src/main.tsx)

- Entry point của React
- Import App component và CSS
- Render App vào root element

---

### 2. **App Component Khởi Động** - `src/App.tsx`

**File**: [src/App.tsx](src/App.tsx)

Khi App component load lần đầu:

```typescript
// State khởi tạo (dòng 59-82)
const [isLoggedIn, setIsLoggedIn] = useState(false);
const [loginEmail, setLoginEmail] = useState("adminisme");
const [loginPassword, setLoginPassword] = useState("password");
const [loginError, setLoginError] = useState("");
const [loginLoading, setLoginLoading] = useState(false);
```

**Kiểm tra điều kiện:** Nếu `isLoggedIn === false` → Hiển thị LoginPage

```typescript
if (!isLoggedIn) {
  return (
    <LoginPage
      email={loginEmail}
      password={loginPassword}
      error={loginError}
      loading={loginLoading}
      onEmailChange={setLoginEmail}
      onPasswordChange={setLoginPassword}
      onSubmit={handleLogin}
    />
  );
}
```

---

### 3. **Hiển Thị LoginPage** - `src/components/LoginPage.tsx`

**File**: [src/components/LoginPage.tsx](src/components/LoginPage.tsx)

Giao diện login bao gồm:

- **Logo**: MapPin icon (emerald color)
- **Title**: "Admin Dashboard"
- **Subtitle**: "Quản lý POIs và Lộ trình Tour"
- **Form Input**:
  - Email field (default: "adminisme")
  - Password field (default: "password")
  - Submit button
  - Error message display

```typescript
<input
  type="email"
  value={email}
  placeholder="adminisme"
/>
<input
  type="password"
  value={password}
  placeholder="••••••••"
/>
<button type="submit">
  {loading ? <LoadingSpinner /> : "Đăng nhập"}
</button>
```

---

### 4. **Xử Lý Login** - `App.tsx` → `handleLogin()` (dòng 242-263)

Khi user nhấn nút "Đăng nhập":

```typescript
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoginLoading(true);
  setLoginError("");

  try {
    // Gửi request tới Backend
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: loginEmail,
        password: loginPassword,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Đăng nhập thất bại");
    }

    // ✅ Đăng nhập thành công
    setIsLoggedIn(true);
    setActiveTab("tours");
  } catch (error) {
    setLoginError(
      error instanceof Error ? error.message : "Lỗi không xác định",
    );
  } finally {
    setLoginLoading(false);
  }
};
```

**Luồng chi tiết:**

```
User nhấn "Đăng nhập"
    ↓
handleLogin() được gọi
    ↓
POST /api/auth/login {email, password}
    ↓ (Chuyển tới Backend)
```

---

### 5. **Backend Xác Thực** - `server.ts` (dòng 36-48)

**File**: [server.ts](server.ts)

```typescript
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  // Lấy credentials từ .env (hoặc default)
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "123";

  // Xác minh email & password
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    // ✅ Đúng credentials
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ token });
  } else {
    // ❌ Sai credentials
    res.status(401).json({ error: "Sai email hoặc mật khẩu" });
  }
});
```

**⚠️ Vấn đề hiện tại:**

- Backend kiểm tra email/password hardcode
- Default: `admin@example.com` / `123`
- Nhưng form có default "adminisme" / "password" (không khớp!)
- **MỘT LỖI CAN SỬA**: Xem phần "VẤN ĐỀ CẦN FIX"

---

### 6. **Phản Hồi từ Backend**

```
✅ Thành công:
  ← { token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
    ↓
    setIsLoggedIn(true)
    ↓
    Dashboard render

❌ Thất bại:
  ← { error: "Sai email hoặc mật khẩu" }
    ↓
    setLoginError("Sai email hoặc mật khẩu")
    ↓
    Hiển thị error message
```

---

### 7. **Dashboard Load** - Khi `isLoggedIn === true`

**File**: [src/App.tsx](src/App.tsx) (dòng 95-100)

```typescript
useEffect(() => {
  if (isLoggedIn) {
    fetchPois(); // Tải danh sách POIs
    fetchTours(); // Tải danh sách Tours
  }
}, [isLoggedIn]);
```

---

## 🗺️ HIỂN THỊ MAP VÀ CÁC THÀNH PHẦN

### **Cấu Trúc Dashboard**

```
┌─────────────────────────────────────────────────┐
│                    TourAdmin                    │
│  ┌──────────────┐  ┌─────────────────────────┐ │
│  │   SIDEBAR    │  │                         │ │
│  │ (w-80)       │  │                         │ │
│  ├──────────────┤  │                         │ │
│  │ • POIs       │  │      MAP                │ │
│  │ • Tours      │  │   (flex-1 main)        │ │
│  │              │  │                         │ │
│  │ Danh sách:   │  │ • Markers: POIs        │ │
│  │ - POI 1      │  │ • Polyline: Tours      │ │
│  │ - POI 2      │  │ • Legend (bottom-left) │ │
│  │ - POI 3      │  │                         │ │
│  │              │  │ FORM OVERLAY (right)   │ │
│  │ Tours:       │  │ (Khi edit/create)      │ │
│  │ - Tour 1     │  │                         │ │
│  │ - Tour 2     │  │                         │ │
│  │              │  │                         │ │
│  │ [Đăng xuất]  │  │                         │ │
│  └──────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

### **A. MAP CONTAINER** - Leaflet (dòng 449-504)

**File**: [src/App.tsx](src/App.tsx)#L449-L504

```typescript
<MapContainer
  center={[16.047, 108.206]}  // Tọa độ Đà Nẵng
  zoom={13}
  className="z-0"
>
  {/* TileLayer: Nền bản đồ */}
  <TileLayer
    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    attribution="CARTO"
  />

  {/* MapEvents: Xử lý click trên bản đồ */}
  <MapEvents />

  {/* Markers: Hiển thị POIs */}
  {pois.map((poi) => (
    <Marker position={[poi.lat, poi.lng]} />
  ))}

  {/* New POI Marker: Marker tạm khi tạo POI mới */}
  {newPoiPos && <Marker position={newPoiPos} />}

  {/* Polyline: Đường nối POIs trong Tour */}
  {activeTab === "tours" &&
    tours.map((tour) => (
      <Polyline positions={positions} />
    ))
  }
</MapContainer>
```

#### **1. Nền Bản Đồ (TileLayer)**

```
URL: https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png
└─ Dark theme tiles từ CARTO/OpenStreetMap
```

**Tọa độ mặc định:**

- `center={[16.047, 108.206]}` → Đà Nẵng, Việt Nam
- `zoom={13}` → Mức zoom trung bình

---

#### **2. Hiển Thị Markers (POIs)**

```typescript
{pois.map((poi) => (
  <Marker
    key={poi.id}
    position={[poi.lat, poi.lng]}
    eventHandlers={{
      click: () => {
        setSelectedPoi(poi);
        setIsEditingPoi(false);
      },
    }}
  >
    <Popup>
      <div className="p-2">
        <h3 className="font-bold">{poi.name}</h3>
        <p className="text-xs">{poi.type}</p>
        {poi.description && <p className="text-xs">{poi.description}</p>}
      </div>
    </Popup>
  </Marker>
))}
```

**Cách dấu vết POI trên map:**

- Mỗi POI hiển thị một **Marker** (chấm đỏ/mặc định)
- Click marker → mở **Popup** với thông tin POI
- Click marker → select POI trong sidebar

**POI Icons (Emoji):**

```typescript
const POI_ICONS: Record<POIType, string> = {
  [POIType.MAIN]: "📍", // Chính
  [POIType.WC]: "🚻", // WC
  [POIType.TICKET]: "🎫", // Bán vé
  [POIType.PARKING]: "🅿️", // Gửi xe
  [POIType.PORT]: "⚓", // Bến thuyền
};
```

**⚠️ LỖI HIỂN THỊ MAP:**

- Emoji được dùng trong SIDEBAR (list POIs)
- Nhưng trên MAP, Leaflet dùng **marker icon mặc định** (chấm đỏ)
- **Không có icon tùy chỉnh** dựa trên loại POI
- **Giải pháp**: Cần tạo custom markers với emoji hoặc icon

---

#### **3. Hiển Thị Đường Nối Tours (Polyline)**

```typescript
{activeTab === "tours" &&
  tours.map((tour) => {
    const positions = tour.poi_ids
      .map((id) => pois.find((p) => p.id === id))
      .filter((p) => p !== undefined)
      .map((p) => [p!.lat, p!.lng] as [number, number]);

    return (
      <Polyline
        key={tour.id}
        positions={positions}
        color="#10b981"      // Emerald green
        weight={3}
        opacity={0.6}
        dashArray="10, 10"   // Dashed line
      />
    );
  })}
```

**Cách dấu vết Tour trên map:**

- **Chỉ hiển thị khi activeTab === "tours"**
- Vẽ đường nối giữa các POIs trong tour
- **Màu**: Xanh lá (#10b981)
- **Kiểu**: Dashed (gạch ngang)
- **Độ dày**: 3px
- **Độ trong suốt**: 60%

**Vấn đề cần lưu ý:**

- Polyline hiển thị theo **thứ tự POIs trong tour**
- Nếu POI không tồn tại → skip

---

### **B. SIDEBAR - Quản Lý POIs & Tours** (dòng 314-447)

#### **1. Navigation Tabs (dòng 325-343)**

```
┌─────────────────┐
│ TourAdmin       │
├─────────────────┤
│ ▶ Quản lý POIs  │ ← activeTab = "pois"
│ ▶ Quản lý Tours │ ← activeTab = "tours"
├─────────────────┤
```

Nhấn tab → `setActiveTab("pois")` hoặc `setActiveTab("tours")`

---

#### **2. Tab POIs - Danh Sách & Quản Lý** (dòng 351-395)

```typescript
{activeTab === "pois" ? (
  <div className="space-y-4">
    <h3>Danh sách POIs</h3>

    {pois.map((poi) => (
      <div
        key={poi.id}
        onClick={() => setSelectedPoi(poi)}
        className="p-4 rounded-xl border cursor-pointer"
      >
        <div className="flex items-start justify-between">
          <div className="flex gap-3">
            <span className="text-xl">{POI_ICONS[poi.type]}</span>
            <div>
              <h4 className="font-semibold text-sm">{poi.name}</h4>
              <p className="text-xs text-zinc-500">{poi.type}</p>
            </div>
          </div>
          <div>
            <Edit2 button />
            <Trash2 button />
          </div>
        </div>
      </div>
    ))}
  </div>
)}
```

**Chức năng:**

1. **Click POI card** → Select POI (highlight)
2. **Edit button** → `setIsEditingPoi(true)` → Mở form edit
3. **Delete button** → Delete POI từ database

---

#### **3. Tab Tours - Danh Sách & Tạo Mới** (dòng 397-447)

```typescript
{activeTab === "tours" ? (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h3>Danh sách Tours</h3>
      <Plus button onClick={() => setIsCreatingTour(true)} />
    </div>

    {tours.map((tour) => (
      <div key={tour.id} className="p-4 rounded-xl">
        <h4>{tour.title}</h4>
        <div className="flex flex-wrap gap-1">
          {tour.poi_ids.map((id, idx) => {
            const poi = pois.find((p) => p.id === id);
            return (
              <span className="text-[10px] bg-zinc-800">
                {poi?.name}
                {idx < tour.poi_ids.length - 1 && <ChevronRight />}
              </span>
            );
          })}
        </div>
      </div>
    ))}
  </div>
)}
```

**Hiển thị:**

- Tour title
- Chuỗi POIs: `POI1 → POI2 → POI3`

---

### **C. FORM OVERLAY - Chỉnh Sửa POI & Tạo Tour** (dòng 505-680)

#### **1. Edit POI Form** (dòng 505-596)

Khi `isEditingPoi && selectedPoi`:

```
┌──────────────────────┐
│ Sửa POI      [X]     │
├──────────────────────┤
│ Tên điểm:            │
│ [________________]   │
│                      │
│ Loại điểm:          │
│ [Chính ▼]           │
│                      │
│ Mô tả:               │
│ [________________]   │
│ [________________]   │
│                      │
│ Vĩ độ (Lat): 16.047 │
│ Kinh độ (Lng): 108.2 │
│                      │
│   [Lưu địa điểm]    │
└──────────────────────┘
```

**Fields:**

- **Tên điểm**: Input text
- **Loại điểm**: Select (MAIN, WC, TICKET, PARKING, PORT)
- **Mô tả**: Textarea
- **Vĩ độ/Kinh độ**: Disabled (tự động từ click map)
- **Lưu button**: Submit form

**Xử lý lưu:**

```typescript
const handleSavePoi = async (e: React.FormEvent) => {
  // Validate POI
  const validationError = validatePOI(selectedPoi);
  if (validationError) return;

  // Kiểm tra: có ID không?
  const method = selectedPoi.id ? "PUT" : "POST";
  const url = selectedPoi.id ? `/api/pois/${selectedPoi.id}` : "/api/pois";

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(selectedPoi),
  });

  // ✅ Thành công
  setIsEditingPoi(false);
  fetchPois(); // Reload danh sách
  showToast("Tạo POI thành công", "success");
};
```

---

#### **2. Create Tour Form** (dòng 598-680)

Khi `isCreatingTour`:

```
┌──────────────────────┐
│ Tạo Tour mới [X]     │
├──────────────────────┤
│ Tên Tour:            │
│ [________________]   │
│                      │
│ Chọn POIs (thứ tự):  │
│ ☐ 📍 POI 1          │
│ ☑ 🚻 POI 2      [2] │
│ ☑ 🎫 POI 3      [3] │
│ ☐ 🅿️ POI 4          │
│                      │
│   [Lưu lộ trình]    │
└──────────────────────┘
```

**Cách dấu vết Tour:**

1. **Click POI checkbox** → Toggle select
2. **Số thứ tự** → Hiển thị khi select (1, 2, 3...)
3. **Lưu button** → POST /api/tours với `{title, poi_ids: [...]}`

**Lưu Tour:**

```typescript
const handleSaveTour = async (e: React.FormEvent) => {
  // Validate
  if (!currentTour.title || currentTour.poi_ids?.length === 0) return;

  const method = currentTour.id ? "PUT" : "POST";
  const url = currentTour.id ? `/api/tours/${currentTour.id}` : "/api/tours";

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(currentTour),
  });

  // ✅ Thành công
  setIsCreatingTour(false);
  fetchTours(); // Reload
  showToast("Tạo Tour thành công", "success");
};
```

---

### **D. MAP EVENTS - Tạo POI bằng Click Map** (dòng 233-241)

```typescript
const MapEvents = () => {
  useMapEvents({
    click(e) {
      if (activeTab === "pois" && !isEditingPoi) {
        // 📍 Click trên map khi đang ở tab POIs
        setNewPoiPos([e.latlng.lat, e.latlng.lng]);
        setSelectedPoi({
          name: "",
          type: POIType.MAIN,
          lat: e.latlng.lat,
          lng: e.latlng.lng,
          description: "",
        });
        setIsEditingPoi(true); // Mở form
      }
    },
  });
  return null;
};
```

**Luồng:**

1. **Click trên map** (khi activeTab === "pois")
2. **Tạo marker tạm** (`newPoiPos`)
3. **Mở form edit** với tọa độ từ click
4. **Nhập info POI** → **Lưu** → POI được tạo

---

## 🚨 VẤN ĐỀ CẦN FIX

### **1. VẤN ĐỀ ĐĂNG NHẬP**

**Tệp**: [src/App.tsx](src/App.tsx#L60)

```typescript
const [loginEmail, setLoginEmail] = useState("adminisme"); // ❌ Sai!
const [loginPassword, setLoginPassword] = useState("password"); // ❌ Sai!
```

**Tệp**: [server.ts](server.ts#L23-L24)

```typescript
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com"; // Default
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "123"; // Default
```

**Vấn đề:**

- Frontend có default: `adminisme` / `password`
- Backend có default: `admin@example.com` / `123`
- **Không khớp nhau!**

**Giải pháp:**

```typescript
// Cách 1: Cập nhật frontend
const [loginEmail, setLoginEmail] = useState("admin@example.com");
const [loginPassword, setLoginPassword] = useState("123");

// Cách 2: Hoặc cập nhật backend
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "adminisme";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "password";

// Cách 3: Dùng .env file
ADMIN_EMAIL = adminisme;
ADMIN_PASSWORD = password;
```

---

### **2. VẤN ĐỀ HIỂN THỊ MAP MARKERS**

**Tệp**: [src/App.tsx](src/App.tsx#L38-L50)

```typescript
// ✅ Custom icon được định nghĩa
const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// ❌ Nhưng KHÔNG có tùy chỉnh icon dựa trên POIType
// Tất cả markers dùng icon mặc định (chấm đỏ)
```

**Vấn đề:**

- Emoji (📍, 🚻, 🎫, etc.) chỉ hiển thị trong SIDEBAR
- Map markers không biết loại POI → tất cả giống nhau
- **Không dễ phân biệt POI trên map**

**Giải pháp:**
Tạo custom markers dựa trên POI type:

```typescript
const createPoiMarker = (poiType: POIType) => {
  const iconMap: Record<POIType, string> = {
    [POIType.MAIN]: "📍",
    [POIType.WC]: "🚻",
    [POIType.TICKET]: "🎫",
    [POIType.PARKING]: "🅿️",
    [POIType.PORT]: "⚓",
  };

  const poiIcon = L.divIcon({
    html: `<div style="font-size: 24px;">${iconMap[poiType]}</div>`,
    className: "custom-poi-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

  return poiIcon;
};

// Sử dụng:
<Marker
  position={[poi.lat, poi.lng]}
  icon={createPoiMarker(poi.type)}  // ← Icon tùy chỉnh
>
```

---

### **3. VẤN ĐỀ CẢNH BÁO TAILWINDCSS**

**Tệp**: [package.json](package.json#L11)

```json
"@tailwindcss/vite": "^4.1.14",
```

Tailwind v4 có cú pháp CSS mới (CSS layer), cần đảm bảo [src/index.css](src/index.css) cấu hình đúng.

---

## 📊 SƠ ĐỒ TƯƠNG TÁC HOÀN CHỈNH

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERACTION FLOW                     │
└─────────────────────────────────────────────────────────────┘

1️⃣  LOAD APLIKASI
   index.html → main.tsx → App.tsx
                              ↓
                         isLoggedIn = false
                              ↓
                        Hiển thị LoginPage

2️⃣  ĐĂNG NHẬP
   User nhập email/password
        ↓
   Nhấn "Đăng nhập"
        ↓
   handleLogin() → POST /api/auth/login
        ↓
   Server check credentials
        ├─ ✅ Đúng → res.json({ token })
        └─ ❌ Sai → res.status(401).json({ error })
        ↓
   Frontend: setIsLoggedIn(true)
        ↓
   Dashboard render

3️⃣  DASHBOARD - QUẢN LÝ POIs
   a) Xem danh sách:
      - fetchPois() → GET /api/pois
      - Render POIs trong sidebar

   b) Tạo POI mới:
      - Click map → MapEvents.click()
      - Hiện marker tạm (newPoiPos)
      - Mở form edit
      - Nhập thông tin → Click "Lưu"
      - POST /api/pois {name, type, lat, lng, description}
      - Marker xuất hiện trên map

   c) Chỉnh sửa POI:
      - Click POI card → selectedPoi
      - Click Edit button
      - Form hiện với thông tin cũ
      - Sửa → Click "Lưu"
      - PUT /api/pois/{id} {updates}
      - Map update

   d) Xóa POI:
      - Click Delete button
      - DELETE /api/pois/{id}
      - POI biến mất

4️⃣  DASHBOARD - QUẢN LÝ TOURS
   a) Xem danh sách:
      - fetchTours() → GET /api/tours
      - Render Tours trong sidebar

   b) Tạo Tour mới:
      - Click "+" button → setIsCreatingTour(true)
      - Mở form tạo tour
      - Nhập tour title
      - Click POIs để chọn (theo thứ tự)
      - Click "Lưu lộ trình"
      - POST /api/tours {title, poi_ids: [...]}
      - Tour được tạo
      - Polyline tự động vẽ trên map

   c) Xóa Tour:
      - Click Delete button
      - DELETE /api/tours/{id}
      - Tour biến mất
      - Polyline biến mất

5️⃣  MAP DISPLAY
   - Center: [16.047, 108.206] (Đà Nẵng)
   - Zoom: 13
   - TileLayer: CartoDB Dark
   - Markers: POIs (tất cả dùng default red marker)
   - Polyline: Tours (xanh lá, gạch ngang, khi activeTab = "tours")
   - Legend: Dưới trái (emoji + type)

6️⃣  ĐĂNG XUẤT
   - Click "Đăng xuất"
   - setIsLoggedIn(false)
   - Quay lại LoginPage
```

---

## 📁 CẤU TRÚC FILE

```
do-an-seminar/
├── index.html                  ← Entry point HTML
├── src/
│   ├── main.tsx               ← React entry (mount App)
│   ├── App.tsx                ← Main component (login + dashboard)
│   ├── types.ts               ← Type definitions (POI, Tour, POIType)
│   ├── index.css              ← Global styles
│   ├── components/
│   │   ├── LoginPage.tsx      ← Login form UI
│   │   ├── Toast.tsx          ← Toast notification
│   │   └── LoadingSpinner.tsx ← Loading indicator
│   ├── hooks/
│   │   ├── useAuth.ts         ← Auth logic (không dùng, deprecated)
│   │   └── useApi.ts          ← API helper (không dùng, deprecated)
│   └── utils/
│       ├── api.ts             ← Fetch wrapper (không dùng, deprecated)
│       └── validation.ts      ← POI/Tour validation
├── server.ts                  ← Express backend + auth + API
├── data.db                    ← SQLite database
├── package.json               ← Dependencies
├── tsconfig.json              ← TypeScript config
├── tsconfig.server.json       ← Server TS config
└── README.md                  ← Documentation
```

---

## 🔗 API ENDPOINTS

### **Authentication**

- `POST /api/auth/login` - Đăng nhập
  - Body: `{email, password}`
  - Response: `{token}`

### **POIs**

- `GET /api/pois` - Lấy danh sách POIs
- `POST /api/pois` - Tạo POI mới
- `PUT /api/pois/:id` - Cập nhật POI
- `DELETE /api/pois/:id` - Xóa POI

### **Tours**

- `GET /api/tours` - Lấy danh sách Tours
- `POST /api/tours` - Tạo Tour mới
- `PUT /api/tours/:id` - Cập nhật Tour
- `DELETE /api/tours/:id` - Xóa Tour

---

## 🎯 KẾT LUẬN

**Luồng đăng nhập:**

```
LoginPage → handleLogin() → POST /api/auth/login → verify creds →
setIsLoggedIn(true) → Dashboard render → fetchPois/fetchTours
```

**Hiển thị map:**

- Leaflet MapContainer + TileLayer (CartoDB Dark)
- Markers: Tất cả POIs (red default, không phân biệt type)
- Polyline: Tours (xanh, gạch ngang, chỉ khi tab = "tours")
- Legend: Emoji + type (dưới trái)

**Cách dấu vết:**

- POI: Click map (tạo) → form → save → marker + list
- Tour: Select POIs + title → form → save → polyline

**Vấn đề chính:**

1. ❌ Email/password default không khớp
2. ❌ Map markers không hiển thị emoji/icon theo type
3. ✅ Chức năng CRUD hoạt động tốt

```

```
