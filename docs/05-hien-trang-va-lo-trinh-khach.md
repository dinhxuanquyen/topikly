# 05 · Hiện trạng dự án và lộ trình học của khách

Cập nhật ngày 2026-10-30, tiếp tục từ `main` tại `998e1f6`.

## Đánh giá hiện trạng

- Next.js App Router với Cache Components, React, TypeScript; nội dung YAML được validate rồi phục vụ qua truy vấn có cache. Cấu hình chương trình thi là nguồn cho cấp, thời lượng, cấu trúc đề.
- Đã có luyện tập Nghe/Đọc/Viết, Mini Đọc/Nghe/Viết, test trình độ, từ vựng và ngữ pháp, Blog/SEO, giao diện mobile và chế độ khách. Bài làm, kết quả và từ đã thuộc lưu trong trình duyệt.
- Trang Lộ trình trước đây mới có thẻ test trình độ và danh sách tính năng dự kiến. Đây là phần có thể tiếp tục mà không cần tài khoản dịch vụ bên ngoài.
- Nghe vẫn thiếu audio; Full test thiếu nội dung; đăng nhập và đồng bộ cần Supabase; staging và beta chưa thiết lập. Nội dung còn chờ người dùng duyệt cuối, không tự thay `reviewed_by`.

## Phần đã bổ sung

Người học chọn cấp mục tiêu từ cấu hình chương trình, ngày thi và 15/30/60/90 phút mỗi ngày. Có các mốc nhanh 30/60/90/180 ngày. Kế hoạch bắt đầu hôm nay, kết thúc trước ngày thi; hỗ trợ tối đa 366 ngày.

Danh mục lấy từ truy vấn công khai của từ vựng, ngữ pháp, câu luyện và đề Mini. Bộ lập lịch không nhận đáp án hoặc bài mẫu. Chỉ chọn nội dung có cấp không vượt mục tiêu; kho ít bài sẽ luân phiên ôn lại. Các dạng làm sai của kết quả placement gần nhất được ưu tiên hai trong ba ngày, nếu có nội dung phù hợp cấp mục tiêu. Ưu tiên được chụp khi tạo kế hoạch; muốn lấy kết quả placement mới thì tạo lại.

Mỗi ngày có từ vựng và ngữ pháp (mỗi mục 5 phút), thời gian còn lại dành cho luyện dạng. Ngày thứ 7 mỗi tuần thêm Mini test khi thời lượng đề không vượt ngân sách; thời gian còn lại mới dùng cho các mục khác. Mini Nghe thiếu audio không được xếp lịch; câu luyện Nghe chưa có audio có nhãn đọc lời thoại. Thời lượng học là gợi ý, không phải bằng chứng học đủ hay cam kết đạt cấp.

Người học mở bài qua liên kết, tự đánh dấu hoàn thành và xem ngày còn thiếu, tổng nhiệm vụ, chuỗi ngày hoàn thành. Chuỗi tính theo ngày thực tế đánh dấu xong trọn nhiệm vụ, tránh tăng chuỗi bằng cách làm bù nhiều ngày trong một ngày. Cho xem trước ngày tương lai nhưng chưa cho đánh dấu. Các ngày cũ vẫn mở để học bù; luyện tự do luôn mở.

Kế hoạch và dấu hoàn thành lưu đồng bộ vào localStorage riêng theo chương trình (`topikly:study-plan:v1:<program>`), để tải lại ngay vẫn giữ tiến độ. Tab khác cập nhật qua sự kiện storage. Dữ liệu đọc được kiểm tra cấu trúc, ngày và giới hạn số mục; dữ liệu hỏng được bỏ qua. Nếu trình duyệt chặn ghi, tiếp tục học trong bộ nhớ và báo rõ chưa lưu được. Tạo lại kế hoạch đặt lại dấu hoàn thành, giữ nguyên lịch sử bài làm/thi.

## Vùng mã

- `lib/planner/plan.ts`: hợp đồng dữ liệu, kiểm tra kế hoạch, xử lý ngày lịch, lập lịch thuần và chuỗi hoàn thành.
- `lib/planner/queries.ts`: danh mục nội dung thật có cache; cấp lấy từ cấu hình chương trình.
- `components/planner/`: lưu chế độ khách, biểu mẫu mục tiêu, danh sách nhiệm vụ và tiến độ.
- `app/[program]/lo-trinh/page.tsx`: trang thật thay placeholder, giữ thẻ test trình độ.

Logo ngừng prefetch trang chủ: trang này có câu làm thử kèm lời giải, không nên tự tải dữ liệu đó khi người học đang mở test trình độ. Liên kết về trang chủ vẫn hoạt động bình thường.

Kiểm thử toàn bộ phát hiện thêm hai điểm thiếu của bản trước: khối “Bắt đầu từ đâu” ở trang chủ đã mất sau đổi giao diện, và mô tả Blog chưa gắn ngôn ngữ Hàn nên có thể vỡ giữa từ. Đã khôi phục liên kết test trình độ/Mini theo danh mục đề thật và dùng bộ render chữ Hàn sẵn có cho tiêu đề/mô tả bài.

Giao diện giữ Nunito/Pretendard, thang xanh và điều hướng chung. Hướng tham chiếu của skill là Editorial greeting, seed `1636747419`; giữ khung hiện tại theo thương hiệu, không áp dụng sidebar mới. Màn hình trả lời câu hỏi “Hôm nay học gì để đến cấp mục tiêu?”, bằng danh sách bài thật, tiến độ từ thao tác thật và nhãn dạng ưu tiên. Không có dữ liệu minh họa hoặc ảnh mới.

## Phần còn lại

1. Supabase Auth và di chuyển dữ liệu khách sang tài khoản; đồng bộ nhiều thiết bị.
2. Tự ghi nhận nhiệm vụ từ kết quả học, mở khóa tuần tự, điều chỉnh lịch khi bỏ ngày hoặc điểm Mini thấp; nhắc học. Bản hiện tại dùng dấu hoàn thành thủ công và không tự chuyển lịch.
3. Audio có quyền sử dụng, duyệt cuối nội dung, mở rộng ngân hàng đề, rồi Full test.
4. Staging, beta và đo hành vi bằng dữ liệu người dùng thật.

Các hạng mục Viết AI, SRS, PWA và Premium tiếp tục theo tài liệu lộ trình; chưa triển khai trong thay đổi này.

## Kiểm tra giao diện

Đã xem biểu mẫu và màn nhiệm vụ ở 1440/768/390px, cùng khối liên kết trang chủ. Các nút mới có vùng bấm tối thiểu 44px; nút tạo kế hoạch 48px. Inspector cho trang Lộ trình: 0 FAIL, 1 WARN về khoảng trống trên desktop. Giữ cảnh báo này vì khung học được giới hạn chiều rộng và căn giữa, hai lề thực tế bằng nhau; công cụ nhầm phần điều hướng ngang với sidebar. Không có tràn ngang trong luồng E2E.

Vòng đánh giá cuối: nhìn đầu tiên thấy mục tiêu và nhiệm vụ; ý tưởng là chuyển kho bài TOPIK thật thành việc học từng ngày. Biểu mẫu là phần tương tác chính, danh sách nhiệm vụ và thanh tiến độ dùng dữ liệu thật. Bố cục: thiết lập = biểu mẫu hai cột/di động một cột; kế hoạch = tóm tắt + danh sách bài; trang chủ = bốn điểm vào học. Điểm tự đánh giá (không phải chỉ số tự động): thiết kế 8, dễ dùng 8, sáng tạo 6, nội dung 8 → trung bình 7,5/10. Giới hạn còn lại là kho bài ít, phải ôn lặp và tự đánh dấu; không có ảnh hoặc nội dung minh họa cần thay.

Các kiểm thử cũ đã cập nhật theo hành vi hiện có: 404 không còn là lỗi dự kiến; mobile dùng nút thoát của chế độ tập trung; kiểm tra phím tắt chờ hydration bằng cách thử lại thao tác phím thật.

## Kết quả kiểm thử cuối

- `npm run build`: đạt, tạo 315 trang; TypeScript đạt. Môi trường local chưa đặt `NEXT_PUBLIC_SITE_URL`, nên metadata dùng địa chỉ localhost theo cấu hình dự phòng có sẵn.
- Lint và kiểm tra Prettier: đạt.
- Vitest: 63 file, 960 test đạt, gồm 15 test mới cho bộ lập lịch, danh mục thật và giao diện/lưu trữ.
- Playwright production, Chromium, desktop và mobile: 242 test đạt; 2 test mobile trùng kiểm tra liên kết/sitemap trên desktop được bỏ qua theo điều kiện có sẵn. Có 6 lượt kiểm thử mới cho lộ trình.
- Validate nội dung: hợp lệ, 94 cảnh báo nội dung có sẵn (thiếu audio, chưa duyệt, tham chiếu Hán tự/cấp độ và một số cặp câu). Chưa có thay đổi nội dung để giả lập việc duyệt hoặc lấp cảnh báo.
