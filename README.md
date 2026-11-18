# English Vocab Daily 3.0 — Bản nâng cấp

Website kiểm tra từ vựng tiếng Anh lớp 6–12 có giao bài bằng mã, dashboard giáo viên, cơ sở dữ liệu SQLite và chấm điểm tại máy chủ. Phiên bản này được phát triển từ bản QuickAccess trước đó; dữ liệu được giữ nếu cơ sở dữ liệu cũ còn nguyên và có đường dẫn DB_PATH không đổi.

## Những điểm mới đã được lập trình

- **Tạo câu hỏi tự động từ từ vựng:** mỗi dòng là `từ tiếng Anh[TAB]nghĩa tiếng Việt`. Tối thiểu 4, tối đa 100 cặp; tạo **2 câu trắc nghiệm nhận biết** cho mỗi từ (Anh→Việt và Việt→Anh), kiểm tra từ/ nghĩa trùng, cho giáo viên xem trước rồi lưu. Đây là bộ tạo dựa vào quy tắc, KHÔNG phải AI sinh ngữ cảnh; không tự chứng nhận nội dung Global Success.
- **Tùy chọn đề:** 5, 10, 15, 20, 30 hoặc 50 câu; 3–60 phút; 1–3 lượt. Chấm theo thang 10 dựa trên số câu thực tế. Các đề cũ mặc định 20 câu được giữ nguyên qua migration.
- **Tránh nhập trùng:** kiểm tra câu hỏi + tập 4 phương án trong cùng một Unit; nếu trùng, bỏ qua và hiển thị số lượng. Các câu trùng cũ đã lưu **không bị xóa tự động**.
- **Quản lý ngân hàng:** xem/sửa/xóa tối đa 50 câu hỏi tự tạo gần nhất. Những câu đã được sử dụng trong bất kỳ lượt làm nào bị khóa sửa/xóa để không làm sai lịch sử điểm.
- **Đóng/mở bài:** giáo viên ngăn học sinh bắt đầu lượt làm mới. Lượt đang làm vẫn nộp được.
- Giữ các chức năng: vào bài bằng mã và mã học sinh, 2 lượt mặc định, bảng điểm, CSV, sao lưu SQLite thủ công.

## Chạy cục bộ

Cần Node.js >= 22.13 (khuyến nghị Node 22 LTS). Trong thư mục này:

```bash
npm run check
npm start
```

Mở `http://localhost:3000`. Trên máy cá nhân với CSDL mới, tài khoản demo giáo viên mặc định `teacher` / `Teacher@123`; KHÔNG dùng mật khẩu demo trong môi trường công khai.

## Cập nhật Render

Đọc **HUONG-DAN-NANG-CAP.txt**. Quan trọng: **Sao lưu dữ liệu trước mọi cập nhật**. Không cần tạo lại Render Service. Bản Render Free dùng ổ tạm; SQLite trên đó có thể bị mất mỗi khi dịch vụ restart, spin down hoặc redeploy. Với lớp thật, nên chuyển sang cơ sở dữ liệu ngoài có backup hoặc trả phí với persistent disk. Không tự động nâng cấp dịch vụ hoặc thay đổi chi phí.

Để kiểm tra sau khi deploy: vào `/api/health`, đăng nhập giáo viên, tạo Unit thử, nhập từ vựng, duyệt câu, tạo bài 10 câu, vào bài bằng mã, nộp và kiểm tra dashboard.

## Giới hạn chưa giải quyết

- Chưa có AI sinh câu ngữ cảnh hoặc kiểm tra tự động độ chính xác của nội dung Global Success; giáo viên phải duyệt.
- Chưa có danh sách mã học sinh được giáo viên cấp trước; phương thức mã bài + mã học sinh không chứng thực danh tính mạnh.
- Chưa có lưu trữ bền vững và sao lưu ngoại vi tự động, khôi phục 1 nút, import `.xlsx` trực tiếp (có thể dán TSV từ Excel), audio, ảnh, tự luận, bài điền từ, thông báo Zalo, phân quyền nhiều giáo viên nâng cao.
- Chưa kiểm thử tải đồng thời 300 học sinh hoặc trên mọi thiết bị vật lý. Hiện chỉ xác minh chức năng API và kiểm tra cú pháp JS.
- Không đảm bảo cập nhật mã nguồn lên GitHub làm dữ liệu hiện hữu được giữ trên Render Free.

## Nguồn tham khảo sản phẩm

- Wayground: https://support.wayground.com/hc/en-us/articles/4408491205389-Create-an-Assessment-Quiz-on-Quizizz
- Kahoot: https://kahoot.com/schools/how-it-works/
- Blooket reports: https://help.blooket.com/hc/en-us/articles/16180020488727-How-to-Read-Blooket-Reports
- Google Forms quizzes: https://support.google.com/docs/answer/7032287
- Render Free: https://render.com/docs/free
