# PRD v1.7 — POI & Tour Admin Dashboard + Business Portal + Tour Constraints + Edit/Delete Workflows (UPDATED)

**Version:** 1.7 (Cập nhật từ v1.6 - Thêm Tour Constraints, Edit/Delete Workflows, Admin Permission Tightening)
**Trạng thái:** Draft — Chờ xác nhận
**Ngày cập nhật:** 2026-03-20
**Tác giả:** Senior BA / PO

---

## 📋 Changelog v1.6 → v1.7 — **THÊM TOUR CONSTRAINTS + EDIT/DELETE WORKFLOWS + ADMIN PERMISSION UPDATE**

| #       | Hạng mục                                                          | Thay đổi v1.6 → v1.7                                                                                                              |
| ------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **C26** | **📍 Ràng buộc hiển thị Tour: Chỉ POI Approved**                  | **Chỉ POI status = `Approved` mới hiển thị trên bản đồ. Chỉ POI `Approved` mới có thể thêm vào Tour.**                            |
| **C27** | **🚫 Cấm thao tác POI khi đã nằm trong Tour**                     | **POI nằm trong ≥1 Tour → DISABLE nút Edit/Delete (cả Admin & Doanh nghiệp). Xóa quy tắc Cascade Deletion cũ.**                   |
| **C28** | **👮 Quyền hạn Admin: Không edit POI doanh nghiệp**               | **Admin KHÔNG SỬA POI của doanh nghiệp. Chỉ Approve hoặc Reject. Doanh nghiệp gửi yêu cầu chỉnh sửa/xóa qua hệ thống.**           |
| **C29** | **🔄 Luồng Edit/Delete POI Approved: Gửi yêu cầu (Request Flow)** | **Doanh nghiệp bấm Edit/Delete POI `Approved` → Tạo Request (status = Pending), POI gốc VẪN GIỮ Approved. Admin duyệt/từ chối.**  |
| **C30** | **✏️ Admin duyệt yêu cầu Sửa POI**                                | **Lưu dữ liệu mới, xóa audio cũ, sinh audio mới tiếng Việt. Status = `Approved`.**                                                |
| **C31** | **🗑️ Admin duyệt yêu cầu Xóa POI**                                | **Xóa POI khỏi DB, xóa tất cả file audio. Gửi thông báo doanh nghiệp. (POI không thể là trong Tour vì Delete button bị disable)** |

> Các thay đổi từ v1.0 → v1.6 vẫn còn hiệu lực, CỘNG THÊM các Business Rules mới ở v1.7.

---

## Mục lục

1. [Overview & Goals](#1-overview--goals)
2. [In-scope / Out-of-scope](#2-in-scope--out-of-scope-mvp)
3. [Personas / Roles](#3-personas--roles)
4. [Màn hình & Luồng UI](#4-màn-hình--luồng-ui) ⭐ **CẬP NHẬT**
5. [User Stories](#5-user-stories) ⭐ **CẬP NHẬT**
6. [Business Rules](#6-business-rules) ⭐ **MỚI v1.7**
7. [Functional Requirements](#7-functional-requirements) ⭐ **CẬP NHẬT**
8. [Acceptance Criteria](#8-acceptance-criteria-given-when-then) ⭐ **CẬP NHẬT**
9. [Non-functional Requirements](#9-non-functional-requirements)
10. [Data Requirements & DB Schema](#10-data-requirements--db-schema)
11. [API Specification](#11-api-specification) ⭐ **CẬP NHẬT**

---

## 1. Overview & Goals

**Mục tiêu chính:**

- Quản lý POI & Tour từ Admin Dashboard
- Doanh nghiệp tạo & quản lý POI của họ
- Hệ thống phê duyệt chặt chẽ (Pending → Approved → Rejected hoặc Edit/Delete requests)
- **Mới:** Ràng buộc Tour: Chỉ POI Approved + Cấm Edit/Delete khi POI trong Tour
- **Mới:** Luồng yêu cầu sửa/xóa: Doanh nghiệp gửi request, Admin duyệt
- **Mới:** Admin không được trực tiếp sửa POI doanh nghiệp

---

## 2. In-scope / Out-of-scope (MVP)

### ✅ In-scope

**Modules 1–5:** Giữ nguyên từ v1.6, CỘNG THÊM:

- **Module 4 — 🏢 Cổng Doanh nghiệp (Business Portal)** _(Cập nhật v1.7)_:
  - **Doanh nghiệp tạo POI mới (status = `Pending`)** → Admin duyệt
  - **Doanh nghiệp quản lý POI:**
    - `Pending`: Edit, Delete, Submit → Pending
    - `Approved`: **Mới** → Cannot directly edit/delete
      - **Mới:** Bấm Edit → Tạo request chỉnh sửa (POI → Pending, save request)
      - **Mới:** Bấm Delete → Tạo request xóa (POI → Pending, save request)
    - `Rejected`: Edit (→ Pending), Delete, Resubmit
    - **Mới:** POI trong ≥1 Tour → Disable Edit/Delete (tooltip: "POI đang nằm trong Tour")

- **Module 5 — 😊 Luồng Phê duyệt POI & Quản lý Doanh nghiệp** _(Cập nhật v1.7)_:
  - **Admin Sidebar:** 3 tab: POIs, Tours, 🏢 Doanh nghiệp (Sub-menu: POIs chờ duyệt)
  - **POIs chờ duyệt:**
    - Danh sách POI `Pending` từ tất cả doanh nghiệp
    - Nút Duyệt + Nút Từ chối (giữ nguyên v1.6)
    - **Mới:** Nút Edit (+) để xem request chỉnh sửa/xóa kèm theo
  - **Mới - Admin không sửa POI doanh nghiệp:**
    - Admin KHÔNG ĐƯỢC phép bấm Edit trên POI doanh nghiệp
    - Nút Edit chỉ dùng để xem request details
    - Chỉ Duyệt/Từ chối request

- **Module 6 — 🎧 Hệ thống Âm thanh (Audio/TTS)** _(Cập nhật v1.7)_:
  - Audio trigger chỉ khi status = `Approved`
  - **Mới:** Khi Admin duyệt request sửa POI Approved → Xóa audio cũ + Tạo audio mới
  - Khi Admin duyệt request xóa POI → Xóa audio

- **Module 7 — 🎯 Tour Management** _(Cập nhật v1.7)_:
  - **Mới:** Chỉ POI `Approved` mới hiển thị & thêm vào Tour
  - **Mới:** POI ✅ Approved + 🔒 In Tour → Disable Edit/Delete

### ❌ Out-of-scope (MVP)

- Archive/Soft Delete POI
- POI versioning history
- Bulk edit/operations
- Advanced analytics

---

## 3. Personas / Roles

### Admin

- Quản lý POI, Tour, doanh nghiệp
- **Mới:** Duyệt request Sửa/Xóa POI từ doanh nghiệp
- **Mới:** KHÔNG sửa trực tiếp POI doanh nghiệp
- Trigger TTS audio

### Business User

- Tạo & quản lý POI của doanh nghiệp
- **Mới:** Gửi request sửa/xóa POI Approved (thay vì sửa trực tiếp)
- Xem thông báo phê duyệt & lý do từ chối

### End User (Tourist)

- Xem POI `Approved` trên bản đồ
- Lắng nghe audio hướng dẫn

---

## 4. Màn hình & Luồng UI

### 4.1 Màn hình Login

Giữ nguyên từ v1.6

---

### 4.2 Layout chính (post-login) — Light mode

Sidebar Admin: 3 tab chính (giữ nguyên)

- POIs
- Tours
- 🏢 Doanh nghiệp (+ sub-menu)

---

### 4.3 Tab POIs — Admin quản lý POI Admin tạo

Giữ nguyên từ v1.6

---

### 4.4 Tab Tours — Admin quản lý Tour

**CẬP NHẬT v1.7:**

- **Khi add POI vào Tour:** Chỉ hiển thị danh sách POI `Approved` (bỏ Pending, Rejected)
- **POI đã trong Tour:** Disable nút Edit/Delete với tooltip "POI đang nằm trong Tour, không thể chỉnh sửa hoặc xóa"

---

### **4.5 Tab 🏢 Doanh nghiệp — CHI TIẾT (Cập nhật v1.7)**

**Sub-tab 1: Danh sách Doanh nghiệp** → Giữ nguyên v1.6

**Sub-tab 2: POIs chờ duyệt — Cập nhật v1.7**

Main area hiển thị danh sách POI `Pending`:

- Mỗi item: Tên POI + Loại + Owner + Status badge
- **2 nút action:**
  - Nút "Chi tiết" (xem thông tin POI + Request nếu là yêu cầu Sửa/Xóa)
  - Nút "Từ chối" (quick action)

**Khi click "Chi tiết" trên POI:**

Slide-in panel từ phải:

- **Phần 1: Thông tin POI**
  - Tên, Loại, Mô tả, Tọa độ, Bán kính, Ảnh
  - Owner (doanh nghiệp)

- **Phần 2: Request Details (Mới v1.7)**
  - **Nếu là POI mới (Pending):**
    - Badge: "🆕 Yêu cầu tạo mới"
    - Nút "Duyệt" → Approved + Trigger TTS
    - Nút "Từ chối" → Dialog lý do

  - **Nếu là yêu cầu Sửa (Edit Request):**
    - Badge: "✏️ Yêu cầu chỉnh sửa"
    - **2 bộ thông tin so sánh:**
      - Thông tin cũ (Approved) - ĐẶC HÀI MẠI
      - Thông tin mới (từ form edit của doanh nghiệp) - CẦN DUYỆT
    - Nút "Duyệt chỉnh sửa" → Lưu dữ liệu mới, xóa audio cũ, trigger TTS mới
    - Nút "Từ chối" → Dialog lý do (POI trở lại Approved)

  - **Nếu là yêu cầu Xóa (Delete Request):**
    - Badge: "🗑️ Yêu cầu xóa"
    - "Doanh nghiệp yêu cầu xóa POI này. POI hiện không nằm trong Tour nào (vì Delete button chỉ enabled khi POI không trong Tour). Nếu xác nhận, POI sẽ bị xóa khỏi hệ thống."
    - Nút "Duyệt xóa" → Xóa POI, xóa audio
    - Nút "Từ chối" → Dialog lý do (POI trở lại Approved)

- **Phần 3: Action Buttons**
  - Nút Duyệt (hoặc "Duyệt chỉnh sửa" / "Duyệt xóa")
  - Nút Từ chối
  - Nút Đóng

---

### 4.6 Business Dashboard (Business Portal) — Cập nhật v1.7

#### Tab POIs

**3 Section theo Status:**

**1️⃣ Phần "Chờ duyệt (Pending)"**

- Mỗi POI: Tên + Loại + Nút Edit + Nút Delete + Nút Submit
- Giữ nguyên v1.6

**2️⃣ Phần "Đã duyệt (Approved)" — CẬP NHẬT v1.7**

- Mỗi POI: Tên + Loại + Status badge (xanh)
- **Thay đổi từ v1.6 (Read-only) → v1.7 (Có thể gửi request):**
  - **Nút "Sửa":** Bấm mở form chỉnh sửa
    - Nếu POI `NOT IN ANY TOUR`: Form chỉnh sửa hoạt động bình thường
      - Save → Tạo Edit Request (request status = Pending), POI gốc VẪN Approved
      - Admin sẽ xem & duyệt request
    - Nếu POI `IN AT LEAST 1 TOUR`: **Disable nút Edit** + Tooltip: "POI đang nằm trong Tour, vui lòng liên hệ Admin để gỡ khỏi Tour trước khi chỉnh sửa"
  - **Nút "Xóa":**
    - Nếu POI `NOT IN ANY TOUR`: Bấm xóa → Dialog xác nhận
      - Xác nhận → Tạo Delete Request (request status = Pending), POI gốc VẪN Approved
      - Admin sẽ xem & duyệt request
    - Nếu POI `IN AT LEAST 1 TOUR`: **Disable nút Delete** + Tooltip: "POI đang nằm trong Tour, vui lòng liên hệ Admin để gỡ khỏi Tour trước khi xóa"

**3️⃣ Phần "Bị trả về (Rejected)" — Giữ nguyên v1.6**

- Mỗi POI: Tên + Loại + Status badge (đỏ) + Lý do từ chối
- Nút Edit (→ Pending), Delete

---

## 5. User Stories

### **US-22–US-35: Giữ nguyên từ v1.6**

### **US-36–US-40: Luồng Edit/Delete Request (MỚI v1.7)**

| ID                 | Module   | Tôi muốn...                                                  | Để...                                                    | Priority |
| ------------------ | -------- | ------------------------------------------------------------ | -------------------------------------------------------- | -------- |
| **US-36** ✅ _mới_ | Business | Gửi yêu cầu chỉnh sửa POI Approved thay vì sửa trực tiếp     | Admin kiểm tra & duyệt thay đổi                          | Must     |
| **US-37** ✅ _mới_ | Business | Gửi yêu cầu xóa POI Approved thay vì xóa trực tiếp           | Admin kiểm tra & duyệt xóa                               | Must     |
| **US-38** ✅ _mới_ | Admin    | Xem yêu cầu chỉnh sửa từ doanh nghiệp kèm thông tin cũ & mới | Duyệt hoặc từ chối chỉnh sửa có căn cứ                   | Must     |
| **US-39** ✅ _mới_ | Admin    | Xem yêu cầu xóa từ doanh nghiệp                              | Duyệt hoặc từ chối xóa                                   | Must     |
| **US-40** ✅ _mới_ | Business | Disable Edit/Delete khi POI nằm trong Tour                   | Đảm bảo Tour không bị phá vỡ khỏi TOUR thay đổi ngoài kế | Must     |

---

## 6. Business Rules

### **BR-01: Ràng buộc Hiển thị & Thêm vào Tour**

```
RULE: Only Approved POIs
IF POI.status != "Approved"
  THEN
    - Not visible on map
    - Cannot add to Tour
    - Not in POI selection list when creating/editing Tour
```

**Hậu quả:** Pending và Rejected POIs hoàn toàn ẩn khỏi bản đồ và workflow Tour.

---

### **BR-02: Cấm Edit/Delete POI khi trong Tour (Thay thế Cascade Deletion cũ)**

```
RULE: Disable Edit/Delete if POI in Tour
IF POI.id IN ANY(tour_pois.poi_id)
  THEN
    - Disable Edit button (gray out + tooltip)
    - Disable Delete button (gray out + tooltip)
    - Tooltip message: "POI đang nằm trong [Tour names], không thể chỉnh sửa hoặc xóa"
APPLIES TO: Both Admin and Business User
```

**Hậu quả:**

- Cascade Deletion của v1.0 bị **bỏ**
- POI được bảo vệ khỏi thay đổi không lường trước khi đang được sử dụng trong Tour
- Nếu cần sửa/xóa: Admin phải gỡ POI khỏi Tour trước, hoặc xóa Tour

---

### **BR-03: Admin Không Được Sửa POI Doanh Nghiệp**

```
RULE: Admin Cannot Edit Business POIs
IF POI.owner_id IS NOT NULL (created by business)
  THEN
    - Admin cannot modify POI data (name, description, location, etc.)
    - Admin can only: Approve | Reject | View Edit/Delete requests
    - Edit button hidden/disabled for business-owned POIs
APPLIES TO: Admin editing POI details, NOT request approval
```

**Hậu quả:**

- Admin không có quyền chỉnh sửa trực tiếp POI doanh nghiệp
- Tất cả thay đổi phải đi qua workflow "Edit Request"

---

### **BR-04: Request Flow cho Edit/Delete POI Approved**

```
RULE: Edit/Delete Requests for Approved POIs (CẬP NHẬT v1.7)
TRIGGER: Business user clicks Edit/Delete on Approved POI

FOR EDIT REQUEST (POI NOT in Tour):
  1. Business submits form with edited data
  2. System creates EditRequest with state="PENDING" containing new_data (JSON)
  3. POI original record in pois table REMAINS UNCHANGED
     → status stays "Approved"
     → POI still visible on map with original info
  4. When Admin approves Edit Request:
     → Overwrites POI data in pois table with new_data from EditRequest
     → Deletes old audio file
     → Triggers TTS to generate new audio
     → EditRequest.state = "APPROVED"
  5. When Admin rejects: POI unchanged, EditRequest.state = "REJECTED"

FOR DELETE REQUEST (POI NOT in Tour):
  1. Business requests deletion (button only enabled if POI not in any Tour)
  2. System creates DeleteRequest with state="PENDING"
     → POI status becomes "Pending" (may become hidden per BR-01 during approval wait)
  3. When Admin approves Delete Request:
     → Deletes POI from pois table
     → Deletes all associated audio files
     → DeleteRequest.state = "APPROVED"
  4. When Admin rejects: POI.status reverts to "Approved", DeleteRequest.state = "REJECTED"
```

**Hậu quả:**

- Edit Request: POI remains Approved during approval process, not hidden from map
- Delete Request: POI briefly becomes Pending during approval wait
- POI data never changed without Admin approval
- Delete button only enabled for POI NOT in Tour (no orphan issue)

---

### **BR-05: Delete Request Cannot Contain POI in Tour (CONSTRAINT v1.7)**

```
RULE: Delete Request Safety Constraint
IF POI.id IN any(tour_pois.poi_id)
  THEN Delete button is DISABLED (UI prevents creating DeleteRequest)
  ENDIF

CONSEQUENCE:
  - DeleteRequest.poi_id will NEVER reference a POI in any Tour
  - When Admin approves DeleteRequest:
    → Only need to delete POI from pois table & audio files
    → No need to delete tour_pois entries (will be none or already handled)
  - This prevents orphaning Tours by deleting POIs
```

**Hậu quả:**

- POI safety fully protected: Cannot be deleted if in active Tour
- Request workflow cleaner: No cascade or cleanup logic needed
- Admin approves delete with confidence: POI not part of any Tour

---

### **BR-06: Audio Management trong Edit/Delete Requests**

```
RULE: Audio handling for Edit/Delete requests
WHEN Admin approves Edit Request (POI sửa description)
  DO:
    - Lấy new_data từ EditRequest
    - Ghi đè vào POI record (name, description, location, etc.)
    - Xóa file audio cũ
    - Trigger TTS để sinh audio mới từ description updated

WHEN Admin approves Delete Request
  DO:
    - Xóa POI khỏi pois table
    - Xóa tất cả audio files

WHEN doanh nghiệp edits POI Approved
  RULE: Do NOT trigger TTS ngay
  (Chỉ tạo EditRequest, chờ Admin duyệt)
```

**Hậu quả:**

- Audio luôn đồng bộ với POI status & content được duyệt
- Xóa POI sạch sẽ (audio cũng bị xóa)
- POI không bao giờ mất tích khỏi Tour

---

### **BR-07: Notification & Audit Trail**

```
RULE: Transparent Communication
WHEN Admin approves/rejects Edit/Delete request
  NOTIFY business user with:
    - Request status (approved/rejected)
    - Reason (if rejected)
    - For Delete approved: Confirmation that POI is deleted
    - All notifications logged with timestamp & admin user
```

**Hậu quả:**

- Doanh nghiệp luôn biết trạng thái request của họ
- Audit trail đẩy đủ cho compliance
- Feedback lý do từ chối giúp doanh nghiệp cải thiện

---

## 7. Functional Requirements

### FR-01 to FR-06: Giữ nguyên từ v1.6

---

### **FR-07: 🏢 Business Portal — Quản lý POI Approved (CẬP NHẬT v1.7)**

| ID             | Requirement                                                                                                                            |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **FR-07.1** ✅ | **POI Approved: Chỉ Read-only trong v1.6, thay đổi v1.7 → Business có thể gửi request sửa/xóa**                                        |
| **FR-07.2** ✅ | **Nếu POI NOT in any Tour: Nút Edit/Delete hoạt động → Tạo Edit/Delete Request → POI gốc vẫn Approved, EditRequest có status Pending** |
| **FR-07.3** ✅ | **Nếu POI IN at least 1 Tour: Disable Edit/Delete nút → Tooltip: "POI đang trong Tour, không thể sửa/xóa"**                            |
| **FR-07.4** ✅ | **Rejected POI: Giữ nguyên v1.6 (Edit, Delete, Resubmit hoạt động bình thường)**                                                       |
| **FR-07.5** ✅ | **UI feedback: Hiển thị request status (Pending, Approved, Rejected) khi doanh nghiệp gửi request**                                    |

---

### **FR-08: 😊 Admin Workflow — Phê duyệt Request Sửa/Xóa (MỚI v1.7)**

| ID             | Requirement                                                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **FR-08.1** ✅ | **Admin không sửa trực tiếp POI doanh nghiệp: Edit button disabled/hidden**                                                  |
| **FR-08.2** ✅ | **Admin view "Edit Request": Hiển thị 2 version (cũ vs mới) để so sánh**                                                     |
| **FR-08.3** ✅ | **Duyệt Edit Request: Lấy `new_data` từ EditRequest, ghi đè vào pois, xóa audio cũ, trigger TTS mới, POI status = Approved** |
| **FR-08.4** ✅ | **Từ chối Edit Request: Dialog nhập lý do, POI trở lại Approved, gửi notification doanh nghiệp**                             |
| **FR-08.5** ✅ | **Admin view "Delete Request": Xác nhận danh sách Tour sẽ bị ảnh hưởng**                                                     |
| **FR-08.6** ✅ | **Duyệt Delete Request: Xóa POI khỏi DB, xóa audio, gửi notification**                                                       |
| **FR-08.7** ✅ | **Từ chối Delete Request: Dialog lý do, POI trở lại Approved**                                                               |

---

### **FR-09: 🎯 Tour Management — Ràng buộc POI (Cập nhật v1.7)**

| ID             | Requirement                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| **FR-09.1** ✅ | **Khi create/edit Tour: Danh sách POI chỉ hiển thị các POI status = Approved**                             |
| **FR-09.2** ✅ | **POI trong Tour: Disable Edit/Delete ở cả Admin POIs tab & Business Dashboard**                           |
| **FR-09.3** ✅ | **Tooltip for disabled button: "POI đang nằm trong [Tour A, Tour B], vui lòng gỡ khỏi Tour để chỉnh sửa"** |

---

### **FR-10: 🗂️ Request Management (MỚI v1.7)**

| ID              | Requirement                                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------------------------- |
| **FR-10.1** ✅  | **Backend: Create `edit_requests` & `delete_requests` tables**                                                 |
| **FR-10.2** ✅  | **Schema: `edit_requests(id, poi_id, business_id, new_data, state, created_at, rejected_reason, updated_at)`** |
| **FR-10.3** ✅  | **Schema: `delete_requests(id, poi_id, business_id, state, created_at, rejected_reason, updated_at)`**         |
| **FR-10.4** ✅  | **API: POST /api/businesses/pois/:id/request-edit → Create EditRequest**                                       |
| **FR-10.5** ✅  | **API: POST /api/businesses/pois/:id/request-delete → Create DeleteRequest**                                   |
| **FR-10.6** ✅  | **API: GET /api/admin/requests/edit (pending) → List pending Edit Requests**                                   |
| **FR-10.7** ✅  | **API: GET /api/admin/requests/delete (pending) → List pending Delete Requests**                               |
| **FR-10.8** ✅  | **API: PUT /api/admin/requests/edit/:id/approve → Apply edit, trigger TTS**                                    |
| **FR-10.9** ✅  | **API: PUT /api/admin/requests/edit/:id/reject → Reject with reason**                                          |
| **FR-10.10** ✅ | **API: PUT /api/admin/requests/delete/:id/approve → Delete POI, audio**                                        |
| **FR-10.11** ✅ | **API: PUT /api/admin/requests/delete/:id/reject → Reject with reason**                                        |

---

## 8. Acceptance Criteria

| US    | Scenario                                | Given                               | When                                       | Then                                                                   |
| ----- | --------------------------------------- | ----------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------- |
| US-36 | Doanh nghiệp gửi request sửa POI Appr.  | POI Approved NOT in Tour            | Bấm Edit trên POI → sửa → Lưu              | EditRequest tạo (status=Pending), POI gốc vẫn Approved, Admin xem được |
| US-36 | Request Edit bị disable khi POI in Tour | POI Approved IN 1+ Tour             | Bấm Edit trên POI                          | Button disable + tooltip "đang trong Tour X"                           |
| US-37 | Doanh nghiệp gửi request xóa POI Appr.  | POI Approved NOT in Tour            | Bấm Delete → xác nhận                      | POI Pending + DeleteRequest tạo, Admin xem được                        |
| US-37 | Request Delete bị disable khi POI in T. | POI Approved IN 1+ Tour             | Bấm Delete trên POI                        | Button disable + tooltip "đang trong Tour X"                           |
| US-38 | Admin view Edit Request + compare       | EditRequest pending, POI Approved   | Admin click "Chi tiết" trên Edit Request   | Show cũ vs mới, nút "Duyệt chỉnh sửa" & "Từ chối"                      |
| US-38 | Admin duyệt Edit Request                | Admin xem Edit Request details      | Bấm "Duyệt chỉnh sửa"                      | Apply data, delete old audio, trigger TTS, POI Approved, notification  |
| US-39 | Admin view Delete Request               | DeleteRequest pending               | Admin click "Chi tiết" trên Delete Request | Confirm POI info + Tours affected, nút "Duyệt xóa" & "Từ chối"         |
| US-39 | Admin duyệt Delete Request              | Admin xem Delete Request details    | Bấm "Duyệt xóa"                            | Delete POI, audio khỏi DB, gửi notification doanh nghiệp               |
| US-40 | POI disable Edit/Delete khi in Tour     | POI Approved đang trong 1+ Tour     | Admin hoặc Business xem POI                | Edit & Delete button disabled + tooltip "POI trong Tour"               |
| US-40 | POI enable Edit/Delete sau khi gỡ Tour  | POI Approved từng in Tour, Admin gỡ | Admin gỡ POI khỏi Tour, reload             | Edit & Delete button enable lại, doanh nghiệp có thể yêu cầu sửa/xóa   |

---

## 9. Non-functional Requirements

### NFR-01: Performance

- POI list with status filter: < 200ms
- Tour list with Approved POI only: < 300ms
- Request approval: < 500ms

### NFR-02: Data Consistency

- All audio files deleted when POI deleted
- All request records preserved for audit
- Tour integrity: POI in Tour cannot be orphaned

### NFR-03: Security

- Business users can only access their own POIs
- Admin token required for all admin operations
- Request approvals logged with admin user + timestamp

---

## 10. Data Requirements & DB Schema

### Tables (v1.7 Updates)

```sql
-- Existing table - giữ nguyên
CREATE TABLE pois (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  description TEXT,
  radius INTEGER DEFAULT 0,
  image TEXT,
  status TEXT DEFAULT 'Pending', -- Pending, Approved, Rejected
  owner_id INTEGER, -- NULL = Admin created, NOT NULL = Business created
  reject_reason TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES businesses(id)
);

-- New for v1.7: Edit Requests
CREATE TABLE edit_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poi_id INTEGER NOT NULL,
  business_id INTEGER NOT NULL,
  new_data JSON, -- { name, description, lat, lng, radius, image }
  state TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  rejected_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (poi_id) REFERENCES pois(id),
  FOREIGN KEY (business_id) REFERENCES businesses(id)
);

-- New for v1.7: Delete Requests
CREATE TABLE delete_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poi_id INTEGER NOT NULL,
  business_id INTEGER NOT NULL,
  state TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  rejected_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (poi_id) REFERENCES pois(id),
  FOREIGN KEY (business_id) REFERENCES businesses(id)
);

-- Existing - not changed
CREATE TABLE tour_pois (
  tour_id INTEGER,
  poi_id INTEGER,
  position INTEGER,
  PRIMARY KEY (tour_id, poi_id),
  FOREIGN KEY (tour_id) REFERENCES tours(id),
  FOREIGN KEY (poi_id) REFERENCES pois(id)
);
```

---

## 11. API Specification

### Existing Endpoints (v1.6 - giữ nguyên)

```
GET    /api/admin/pois/pending
PUT    /api/pois/:id/approve
PUT    /api/pois/:id/reject
GET    /api/admin/businesses
GET    /api/admin/businesses/:id/pois
```

### New Endpoints (v1.7)

#### Business User - Request Edit/Delete

```
POST /api/businesses/pois/:id/request-edit
  Description: Create Edit Request for Approved POI
  Auth: business_token
  Body: {
    name: string,
    description: string,
    lat: number,
    lng: number,
    radius: number,
    image?: File
  }
  Response: { success: true, request_id: 123, state: "PENDING" }
  Side Effects: create edit_requests record with new_data

POST /api/businesses/pois/:id/request-delete
  Description: Create Delete Request for Approved POI
  Auth: business_token
  Body: {} (empty)
  Response: { success: true, request_id: 456, state: "PENDING" }
  Side Effects: create delete_requests record
```

#### Admin - Approve/Reject Requests

```
GET /api/admin/requests/edit/pending
  Description: List all pending Edit Requests
  Auth: admin_token
  Response: [{
    id: 123,
    poi_id: 10,
    poi: { id, name, type, lat, lng, description, radius, image, status, owner_id },
    business_id: 5,
    business_name: "Company A",
    new_data: { name, description, ... },
    state: "PENDING",
    created_at: timestamp
  }, ...]

GET /api/admin/requests/delete/pending
  Description: List all pending Delete Requests
  Auth: admin_token
  Response: [{
    id: 456,
    poi_id: 15,
    poi: { id, name, type, ... },
    business_id: 5,
    business_name: "Company A",
    state: "PENDING",
    tours_affected: [{ id: 1, title: "Tour A" }, ...],
    created_at: timestamp
  }, ...]

PUT /api/admin/requests/edit/:request_id/approve
  Description: Approve Edit Request - Apply new data, delete old audio, trigger TTS
  Auth: admin_token
  Body: {} (empty)
  Response: {
    success: true,
    poi_id: 10,
    status: "Approved",
    audio_generated: true
  }
  Side Effects:
    - Update POI with new_data
    - POI.status = "Approved"
    - Delete old audio file (if exists)
    - Trigger TTS API for new audio
    - Update edit_requests.state = "APPROVED"
    - Notify business user

PUT /api/admin/requests/edit/:request_id/reject
  Description: Reject Edit Request
  Auth: admin_token
  Body: { rejected_reason: "string (required)" }
  Response: { success: true, state: "REJECTED" }
  Side Effects:
    - POI.status = "Approved" (revert from Pending)
    - Update edit_requests.state = "REJECTED"
    - edit_requests.rejected_reason = value
    - Notify business user with reason

PUT /api/admin/requests/delete/:request_id/approve
  Description: Approve Delete Request - Delete POI, audio
  Auth: admin_token
  Body: {} (empty)
  Response: { success: true, poi_id: 15, deleted: true }
  Side Effects:
    - Delete POI from pois table
    - Delete all audio files in /uploads/audios/
    - Update delete_requests.state = "APPROVED"
    - Notify business user that POI is deleted

PUT /api/admin/requests/delete/:request_id/reject
  Description: Reject Delete Request
  Auth: admin_token
  Body: { rejected_reason: "string (required)" }
  Response: { success: true, state: "REJECTED" }
  Side Effects:
    - POI.status = "Approved" (revert from Pending)
    - Update delete_requests.state = "REJECTED"
    - delete_requests.rejected_reason = value
    - Notify business user with reason
```

#### Support - Check if POI in Tour

```
GET /api/pois/:id/tours
  Description: Check which Tours contain this POI
  Auth: none (public or admin_token)
  Response: {
    poi_id: 10,
    in_tours: [
      { id: 1, title: "Tour A", position: 2 },
      { id: 3, title: "Tour C", position: 5 }
    ]
  }
```

---

## Tóm tắt Thay đổi Chính (Summary)

### **✅ Tour Constraints**

- Chỉ POI `Approved` hiển thị trên bản đồ & thêm vào Tour
- POI trong Tour → Disable Edit/Delete (cả Admin & Business)

### **✅ Admin Permission Tightening**

- Admin KHÔNG sửa trực tiếp POI doanh nghiệp
- Chỉ duyệt/từ chối request từ doanh nghiệp

### **✅ Edit/Delete Request Workflow**

- Doanh nghiệp gửi request sửa/xóa POI Approved
- EditRequest/DeleteRequest có status Pending, chờ Admin duyệt
- Admin duyệt: Apply changes (nếu edit lấy new_data từ request), trigger TTS (nếu edit), delete nếu cần
- Admin từ chối: Lưu lý do, POI trở lại Approved

### **✅ Rules Enforcement**

- BR-01 to BR-06 đảm bảo tính toàn vẹn dữ liệu, Tour safety, Admin control

---

_END PRD v1.7_
