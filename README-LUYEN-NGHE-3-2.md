# English Vocab Daily 3.2 — Luyện nghe mở rộng

Bản này kế thừa đầy đủ chức năng 3.1, bổ sung:
- Nghe rồi viết chính tả từ: từ danh sách `từ<TAB>nghĩa`.
- Nghe câu điền từ: nhập `câu<TAB>từ cần điền`, từ phải xuất hiện trong câu.
- Nghe và sắp xếp lại từ thành câu: lấy từ danh sách `câu<TAB>bản dịch`. Học sinh bấm vào các ô từ hoặc gõ câu.
- Nghe chọn đúng từ được đọc: trắc nghiệm từ trong danh sách; không bảo đảm các phương án có phát âm gần nhau.
- Chấm dạng tự nhập trên máy chủ, không phân biệt hoa/thường, khoảng trắng thừa và dấu câu cuối; **vẫn phân biệt sai chính tả**.
- Các dạng trên có thể trộn chung với bài trắc nghiệm trong Unit; mỗi câu đều tính như nhau.

## Hướng dẫn giáo viên
1. Vào Ngân hàng câu hỏi → chọn khối và chủ đề.
2. Dán danh sách từ–nghĩa và/hoặc câu đã học. Nhấn một trong các nút "Nghe...".
3. Soát câu mới trong ô TSV rồi bấm "Lưu câu hỏi vào ngân hàng".
4. Tạo bài, gửi mã bài; học sinh có thể nghe lại ở tốc độ thường hoặc chậm.

## Hạn chế
- Sử dụng Web Speech API trên thiết bị, KHÔNG phải giọng MP3 thống nhất. Trình duyệt thiếu giọng tiếng Anh có thể không đọc được.
- `audioText` được gửi đến trình duyệt để phát bằng giọng máy. Bài nghe có thể bị xem nội dung bằng công cụ phát triển của trình duyệt, do đó **chỉ phù hợp luyện tập, không phù hợp thi bảo mật cao**.
- Chưa có chấm phát âm bằng microphone: không nên dùng nhận dạng giọng nói có thể gây chấm sai học sinh.
- Với câu chứa dấu câu bên trong, lời giải yêu cầu giống nội dung nguồn, chỉ bỏ qua dấu câu cuối.
- Render Free + SQLite vẫn có nguy cơ mất dữ liệu sau mỗi lần triển khai/khởi động lại. Phải sao lưu trước khi cập nhật GitHub.
