# 🚀 Quick Start Guide - Admin Dashboard POC

## **1. Start the Application**

```bash
cd c:\Users\congh\OneDrive\Desktop\seminar\do-an-seminar
npm run dev
```

**Expected output:**

```
> react-example@0.0.0 dev
> tsx --tsconfig ./tsconfig.server.json server.ts

Server running on http://localhost:3000
```

✅ Server is ready at `http://localhost:3000`

---

## **2. Login to Dashboard**

Open browser → http://localhost:3000

**Login Credentials (MVP):**

- **Email**: `admin@example.com`
- **Password**: `password`

Click "Đăng nhập" button

**Expected**: Dashboard loads with POIs tab active, empty map centered on Đà Nẵng

---

## **3. Create Your First POI**

1. Click anywhere on the map (right side)
2. Form "Thêm POI mới" slides in from right
3. Fill in:
   - **Tên điểm**: `Museum A` (any name)
   - **Loại điểm**: Select `Chính` (Major POI)
   - **Mô tả** (optional): `A beautiful museum`
4. Click "Lưu địa điểm"

**Expected**:

- POI appears in sidebar with emoji 📍
- Marker appears on map at clicked location
- Toast notification: "Tạo POI thành công" (green)
- Panel closes

✅ **POI Created!**

---

## **4. Create More POIs (for Tour)**

Repeat step 3, create 3-4 more POIs with different types:

- Type `WC` (🚻) → name: "Restroom"
- Type `Bán vé` (🎫) → name: "Ticket Booth"
- Type `Gửi xe` (🅿️) → name: "Parking"
- Type `Bến thuyền` (⚓) → name: "Pier"

**Each time**:

- Click map
- Fill form
- Click save
- See toast + sidebar update

✅ **4+ POIs Created!**

---

## **5. Create a Tour**

1. Click "Quản lý Tours" tab (left sidebar, Layers icon)
2. Click **+** button to create new tour
3. Form "Tạo Tour mới" slides in
4. Fill in:
   - **Tên Tour**: `Morning Walk` (any name)
5. Select POIs by clicking them in order:
   - Click first POI → badge "1" appears
   - Click second POI → badge "2" appears
   - Continue for 3-4 POIs
6. Click "Lưu lộ trình"

**Expected**:

- Tour appears in sidebar with sequence: `POI1 → POI2 → POI3`
- Map shows **emerald dashed line** connecting POIs
- Toast: "Tạo Tour thành công"

✅ **Tour Created!**

---

## **6. Edit a POI**

1. Go back to **POIs** tab
2. Hover over any POI in sidebar
3. Click **Edit button** (pencil icon)
4. Form opens with current data pre-filled
5. Change something (e.g., name)
6. Click "Lưu địa điểm"

**Expected**:

- Sidebar updates instantly
- Map popup updates
- Toast: "Cập nhật POI thành công"

✅ **POI Edited!**

---

## **7. Delete a POI**

1. In POIs tab, hover over any POI
2. Click **Delete button** (trash icon)
3. Click "OK" in confirm dialog

**Expected**:

- POI removed from sidebar
- Marker removed from map
- If POI was in a tour, tour shows "Unknown"
- Toast: "Xóa POI thành công"

✅ **POI Deleted!**

---

## **8. View Map Legend**

Bottom-left corner of map shows:

```
Chú thích
📍 Chính
🚻 WC
🎫 Bán vé
🅿️ Gửi xe
⚓ Bến thuyền
```

Hover over POIs to see type icons.

---

## **9. Logout**

1. Click "Đăng xuất" button (bottom of sidebar)
2. Page redirects to login screen

**Expected**:

- Token removed from localStorage
- Session cleared
- Back to login form

✅ **Logout Complete!**

---

## **10. Test Auth with Wrong Credentials** (Optional)

1. Reload page or click "Đăng xuất"
2. Try login with:
   - Email: `admin@example.com`
   - Password: `wrong_password`
3. Click "Đăng nhập"

**Expected**:

- Error message: "Sai email hoặc mật khẩu"
- Form not cleared
- Not redirected (stay on login)

✅ **Auth Validation Works!**

---

## **🐛 Troubleshooting**

### **Server won't start?**

```bash
# Kill any process on port 3000
netstat -ano | findstr :3000
# Then kill the PID

# Try again
npm run dev
```

### **Blank page / 404?**

- Check browser console (F12 → Console tab)
- Ensure server is running (should see "Server running on..." in terminal)
- Hard refresh: Ctrl+Shift+Delete

### **Map not showing?**

- Wait a moment for tiles to load (CARTO external)
- Check internet connection
- Zoom in/out on map to trigger render

### **API errors (4xx/5xx)?**

- Check browser DevTools → Network tab
- See response error message
- Verify token in localStorage (F12 → Application → localStorage)

### **Toast not appearing?**

- Check browser console for JS errors
- Clear cache & refresh
- Ensure #toast-root div exists in index.html

---

## **📊 Test Coverage**

| Feature           | Status | Notes                                 |
| ----------------- | ------ | ------------------------------------- |
| Login ✅          | Ready  | Test with correct/wrong credentials   |
| Logout ✅         | Ready  | Clear token & redirect                |
| Create POI ✅     | Ready  | Click map → form → save               |
| Edit POI ✅       | Ready  | Click Edit → modify → save            |
| Delete POI ✅     | Ready  | Confirm dialog required               |
| Create Tour ✅    | Ready  | Select POIs in order → polyline shows |
| Delete Tour ✅    | Ready  | Confirm dialog required               |
| Validation ✅     | Ready  | Try save with empty name              |
| Loading States ✅ | Ready  | See spinner on login/save             |
| Errors ✅         | Ready  | Wrong password, invalid data          |

---

## **💡 Tips**

- **Keyboard shortcut**: Ctrl+Shift+I to open DevTools
- **Check token**: In DevTools → Application → localStorage → authToken
- **Watch logs**: Server terminal shows all requests
- **Clear data**: Delete `data.db` file to reset database
- **Test offline**: Disconnect internet, see error handling

---

## **What's Next?**

Once you confirm all tests pass:

1. ✅ Run full smoke test (see Test Checklist in IMPLEMENTATION_SUMMARY.md)
2. ⏳ Prepare for beta release
3. ⏳ Add production security (HTTPS, hash passwords, env vars)
4. ⏳ Set up CI/CD pipeline
5. ⏳ Plan sprint 2 features (edit tour, drag-to-reorder, etc.)

---

**Happy Testing! 🎉**

If you encounter any issues, check error messages in browser console (F12).
