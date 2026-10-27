# Hướng Dẫn Khởi Chạy Và Kiểm Thử Hệ Thống (V1 -> V4)
## Bài Tập Tuần 6/7: Tiến Hóa Kiến Trúc Ứng Dụng Quản Lý Công Việc

Dự án được xây dựng bởi **Kỹ sư Công nghệ Phần mềm** tuân thủ nguyên lý **Clean Architecture**, **Domain-Driven Design (DDD)** và **Separation of Concerns**. Hệ thống sử dụng **duy nhất một codebase** tiến hóa qua 4 giai đoạn kiến trúc (V1 &rarr; V2 &rarr; V3 &rarr; V4).

---

## 🛠️ Công Nghệ Sử Dụng

- **Backend Runtime**: Node.js (tận dụng module chuẩn `node:http`, `node:fs`, `node:sqlite` &mdash; không phụ thuộc thư viện bên ngoài cồng kềnh).
- **Cơ sở dữ liệu**:
  - V1 & V2: `data/tasks.json` (Flat-file persistence).
  - V3 & V4: `data/tasks.db` (SQLite relational database thông qua `node:sqlite`).
- **Frontend**: Vanilla HTML5, CSS3 (theo phong cách Học thuật Cổ điển kết hợp Hiện đại trong `style.md`), JavaScript ES6+ theo mô hình MVC / MVVM.
- **Kênh P2P (V4)**: WebRTC DataChannel (kết nối trực tiếp giữa hai trình duyệt không trung chuyển gói tin qua server).

---

## 🚀 Cách Khởi Chạy Ứng Dụng

### 1. Khởi động Server
Mở terminal tại thư mục dự án và chạy:
```bash
node server.js
```
Hoặc dùng script:
```bash
npm start
```
Server sẽ chạy tại địa chỉ: **`http://localhost:3000`**

### 2. Chạy Kiểm Thử Tự Động (Automated Test Suite)
Để xác nhận tính toàn vẹn của Domain, JSON Storage, SQLite Storage, Data Migration và Business Logic:
```bash
npm run test:verify
```
Kết quả mong đợi: `🎉 TẤT CẢ 5 BỘ TEST KIỂM CHỨNG ĐÃ ĐẠT 100%!`

---

## 📋 Kịch Bản Kiểm Thử Chi Tiết Qua 4 Phiên Bản

### 🔹 V1. Chạy Cục Bộ (7 phút)
- **Mục tiêu**: CRUD công việc, lưu vào `tasks.json`, dữ liệu còn sau khi khởi động lại.
- **Thao tác**:
  1. Trên giao diện, chọn thẻ **"V1: Cục bộ (JSON)"**.
  2. Tạo 2 task mới: `"Task 1: Ôn tập lý thuyết"` và `"Task 2: Làm bài tập"`.
  3. Đánh dấu hoàn thành 1 task.
  4. Tắt terminal server (`Ctrl + C`) rồi chạy lại `node server.js`. Tải lại trình duyệt (`F5`).
- **Đạt khi**: 2 task và trạng thái hoàn thành được khôi phục chính xác từ `data/tasks.json`.

---

### 🔹 V2. Nhiều Client Đồng Thời (10 phút)
- **Mục tiêu**: Nhiều client truy cập qua API backend và dùng chung dữ liệu server.
- **Thao tác**:
  1. Mở 2 cửa sổ/tab trình duyệt độc lập (hoặc 1 tab thường và 1 tab ẩn danh / 2 profile khác nhau) cùng truy cập `http://localhost:3000`.
  2. Chọn chế độ **"V2: Client–Server"** ở cả hai tab.
  3. Tại Tab A: Thêm task `"Task A tạo trên client 1"`.
  4. Quan sát Tab B: Trong vòng ~2.5 giây (chu kỳ polling định kỳ), task mới xuất hiện trên Tab B mà không cần nhấn F5.
  5. Tại Tab B: Đánh dấu hoàn thành task đó.
  6. Quan sát Tab A: Trạng thái task tại Tab A tự động cập nhật sang gạch ngang (đã hoàn thành).
- **Đạt khi**: Hai client cùng quan sát và đồng bộ trạng thái nhất quán qua backend server.

---

### 🔹 V3. Đổi Giao Diện Và Database (12 phút)
- **Mục tiêu**: Thay giao diện sang Kanban 2 cột, chuyển đổi dữ liệu từ `tasks.json` sang SQLite `tasks.db`, không mất task cũ.
- **Thao tác**:
  1. Chọn thẻ **"V3: N-Layer / Kanban"**.
  2. Giao diện danh sách tự động chuyển thành **Bảng Kanban 2 cột**: `"⏳ Chưa hoàn thành"` và `"✅ Đã hoàn thành"`.
  3. Nhấn nút **"🔄 Migrate Dữ Liệu"** trên thanh trạng thái (hoặc hệ thống tự động kiểm tra).
  4. Xác nhận toàn bộ task tạo từ V1/V2 vẫn nguyên vẹn trong cơ sở dữ liệu SQLite mới.
  5. Bấm nút `"✔️ Đánh dấu Xong"` trên thẻ để chuyển task giữa 2 cột Kanban. Thử tạo thêm task mới và xóa task.
  6. Tắt server, khởi động lại và tải lại trang: dữ liệu SQLite được bảo toàn 100%.
- **Đạt khi**: Giao diện mới hoạt động mượt mà, dữ liệu được chuyển đổi an toàn sang SQLite không mất mát.

---

### 🔹 V3.5. Đa Người Dùng (Multi-user Workspace & Assignee)
- **Mục tiêu**: Phân biệt danh tính người dùng và phân công công việc cụ thể cho từng thành viên (Alice, Bob, Charlie).
- **Thao tác**:
  1. Chọn thẻ **"V3.5: Multi-user"**.
  2. Xuất hiện thanh điều khiển danh tính:
     - Hộp chọn **"Tôi là: 👤 Alice / 👤 Bob / 👤 Charlie"**.
     - Hộp chọn **"Lọc công việc: 👥 Tất cả mọi người / 🎯 Chỉ của tôi"**.
  3. Khi tạo task, xuất hiện ô chọn gán người phụ trách: `"Gán: 👤 Alice"`, `"Gán: 👤 Bob"`.
  4. Tạo task `"Nhiệm vụ của Alice"` gán cho Alice, và task `"Nhiệm vụ của Bob"` gán cho Bob.
  5. Thẻ Kanban hiển thị badge người phụ trách tương ứng (`👤 Alice`, `👤 Bob`).
  6. Chuyển bộ lọc sang `"🎯 Chỉ của tôi"`: Nếu bạn đang là Alice, bạn chỉ nhìn thấy công việc của Alice; chuyển danh tính sang Bob, danh sách tự lọc sang công việc của Bob!
- **Đạt khi**: Dữ liệu lưu trữ SQLite ghi nhận trường `assignee`, giao diện hỗ trợ lọc và phân quyền hiển thị trực quan.

---

### 🔹 V4. Cộng Tác P2P Khi Mất Server (11 phút)
- **Mục tiêu**: Hai client trao đổi task và thay đổi trạng thái trực tiếp qua WebRTC DataChannel, **hoạt động ngay cả khi server trung tâm bị tắt**.
- **Thao tác**:
  1. Mở 2 tab trình duyệt A và B, cùng chọn **"V4: P2P Cộng tác"**.
  2. Bảng điều khiển P2P xuất hiện. Tab A có mã `Peer_A`, Tab B có mã `Peer_B`.
  3. Tại Tab B: Nhấn **"1. Chờ Kết Nối (Listen)"**.
  4. Tại Tab A: Nhập mã của Tab B vào ô và nhấn **"2. Kết Nối Ngay"**.
  5. Quan sát thanh trạng thái đổi sang: **`🟢 P2P Direct Mesh Đã Kết Nối`**.
  6. **BƯỚC QUYẾT ĐỊNH**: Quay lại terminal server và **TẮT SERVER** (`Ctrl + C` hoặc đóng terminal).
     - Trên cả 2 tab trình duyệt, huy hiệu server chuyển sang: `🔴 Server Offline (Đã tắt)`.
     - Kênh P2P vẫn giữ trạng thái `🟢 P2P Direct Mesh Đã Kết Nối`.
  7. Tại Tab A: Thêm task `"Task P2P khi server đã chết"`.
  8. Quan sát Tab B: Nhận ngay lập tức task mới qua DataChannel! Khung log P2P hiển thị: `[Peer_B] 📩 Nhận gói tin P2P trực tiếp: [TASK_CREATED]`.
  9. Tại Tab B: Nhấn đổi trạng thái hoàn thành task. Tab A nhận cập nhật tức thời qua P2P!
- **Đạt khi**: Hai peer duy trì kết nối trực tiếp, trao đổi gói tin hai chiều thành công mà không có bất kỳ server trung gian nào xử lý.
