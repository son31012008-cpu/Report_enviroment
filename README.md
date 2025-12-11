# EcoSurvey - Khảo Sát Rác Thải Nhựa

Website khảo sát hiểu biết về rác thải nhựa (polyme) với hệ thống thống kê và báo cáo chuyên nghiệp.

## Tính Năng

### 1. Trang Khảo Sát (index.html)
- Form khảo sát trực quan với 4 phần chính:
  - Thông tin cá nhân (độ tuổi, nghề nghiệp)
  - Kiến thức về rác thải nhựa (3 câu hỏi)
  - Hành vi sử dụng nhựa (2 câu hỏi)
  - Thái độ và giải pháp
- Thanh tiến độ hiển thị số câu hỏi đã hoàn thành
- Lưu trữ dữ liệu vào localStorage
- Giao diện responsive và hiệu ứng động

### 2. Dashboard Thống Kê (dashboard.html)
- Tổng quan số liệu:
  - Tổng số khảo sát
  - Điểm kiến thức trung bình
  - Điểm hành vi trung bình
  - Tỷ lệ tham gia
- Biểu đồ phân tích:
  - Phân bố độ tuổi (biểu đồ tròn)
  - Phân bố nghề nghiệp (biểu đồ tròn)
  - Tương quan kiến thức - hành vi (biểu đồ phân tán)
  - Phân tích kiến thức (biểu đồ cột)
  - Phân tích hành vi (biểu đồ cột)
- Nhận xét và đánh giá tự động
- Chức năng làm mới dữ liệu và xuất dữ liệu

### 3. Báo Cáo Chi Tiết (report.html)
- Tóm tắt kết quả với đánh giá tổng quan
- Phân tích nhân khẩu học chi tiết
- Đánh giá kiến thức theo từng câu hỏi
- Phân tích hành vi sử dụng và phân loại nhựa
- Khuyến nghị về giáo dục và chính sách
- Bảng dữ liệu chi tiết với điểm số
- Chức năng xuất PDF, in báo cáo, xuất Excel

## Công Nghệ Sử Dụng

### Frontend
- **HTML5**: Cấu trúc trang web
- **CSS3**: Styling với Tailwind CSS
- **JavaScript**: Xử lý logic và tương tác

### Thư Viện
- **Anime.js**: Hiệu ứng động
- **ECharts.js**: Biểu đồ thống kê
- **jsPDF**: Xuất báo cáo PDF
- **Font Awesome**: Icons

### Lưu Trữ Dữ Liệu
- **localStorage**: Lưu trữ dữ liệu khảo sát cục bộ

## Cách Sử Dụng

### 1. Chuẩn Bị
- Tải toàn bộ file về máy
- Mở file `index.html` bằng trình duyệt web
- Không cần cài đặt server (chạy được với file://)

### 2. Thực Hiện Khảo Sát
1. Truy cập trang chủ (index.html)
2. Điền thông tin cá nhân
3. Trả lởi các câu hỏi về kiến thức và hành vi
4. Gửi khảo sát
5. Dữ liệu sẽ được lưu tự động

### 3. Xem Thống Kê
1. Truy cập Dashboard (dashboard.html)
2. Xem tổng quan số liệu
3. Phân tích biểu đồ thống kê
4. Đọc nhận xét và đánh giá
5. Có thể làm mới dữ liệu hoặc xuất dữ liệu

### 4. Tạo Báo Cáo
1. Truy cập trang báo cáo (report.html)
2. Xem tóm tắt và phân tích chi tiết
3. Đọc khuyến nghị
4. Xuất PDF, Excel hoặc in báo cáo

## Cấu Trúc Dữ Liệu

### Survey Object
```javascript
{
  id: "survey_1234567890_abc123",
  age: "25-34",
  occupation: "employee",
  q1: "a", // Định nghĩa rác thải nhựa
  q2: "c", // Thờ gian phân hủy
  q3: ["a", "b", "c", "d"], // Tác hại
  q4: "weekly", // Tần suất sử dụng
  q5: "sometimes", // Phân loại rác
  q6: "all", // Trách nhiệm
  q7: "willing", // Sẵn sàng thay đổi
  q8: "Khuyến khích tái sử dụng", // Ý kiến
  timestamp: "2024-01-15T10:30:00.000Z"
}
```

### Statistics Object
```javascript
{
  total: 50,
  ageDistribution: { "18-24": 10, "25-34": 20, ... },
  occupationDistribution: { "student": 15, "employee": 25, ... },
  knowledgeScore: 75,
  behaviorScore: 60
}
```

## Tính Năng Nổi Bật

### 1. Phân Tích Tự Động
- Tính toán điểm số tự động
- Đánh giá mức độ nhận thức
- Phân tích hành vi tự động
- Gợi ý khuyến nghị phù hợp

### 2. Báo Cáo Chuyên Nghiệp
- Mẫu báo cáo khoa học
- Biểu đồ trực quan
- Xuất PDF chất lượng cao
- Dữ liệu Excel cho phân tích sâu

### 3. Giao Diện Thân Thiện
- Responsive design
- Hiệu ứng động mượt
- Màu sắc phù hợp chủ đề môi trường
- Trải nghiệm ngườ dùng tốt

### 4. Dễ Dàng Mở Rộng
- Code có cấu trúc rõ ràng
- Dễ thêm câu hỏi mới
- Dễ tùy chỉnh giao diện
- Có thể kết nối backend

## Lưu Ý

1. **Dữ Liệu**: Website sử dụng localStorage, dữ liệu sẽ mất khi xóa cache trình duyệt
2. **Bảo Mật**: Không lưu thông tin nhạy cảm, chỉ thu thập dữ liệu khảo sát
3. **Tương Thích**: Hoạt động tốt trên Chrome, Firefox, Safari, Edge
4. **Mobile**: Giao diện responsive, hoạt động tốt trên điện thoại

## Khả Năng Mở Rộng

### Kết Nối Backend
- Có thể thay thế localStorage bằng database
- API endpoints cho CRUD operations
- Authentication và authorization
- Export dữ liệu lớn

### Tính Năng Bổ Sung
- So sánh theo thờ gian
- Phân tích theo khu vực địa lý
- Tích hợp AI cho phân tích sâu
- Multi-language support

## Liên Hệ & Hỗ Trợ

Website được phát triển cho mục đích giáo dục và nghiên cứu về môi trường.

---

**EcoSurvey** - Vì một môi trường xanh sạch 🌱