# 📊 Visual Workflow — PRD v1.7 Updated Status Flow + Request Workflows

## Overview: Three POI Paths in v1.7

```
┌─────────────────────────────────────────────────────────────────┐
│           THREE PATHS FOR POI LIFECYCLE (v1.7)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PATH 1: NEW POI                                                │
│  Business creates → Pending → Admin approves → Approved ✅      │
│                                                                  │
│  PATH 2: APPROVED POI - REQUEST EDIT                            │
│  POI Approved → Business requests edit → Pending                │
│  → Admin approves → Approved + new audio 🎧                     │
│                                                                  │
│  PATH 3: APPROVED POI - REQUEST DELETE                          │
│  POI Approved → Business requests delete → Pending              │
│  → Admin approves → Deleted + audio deleted 🗑️                  │
│                                                                  │
│  BLOCKER: POI IN TOUR                                           │
│  Approved POI in Tour → Edit/Delete DISABLED 🔒                 │
│  (Must remove from Tour first)                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## PATH 1: New POI Creation (Giữ nguyên v1.6)

```
┌─────────────────────────────────────────────────────────────────┐
│ Business User Creates New POI                                    │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
            ┌──────────────────────────────┐
            │  POST /api/businesses/pois   │
            │  Status = "Pending" (NOT Dft)│
            └──────────────────────────────┘
                            │
                            ▼
        ┌─────────────────────────────────┐
        │ Business Dashboard - Section 1  │
        │ ⏳ Chờ duyệt (Pending)          │
        │ [POI Card] Edit | Delete        │
        └─────────────────────────────────┘
```

---

## PATH 2: Approved POI - Request Edit (MỚI v1.7)

```
┌─────────────────────────────────────────────────────────────────┐
│ Business Dashboard - Section 2 (POI Approved)                   │
│ POI Status: ✅ Đã duyệt                                         │
└─────────────────────────────────────────────────────────────────┘
                            │
                   ┌────────┴────────┐
                   │                 │
        IN TOUR ──▼──    NOT IN TOUR─▼─
           🔒                  ✅
      ┌─────────────┐      ┌──────────────┐
      │ Edit DISABLE│      │ Edit ENABLED │
      │ Del DISABLE │      │ Del ENABLED  │
      │ Tooltip: ... │      │              │
      │ "Cannot edit"│      │ Bấm Edit → ? │
      └─────────────┘      └──────────────┘
                                   │
                                   ▼
                        ┌──────────────────────────┐
                        │ Business edits form      │
                        │ (name, desc, image, etc)│
                        │ [Save] [Cancel]          │
                        └──────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │ POST /businesses/pois/:id/   │
                    │ request-edit                  │
                    │ Body: { name, description... }
                    └──────────────────────────────┘
                                   │
                                   ▼
                    ✅ POI.status = Approved (UNCHANGED)
                    ✅ EditRequest.state = Pending
                    ✅ Edit data saved in EditRequest.new_data
                    ✅ POI still visible on map (with old info)
                    ✅ Admin see request to approve
                                   │
                                   ▼
        ┌─────────────────────────────────────┐
        │ Admin Dashboard - "POIs chờ duyệt"  │
        │ [📝 Edit Request] [POI Name]        │
        │ Owner: Company A                    │
        └─────────────────────────────────────┘
                                   │
                                   ▼
        ┌──────────────────────────────────────┐
        │ Admin clicks "Chi tiết"              │
        │ → Slide-in panel                     │
        │                                      │
        │ Badge: "✏️ Yêu cầu chỉnh sửa"       │
        │                                      │
        │ ┌────────────────────────────────┐  │
        │ │ Thông tin CŨ (Approved)        │  │
        │ │ Name: "Địa điểm A"             │  │
        │ │ Description: "Đây là..."       │  │
        │ └────────────────────────────────┘  │
        │                                      │
        │ ┌────────────────────────────────┐  │
        │ │ Thông tin MỚI (từ request)     │  │
        │ │ Name: "Địa điểm A (updated)"   │  │
        │ │ Description: "Đây là... [new]" │  │
        │ └────────────────────────────────┘  │
        │                                      │
        │ [Duyệt chỉnh sửa] [Từ chối]        │
        └──────────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
         APPROVE                 REJECT
         PUT /admin/             Dialog
         requests/edit/          reason
         :id/approve             input
              │                     │
              ▼                     ▼
    ✅ Lấy new_data từ   ❌ POI → Approved
       EditRequest          ❌ Request → REJECTED
    ✅ Ghi đè vào POI      ❌ Store reason
    ✅ Delete old audio   ❌ Notify business
    ✅ Trigger TTS mới
    ✅ POI → Approved
    ✅ Notify business         │
         │                     │
         ▼                     ▼
   POI in "Approved"    POI in "Approved"
   section (refreshed)  section (unchanged)
   Audio updated        Biz sees rejection reason
   (Map updated)
```

---

## PATH 3: Approved POI - Request Delete (MỚI v1.7)

```
┌─────────────────────────────────────────────────────────────────┐
│ Business Dashboard - Section 2 (POI Approved)                   │
│ POI Status: ✅ Đã duyệt                                         │
└─────────────────────────────────────────────────────────────────┘
                            │
                   ┌────────┴────────┐
                   │                 │
        IN TOUR ──▼──    NOT IN TOUR─▼─
           🔒                  ✅
      ┌─────────────┐      ┌──────────────┐
      │ Del DISABLE │      │ Del ENABLED  │
      │ Tooltip: ...│      │              │
      │ "Cannot del"│      │ Bấm Delete → │
      └─────────────┘      └──────────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │ Dialog xác nhận       │
                        │ "Xóa POI này?"        │
                        │ [Xác nhận] [Hủy]     │
                        └──────────────────────┘
                                   │
                        ┌──────────┴─────────┐
                        │                    │
                       YES                   NO
                        │                    │
                        ▼                    ▼
            POST /businesses/pois   Cancel
            /:id/request-delete     (nothing)
                        │
                        ▼
            ✅ POI.status = "Pending"
            ✅ Create delete_requests record
            ✅ Show "Request submitted"
                        │
                        ▼
        ┌─────────────────────────────────────┐
        │ Admin Dashboard - "POIs chờ duyệt"  │
        │ [🗑️ Delete Request] [POI Name]     │
        │ Owner: Company A                    │
        └─────────────────────────────────────┘
                        │
                        ▼
        ┌──────────────────────────────────────┐
        │ Admin clicks "Chi tiết"              │
        │ → Slide-in panel                     │
        │                                      │
        │ Badge: "🗑️ Yêu cầu xóa"             │
        │                                      │
        │ POI: [name, type, owner, ...]       │
        │                                      │
        │ Note: POI is NOT in any Tour        │
        │ (Delete button only enabled if      │
        │  POI not in Tours)                  │
        │                                      │
        │ If deleted, POI will be permanently │
        │ deleted from system and database.   │
        │                                      │
        │ [Duyệt xóa] [Từ chối]               │
        └──────────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
         APPROVE                 REJECT
         PUT /admin/             Dialog
         requests/delete/        reason
         :id/approve             input
              │                    │
              ▼                    ▼
    ✅ Delete POI      ❌ POI → Approved
    ✅ Delete audio    ❌ Request → REJECTED
    ✅ Notify biz      ❌ Store reason
       with confirm    ❌ Notify biz
              │                  │
              ▼                  ▼
          POI GONE        POI "Approved"
         from system      (unchanged)
         & map            Biz sees reason
```

---

## Blocker: POI In Tour (CENTRAL RULE v1.7)

```
┌─────────────────────────────────────────────────────────────────┐
│              EDIT/DELETE DISABLED WHEN IN TOUR                   │
└─────────────────────────────────────────────────────────────────┘

QUERY: SELECT COUNT(*) FROM tour_pois WHERE poi_id = ?
RESULT: count > 0 → DISABLE BUTTONS

┌─────────────────────────────┐
│ POI Card (Business view)     │
│                              │
│  Name: "Điểm tham quan A"   │
│  Status: ✅ Đã duyệt        │
│                              │
│  [Sửa]  [Xóa]               │  ← Giữ nguyên (v1.6)
│  (enabled)                   │
│                              │
│                              │
│  ...Later, POI added to Tour │
│                              │
│  [Sửa]  [Xóa]               │  ← v1.7: DISABLED!
│  🔒     🔒                   │
│                              │
│  Tooltip on hover:           │
│  "POI đang nằm trong:        │
│   - Tour A                    │
│   - Tour C                    │
│   Vui lòng gỡ khỏi Tour để  │
│   chỉnh sửa/xóa"             │
│                              │
└─────────────────────────────┘

DATA MODEL:
┌────────────────┐         ┌──────────────┐
│   pois         │         │ tour_pois    │
├────────────────┤         ├──────────────┤
│ id (10) ───────┼─────┬──→│ poi_id (10)  │
│ status: Appr.  │     │   │ tour_id (1)  │
│ owner_id: 5    │     │   │ position (2) │
└────────────────┘     │   └──────────────┘
                       │
                       └───→ tour_pois (1, 10, 2)
                       └───→ tour_pois (3, 10, 5)

RESULT: poi_id=10 appears in tour_pois 2 times
        → Edit/Delete DISABLED for POI#10
```

---

## Tour Creation & POI Selection (v1.7)

```
┌─────────────────────────────────────────────────────────────────┐
│ Admin click "Tạo Tour mới" / "Sửa Tour"                         │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
            ┌──────────────────────────────┐
            │ Tour Form Panel              │
            │ - Tên tour                   │
            │ - Mô tả                      │
            │ - [Add POI] button           │
            └──────────────────────────────┘
                            │
                            ▼
            ┌──────────────────────────────┐
            │ POI Selection Modal          │
            │ (Filter: status = 'Appr.')   │
            │                              │
            │ [✓] POI A - Loại1            │  ← Approved
            │ [✓] POI B - Loại2            │  ← Approved
            │ (POI C - Loại3) DISABLED     │  ← Pending (grayed)
            │     "Not approved yet"        │
            │ (POI D - Loại4) DISABLED     │  ← Rejected (grayed)
            │     "Rejected"                │
            │                              │
            │ [Add Selected] [Cancel]      │
            └──────────────────────────────┘
                            │
                            ▼
        ✅ Only Approved POIs in tour_pois
        ✅ Pending/Rejected POIs cannot be added
```

---

## Admin Cannot Edit Business POI (v1.7 Rule)

```
┌─────────────────────────────────────────────────────────────────┐
│ Admin Dashboard - POIs Tab                                       │
│ Admin looking at POI list                                        │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
            ┌──────────────────────────────┐
            │ POI Card                     │
            │ Name: "Công viên Tao Đàn"   │
            │ Owner: Company A             │← Business-owned
            │ Status: Approved             │
            │                              │
            │ [Edit] [Delete]              │  ← v1.6: Both enabled
            │                              │
            │ v1.7 UPDATE:                 │
            │ [Edit ❌ DISABLED]           │  ← Admin can't edit
            │ [Delete]                     │  ← Can still delete
            │                              │      (maybe not, depends)
            │ Tooltip:                     │
            │ "Admin cannot edit POIs      │
            │  created by businesses.      │
            │  Use request approval flow." │
            │                              │
            │ [View Request] (if exists)   │  ← Link to edit request
            └──────────────────────────────┘

            Admin CAN:
            ✅ Approve / Reject POI
            ✅ Delete POI (with cascade)
            ✅ Review Edit Requests
            ✅ Approve/Reject Edit Requests

            Admin CANNOT:
            ❌ Direct edit POI data
            ❌ Change POI location/description
```

---

## Complete Request Lifecycle (v1.7)

```
DAY 1: Business creates POI
┌─────────────────────────────┐
│ POST /businesses/pois       │
│ Status: Pending             │
└─────────────────────────────┘
              │
              ▼
┌─────────────────────────────┐
│ Admin approves              │
│ Status: Approved            │
│ Audio: Generated 🎧        │
└─────────────────────────────┘
              │
     ┌────────┴────────┐
     │                 │
DAY 5          DAY 10 (Admin adds to Tour)
│                 │
▼                 ▼
Business sees ✅ POI in Tour#1
POI on map   Status: Approved
              Edit/Delete: DISABLED 🔒

DAY 15: Business wants to update description
┌──────────────────────────────┐
│ Business: "Sửa"              │
│ Button: ENABLED (not in tour)│
│ Form: show old description   │
│ Action: Save → Request Edit  │
└──────────────────────────────┘
    (But if POI was IN tour,    (But if POI IN tour,
     button be DISABLED 🔒)     button be DISABLED 🔒)
              │
              ▼
┌──────────────────────────────┐
│ EditRequest created          │
│ edit_requests.state = PENDING│
│ POI.status = Pending         │
└──────────────────────────────┘
              │
              ▼
┌──────────────────────────────┐
│ Admin: "Duyệt chỉnh sửa"     │
│ PUT /admin/requests/edit/.../│
│ approve                       │
└──────────────────────────────┘
              │
              ▼
    ✅ POI data updated
    ✅ Old audio deleted
    ✅ New audio generated 🎧
    ✅ POI.status = Approved
    ✅ Still in Tour (unchanged)
    ✅ Notification sent to biz

DAY 30: Business wants to delete POI
┌──────────────────────────────┐
│ Business: "Xóa"              │
│ Dialog: Are you sure?        │
│ Action: Save → Request Delete│
└──────────────────────────────┘
    (But if POI still IN tour,
     button DISABLED 🔒)
              │
              ▼
┌──────────────────────────────┐
│ DeleteRequest created        │
│ delete_requests.state = PEND.│
│ POI.status = Pending         │
│ Warning Tours affected: [#1] │
└──────────────────────────────┘
              │
              ▼
┌──────────────────────────────┐
│ Admin: "Duyệt xóa"           │
│ PUT /admin/requests/delete...│
│ approve                       │
└──────────────────────────────┘
              │
              ▼
    ✅ POI deleted from DB
    ✅ Audio deleted
    ✅ Notification sent to business
    (No need to remove from Tours
     since POI was not in any Tour)

---

## Database State Transitions (v1.7)

```

NEW POI FLOW:
Pending → Approve → Approved (+ audio)
→ Reject → Rejected

APPROVED POI - EDIT REQUEST (CẬP NHẬT v1.7):
Approved → Business Edit Request → EditRequest.state = Pending
→ POI status stays Approved
Pending EditRequest → Admin Approve → POI data updated + new audio
→ Admin Reject → POI unchanged

APPROVED POI - DELETE REQUEST:
Approved → Business Delete Request → DeleteRequest.state = Pending
→ POI status = Pending
Pending DeleteRequest → Admin Approve → POI DELETED
→ Admin Reject → POI status = Approved

RULES:

1. Only Approved POIs visible on map
2. Only Approved POIs can be added to Tours
3. POI in Tour → Edit/Delete buttons DISABLED
4. Admin cannot edit business POIs (use request flow)
5. EditRequest doesn't hide POI during approval wait
6. DeleteRequest isn't created if POI in Tour (button disabled)
7. All requests stored for audit trail

```

---

## UI/UX Changes Summary (v1.7)

| Component                 | v1.6              | v1.7                                                  |
| ------------------------- | ----------------- | ----------------------------------------------------- |
| POI Approved (Business)   | Read-only         | Edit/Delete (if NOT in tour) → Request flow           |
| Edit button (POI in tour) | N/A               | DISABLED + tooltip "POI in Tour X"                    |
| Delete button (in tour)   | N/A               | DISABLED + tooltip "POI in Tour X"                    |
| Tour POI selection        | All POIs          | Only Approved POIs (Pending/Rejected grayed)          |
| Admin edit business POI   | Enabled           | DISABLED + tooltip "Use request flow"                 |
| Edit Request view         | N/A               | Split view: Old vs New data comparison                |
| Edit Request state        | N/A               | Request is Pending, POI stays Approved (not hidden)   |
| Delete Request view       | N/A               | POI info (not in Tours since button was disabled)     |
| Request approval (edit)   | N/A               | Apply new_data + delete old audio + trigger TTS       |
| Request approval (delete) | N/A               | Delete POI + delete audio (no Tour cleanup needed)    |

---

_END VISUAL_WORKFLOW v1.7_
```
