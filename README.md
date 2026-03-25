# Hệ thống GPS Du lịch Đa ngôn ngữ

Tài liệu hướng dẫn khởi chạy nhanh dự án Hệ thống GPS Du lịch Đa ngôn ngữ (Phiên bản v1.8).

## 1. YÊU CẦU MÔI TRƯỜNG (Prerequisites)

Để chạy được dự án, máy tính của bạn cần cài đặt sẵn các phần mềm sau:

*   **Node.js**: Khuyến nghị phiên bản `v18.x` hoặc cao hơn.
*   **Python**: Khuyến nghị phiên bản `3.8` trở lên.

**Cài đặt thư viện Python bắt buộc:**
Hệ thống sử dụng Python để xử lý dịch thuật và tạo audio on-demand. Mở terminal và chạy lệnh sau để cài đặt:
```bash
pip install edge-tts deep-translator
```

---

## 2. HƯỚNG DẪN KHỞI CHẠY

Dự án yêu cầu chạy song song 2 terminal độc lập cho Backend và Frontend.

### Terminal 1 (Backend)
Tiến hành cài đặt thư viện và khởi động server Node.js:
```bash
# Di chuyển vào thư mục backend (nếu có)
cd backend

# Cài đặt các gói phụ thuộc
npm install

# Khởi động server
npm run server
# hoặc sử dụng: npx ts-node server.ts
```
> 🚀 Backend API sẽ khởi chạy tại: **http://localhost:3000**

### Terminal 2 (Frontend)
Tiến hành cài đặt thư viện và khởi động giao diện người dùng React (Vite):
```bash
# Di chuyển vào thư mục frontend (nếu có)
cd frontend

# Cài đặt các gói phụ thuộc
npm install

# Khởi động giao diện Development
npm run dev
```
> 🚀 Frontend UI sẽ khởi chạy tại: **http://localhost:5173**

---

## 3. HƯỚNG DẪN ĐĂNG NHẬP

Khi cả 2 terminal đều đã chạy thành công, bạn có thể truy cập vào hệ thống để bắt đầu sử dụng.

*   **Đường dẫn truy cập (Admin Dashboard):** [http://localhost:5173](http://localhost:5173)
*   **Tài khoản đăng nhập mặc định (Dành cho Admin):**
    *   **Username (Email):** `adminisme`
    *   **Password:** `******`

*(Lưu ý: Mật khẩu hiển thị là `******` theo yêu cầu bảo mật định trước, nếu hệ thống yêu cầu email hợp lệ, hãy sử dụng mapping của tài khoản mặc định có trong codebase).*
