# ENGLISH VOCAB DAILY — Phiên bản Render 2.0

Website kiểm tra từ vựng tiếng Anh lớp 6–12: **20 câu / 10 phút / tối đa 2 lượt**, đăng nhập học sinh và giáo viên, tạo lớp, giao bài, chấm điểm **trên máy chủ**, bảng điểm theo lớp, kết quả từng lượt, xuất CSV và tải bản sao lưu SQLite. Giao diện responsive cho trình duyệt hiện đại trên Android, iPhone/iPad, Windows và macOS.

**Quan trọng:** đây là dự án chạy thực sự, **chưa được triển khai công khai**. Bài tập đi kèm là dữ liệu **minh họa**, không được xác nhận đã khớp từng Unit của Global Success. Giáo viên phải soát câu hỏi trước khi dùng chính thức.

## A. Triển khai Render từng bước — khuyến nghị cho 100–300 học sinh

### Bước 1 — Tạo kho GitHub **Private**

1. Giải nén `english-vocab-daily-render.zip`.
2. Truy cập https://github.com/new, đặt tên ví dụ `english-vocab-daily`, chọn **Private**.
3. Chọn **Add file → Upload files** để tải **nội dung bên trong thư mục** `english-vocab-daily-render` lên repository. Không tải file ZIP nguyên khối. Bảo đảm `server.js`, `package.json`, `public/` và `seed.js` ở thư mục gốc của repository. Hoặc dùng `git add .`, `git commit`, `git push`.
4. KHÔNG tải lên `data/*.sqlite*`, `.env`, mật khẩu hoặc bản sao lưu. `.gitignore` đã chặn các đường dẫn thông dụng.

### Bước 2 — Tạo dịch vụ Web Service trả phí

1. Truy cập https://dashboard.render.com, kết nối tài khoản GitHub.
2. Chọn **New → Web Service → Build and deploy from a Git repository**; chọn repo vừa tạo.
3. Chọn **Language: Node**, branch `main`, **Root Directory: để trống** nếu mã nguồn ở gốc repo.
4. **Build Command:** `npm install`.
5. **Start Command:** `npm start`.
6. Chọn một **paid instance** (ví dụ Starter) để gắn persistent disk; không chọn Free cho SQLite lưu điểm lâu dài.
7. Region: nên chọn khu vực gần học sinh trong những lựa chọn Render hỗ trợ.

### Bước 3 — Gắn persistent disk (BẮT BUỘC)

Trong bước tạo dịch vụ, mở **Advanced** để thêm Disk, hoặc sau khi tạo vào trang dịch vụ → **Disk → Add disk**:

- **Mount path:** `/var/data`
- **Size:** có thể bắt đầu với 1 GB nếu tùy chọn gói hiện tại hỗ trợ, theo dõi mức sử dụng thực tế.
- Chỉ dữ liệu dưới `/var/data` sống qua lần redeploy/restart. Nếu thêm disk sau khi đã chạy ở nơi khác, phải **di chuyển dữ liệu cũ trước**, nếu không ứng dụng sẽ khởi tạo một cơ sở dữ liệu mới.

### Bước 4 — Biến môi trường

Trong trang Web Service → **Environment → Add Environment Variable**:

| Key | Value | Mục đích |
| --- | --- | --- |
| `NODE_ENV` | `production` | Cookie HTTPS và chế độ production |
| `DB_PATH` | `/var/data/vocab.sqlite` | CSDL trên persistent disk |
| `REQUIRE_PERSISTENT_STORAGE` | `1` | Chặn cấu hình sai vị trí CSDL |
| `ADMIN_USERNAME` | `teacher` | Tài khoản giáo viên tạo **lần đầu** |
| `ADMIN_PASSWORD` | *mật khẩu mạnh riêng, ít nhất 10 ký tự* | Chỉ tạo tài khoản lần đầu; không đổi mật khẩu của DB đã có |
| `DEMO_SEED` | `0` | Không tạo học sinh và lớp mẫu |

**Không nhập mật khẩu vào GitHub hay file `.js`.** `PORT` được Render tự cấp, không cần đặt. `PUBLIC_ORIGIN` không cần đặt với miền `onrender.com` và proxy bình thường. Nếu dùng proxy/domain đặc biệt mà gặp lỗi CORS/Origin, đặt `PUBLIC_ORIGIN` là chính xác `https://ten-mien-cua-ban` (không có dấu `/` cuối).

### Bước 5 — Triển khai và kiểm tra

1. Bấm **Create Web Service / Deploy**.
2. Khi thông báo **Live**, mở URL Render cung cấp, dạng `https://ten-ban-chon.onrender.com`.
3. Mở `https://ten-ban-chon.onrender.com/api/health` → phản hồi phải có `"status":"ok"` và `"database":"ok"`.
4. Đăng nhập giáo viên bằng tài khoản đặt ở Bước 4. Tạo lớp 6–12 và tạo bài cho lớp tương ứng.
5. Ở mục **Lớp học**, sao chép mã lớp gửi vào nhóm Zalo. Học sinh vào link, chọn **Đăng ký học sinh**, nhập tên, tài khoản, mật khẩu cá nhân và mã lớp, sau đó đăng nhập.
6. Học sinh làm bài, giáo viên chọn bài trong dashboard để xem người đã/chưa làm, điểm cao nhất, điểm gần nhất, tổng lượt và lượt đã nộp.
7. Mở bài bằng Chrome (Android/Windows), Safari (iPhone/iPad), Edge và Firefox để kiểm thử thực tế. Mở trên mạng di động 4G để chắc chắn website truy cập từ bên ngoài trường.
8. **Kiểm thử lưu bền vững:** tạo một tài khoản học sinh kiểm thử và nộp bài; vào Render → Manual Deploy / Restart; mở lại website, xác minh tài khoản và kết quả vẫn tồn tại.

### Bước 6 — Sao lưu để giảm nguy cơ mất dữ liệu

- Đăng nhập giáo viên → nút **Sao lưu dữ liệu** trên dashboard: tải file `.sqlite` snapshot nhất quán của cơ sở dữ liệu.
- **Tải về sau mỗi ngày kiểm tra** hoặc ít nhất mỗi tuần; lưu trong vị trí riêng tư, được bảo vệ truy cập, và tạo một bản thứ hai ở nơi khác. **Không chia sẻ file sao lưu với học sinh.**
- Persistent disk **không thay thế backup**. Các snapshot của hạ tầng và backup do giáo viên tải xuống phục vụ mục đích khác nhau.
- Để **khôi phục**, dừng Web Service và thay thế DB theo quy trình quản trị có kiểm chứng, sao lưu DB hiện hữu trước; không ghi đè trực tiếp SQLite khi dịch vụ đang chạy. Với người chưa quen máy chủ, nên nhờ quản trị viên thực hiện.
- Bản này có nút sao lưu **thủ công**, chưa tự động chuyển bản sao ra lưu trữ ngoài. Đối với dữ liệu học sinh quan trọng, nên lập quy trình sao lưu ngoài hằng ngày và diễn tập khôi phục.

### Cảnh báo về gói Render Free

**KHÔNG DÙNG Render Free + SQLite trên filesystem mặc định để lưu điểm chính thức.** Free không có persistent disks, nên dữ liệu có thể mất sau restart/redeploy. Render Postgres Free cũng có giới hạn vòng đời: tài liệu Render nêu cơ sở dữ liệu Free hết hạn sau 30 ngày. Xem: https://render.com/docs/free ; https://render.com/docs/disks .

## B. Chạy trên máy tính để kiểm tra

Cần Node.js >=22.13 (khuyến nghị Node 22 LTS). Không cần cài package bên ngoài.

```bash
cd english-vocab-daily-render
npm run check
npm start
```

Mở http://localhost:3000. Mặc định chỉ chạy demo trên máy tính: giáo viên `teacher` / `Teacher@123`, học sinh `student6`…`student12` / `Student@123`. Tài khoản mẫu **không được dùng cho production**. Để chạy local với dữ liệu sạch, đặt `DEMO_SEED=0`, `ADMIN_PASSWORD` mạnh và `DB_PATH` trỏ đến một file SQLite mới. Nếu DB đã tồn tại, đổi `ADMIN_PASSWORD` trong env không tự đổi mật khẩu tài khoản.

## C. Cấu trúc thư mục

- `server.js`: Node.js web service, APIs, SQLite, phân quyền, đồng hồ chấm bài trên server, sao lưu DB.
- `seed.js`: câu hỏi từ vựng **minh họa** lớp 6–12.
- `public/index.html`, `style.css`, `app.js`: frontend responsive, giao diện giáo viên và học sinh.
- `data/`: SQLite mặc định chỉ dùng khi thử nghiệm trên máy cá nhân (không đưa vào GitHub).

## D. Tính năng và giới hạn minh bạch

- **Có:** 20 câu trắc nghiệm, 10 phút, 2 lượt, thứ tự câu/đáp án trộn, chấm tại backend, khóa đáp án trước khi giáo viên công bố, phân quyền, mã lớp, dashboard, CSV, sao lưu SQLite thủ công, trạng thái mất mạng, lưu bản nháp tạm trên trình duyệt và tự thử đồng bộ khi mạng trở lại.
- **Không có:** bộ đề đã được xác minh chính thức theo từng Unit Global Success; giao diện nhập/sửa câu hỏi; hệ thống đổi/khôi phục mật khẩu; quản trị đa giáo viên nâng cao; tự động backup ngoại vi; kiểm thử tải thực tế 300 học sinh cùng nộp vào một giây.
- **Khi mất mạng:** máy giữ bản nháp tạm trên thiết bị; bài chỉ được tính khi server nhận được. Nếu quá giờ khi chưa đồng bộ thì đáp án chưa gửi **không được bảo đảm tính điểm**. Nên nhắc học sinh duy trì mạng ổn định khi làm bài.
- **Quy mô:** kiến trúc SQLite một instance phù hợp lớp quy mô nhỏ-vừa và tải kiểm tra vừa phải; với 100–300 học sinh, phải thử tải ở điều kiện thực tế. Persistent disk chỉ cho một instance, không cho mở rộng nhiều instance đồng thời.
- **Danh tính:** đăng ký bằng mã lớp chỉ là cơ chế tham gia cơ bản, chưa xác minh danh tính học sinh ngoài đời. Giáo viên nên đối chiếu danh sách đăng ký.
- **Bảo vệ học sinh:** cần cơ chế chấp thuận và chính sách lưu/xóa dữ liệu phù hợp trước khi triển khai chính thức; không công khai danh sách điểm; thay mật khẩu mẫu ngay.

## E. Kiểm thử nhanh

1. Đăng nhập giáo viên → tạo lớp, giao bài.
2. Đăng ký học sinh bằng mã lớp → đăng nhập → làm → nộp → điểm xuất hiện trên dashboard.
3. Học sinh làm lượt thứ hai → số lượt thành 2, **số học sinh hoàn thành không tăng lần thứ hai**; lượt thứ ba bị chặn.
4. Mở 2 tab/thiết bị thử mạng yếu; xác minh bản nháp tự lưu và việc đăng nhập lại.
5. Dashboard → xuất CSV và Sao lưu dữ liệu; tải file về và lưu an toàn.
6. Restart Web Service sau khi đã lưu dữ liệu → xác minh vẫn còn điểm.

## Nguồn triển khai Render

- https://render.com/docs/web-services
- https://render.com/docs/disks
- https://render.com/docs/configure-environment-variables
- https://render.com/docs/free
- https://render.com/docs/deploys

## D. Phiên bản mở rộng: ngân hàng câu hỏi theo Unit

Dashboard giáo viên có thẻ **Ngân hàng câu hỏi**. Giáo viên có thể dán bảng 8 cột sao chép từ Excel, không cần biết lập trình:

`Từ khóa | Câu hỏi | A | B | C | D | Đáp án đúng (A/B/C/D) | Giải thích`

*Các cột trong dữ liệu dán phải được phân cách bằng TAB (Excel tự tạo TAB khi sao chép).* Một lượt nhập tối đa 200 câu. Khối 6–12, tên Unit tối đa 100 ký tự. Câu hỏi nhập thêm chỉ hiện trong tài khoản giáo viên đã tạo. Giáo viên phải duyệt nội dung và quyền sử dụng học liệu. **Một Unit phải có ít nhất 20 câu hỏi** trước khi tạo bài, và đề sẽ lấy 20 câu ngẫu nhiên thuộc đúng Unit đó. Mỗi câu có 4 lựa chọn và 1 đáp án đúng.

Đối với bộ mặc định, Unit tên chính xác là `Tổng ôn minh họa`; đây chỉ là bộ tổng ôn ví dụ, không phải dữ liệu đã đối chiếu sách Global Success.

## E. Trạng thái kiểm thử

Đã thực hiện kiểm thử API thực tế trên Node 22: tạo tài khoản giáo viên, tạo lớp, nhập 20 câu theo Unit, giao bài, đăng ký học sinh, hai lần làm bài, ngăn lượt thứ ba và xác minh dashboard chỉ tính một học sinh hoàn thành. Không có cam kết chịu tải 300 học sinh cùng lúc, chưa xác minh trên tất cả điện thoại và trình duyệt thực tế. Để dùng chính thức, cần thử tải và sao lưu/khôi phục độc lập.
