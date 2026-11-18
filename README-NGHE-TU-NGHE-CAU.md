# English Vocab Daily 3.1 — Luyện nghe từ và câu đã học

## Điểm mới
- Ngân hàng câu hỏi hỗ trợ 8 cột câu thường, hoặc 10 cột câu nghe (hai cột bổ sung là `type` và `audioText`).
- `listen-word`: đọc từ tiếng Anh, học sinh chọn nghĩa tiếng Việt.
- `listen-sentence`: đọc nguyên câu tiếng Anh do giáo viên cung cấp, học sinh chọn bản dịch tiếng Việt.
- Nút **Nghe** và **Nghe chậm** (0,7×) trong bài làm. Dùng giọng tổng hợp của trình duyệt/thiết bị (Web Speech API).
- Giáo viên có nút tạo hàng loạt câu nghe từ bảng từ–nghĩa và bảng câu–dịch; nội dung nguồn phải được duyệt.

## Cách dùng
1. Đăng nhập giáo viên → **Ngân hàng câu hỏi**, chọn khối và nhập Unit.
2. Dán danh sách mỗi dòng `từ tiếng Anh<TAB>nghĩa tiếng Việt` vào ô tạo câu từ vựng; nhấn **Tạo câu nghe từ**.
3. Với câu, dán mỗi dòng `câu tiếng Anh<TAB>bản dịch tiếng Việt` vào ô **Nghe câu đã học**; cần tối thiểu 4 câu/dịch khác nhau; nhấn **Tạo câu nghe câu**.
4. Xem dữ liệu trong ô nhập hàng loạt, sau đó **Lưu câu hỏi vào ngân hàng**. Tạo bài và gửi mã bài.
5. Trên máy học sinh, nhấn nút Nghe/Nghe chậm để phát. Nếu thiết bị không có giọng tiếng Anh hoặc chức năng tổng hợp giọng nói, âm thanh có thể không phát.

## Điều cần lưu ý
- Đây là TTS trên thiết bị, KHÔNG phải file âm thanh cố định. Giọng, trọng âm và chất lượng sẽ khác giữa Chrome, Edge, Safari, Android, iOS. Luôn kiểm tra trước trên thiết bị thực.
- Với kiểm tra chính thức, nên nâng cấp thành audio MP3 thu sẵn để học sinh nghe đồng nhất. Không được gửi lời giải trong câu hỏi đang làm; nguồn audioText sẽ hiển thị qua mạng nên đây là bài luyện tập chứ không phải bài thi bảo mật cao.
- Việc phát audio yêu cầu thao tác của người dùng, không tự phát khi mở câu.
- Ở gói Render Free, cơ sở dữ liệu SQLite vẫn có nguy cơ mất khi dịch vụ khởi động lại: **sao lưu trước khi cập nhật** và không sử dụng dữ liệu học sinh thật.
- Đây là bản mã nguồn cập nhật, chưa được đưa lên repository và Render.
