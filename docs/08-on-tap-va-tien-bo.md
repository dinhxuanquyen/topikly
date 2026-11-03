# Ôn tập và tiến bộ của khách

Bốn tính năng dùng dữ liệu học thật trong trình duyệt, không yêu cầu đăng nhập.

## Sổ câu sai

`/topik-ii/luyen-tap/on-tap` tổng hợp câu luyện có kết quả gần nhất sai hoặc đã đánh dấu. Lọc theo Nghe/Đọc và dạng câu; mỗi phiên tối đa 10 câu. Đáp án cũ được ẩn khi bắt đầu phiên mới, dấu đánh dấu vẫn giữ. Làm đúng đưa câu khỏi danh sách sai, không xóa lịch sử. Câu không còn trong ngân hàng không xuất hiện.

API `/api/practice/review` chỉ trả câu công khai, kiểm tra chương trình, id duy nhất và giới hạn 10 câu. Chấm qua API có sẵn. Chưa gom câu sai từ đề thi vì đề thi có kho dữ liệu riêng.

## Flashcard

`/topik-ii/ly-thuyet/tu-vung/on-tap` ưu tiên thẻ đến hạn, sau đó từ mới, tối đa 10 thẻ mỗi phiên. Mặt trước là tiếng Hàn; mặt sau có nghĩa, Hán-Việt, ví dụ và cảnh báo bạn giả nếu có. Lọc theo cấp.

Lịch ôn tăng dần, chưa phải FSRS: chưa nhớ = 10 phút; khó = tối thiểu 1 ngày, nhân 1,2 khoảng cũ; nhớ = tối thiểu 3 ngày, nhân 2; dễ = tối thiểu 7 ngày, nhân 3. Làm tròn lên và giới hạn 365 ngày. Đây là lịch nhắc ôn, không phải dự đoán xác suất nhớ.

Lưu riêng tại `topikly:vocab-review:v1:<program>`, gồm thời điểm ôn, mức nhớ, số lượt và hạn tiếp theo. Dấu đã thuộc không bị tự thay đổi: từ đã thuộc không tự vào nhóm thẻ mới; thẻ đã học vẫn theo lịch riêng. Nếu ghi thất bại, giữ trong bộ nhớ và báo người học. Thay đổi từ tab khác cập nhật qua sự kiện storage.

## Tự ghi nhận lộ trình

Khi mở/quay lại Lộ trình hoặc Tiến bộ, đối chiếu dữ liệu và chỉ tự hoàn thành nhiệm vụ của hôm nay:

- Luyện tập: trả lời ít nhất 5 câu khác nhau thuộc đúng dạng; nếu dạng có ít hơn 5 câu thì cần làm hết số câu có sẵn. Không tính bỏ trống hoặc làm lại cùng một câu để đủ số lượng. Không yêu cầu tất cả câu đúng.
- Mini test: nộp đúng đề được xếp cho hôm nay.
- Từ vựng: đánh giá flashcard của đúng từ hôm nay, kể cả mức chưa nhớ.

Kế hoạch mới lưu `createdAt`, bỏ qua hoạt động trước lúc tạo. Kế hoạch cũ vẫn tương thích, chỉ dùng hoạt động trong ngày. Không tự đánh dấu ngữ pháp khi chỉ mở trang. Giữ dấu thủ công, không hoàn thành các ngày tương lai hay ngày học bù bằng một lượt học hôm nay. Người học vẫn có thể tự đánh dấu hoặc bỏ dấu; lần đồng bộ hoạt động tiếp theo có thể ghi nhận lại nếu đủ điều kiện.

## Tiến bộ

`/topik-ii/tien-do` và `/tai-khoan` hiển thị số câu khác nhau, tỉ lệ đúng lần gần nhất, tổng lượt trả lời, số từ đã thuộc, 7 ngày luyện tập, dạng còn sai, tiến độ lộ trình và 10 lần thi gần nhất còn lưu. Kho đề thi giữ tối đa 10 lần mỗi đề; không diễn giải đây là toàn bộ lịch sử vĩnh viễn. Phần Viết tự chấm hoặc chưa chấm được ghi nhãn riêng.

Ngày học tính theo giờ trên thiết bị như lộ trình hiện tại. Chưa có đồng bộ tài khoản; xóa dữ liệu trình duyệt sẽ mất tiến độ.

## Giao diện

Áp dụng hướng Editorial greeting, seed `1623195957`, giữ Nunito/Pretendard và bảng màu Topikly. Giữ thanh điều hướng và khung trang có sẵn thay vì thêm sidebar. Đặc trưng là cặp Hangul/Hán-Việt trên flashcard và các dạng câu TOPIK có kết quả thật. Sổ câu trả lời “cần ôn câu nào?”, flashcard trả lời “từ nào đến hạn?”, trang tiến bộ trả lời “đã học gì và nên luyện gì tiếp?”. Không có số liệu minh họa hoặc ảnh cần thay.

Trên điện thoại, sổ câu dùng chế độ tập trung với nút thoát riêng để thanh điều hướng không che nút nộp. Các khối tiến bộ giữ chiều cao theo nội dung, kể cả khi chưa có dữ liệu.

## Kiểm tra

- TypeScript, ESLint và 1.020 kiểm thử Vitest đạt (74 file).
- Build production đạt, sinh 328 trang. Cấu hình local chưa có `NEXT_PUBLIC_SITE_URL`, nên canonical/sitemap vẫn dùng địa chỉ dự phòng có sẵn; cần đặt khi triển khai.
- 76 kiểm thử Playwright có sẵn cho luyện tập, lộ trình, lý thuyết và 404 đạt ở desktop và mobile trên production.
- Thử trực tiếp trên trình duyệt: lật và đánh giá flashcard lưu một lượt với lịch 3 ngày; câu R10 sai được ôn lại từ đầu, trả lời đúng ra khỏi sổ sai nhưng giữ đánh dấu; trang tiến bộ hiển thị 1 câu, 2 lượt, 100% đúng lần gần nhất; tạo kế hoạch rồi làm L01 tự đánh dấu đúng nhiệm vụ hôm nay, không đánh dấu từ/ngữ pháp.
- Đã xem giao diện ở 1440, 768 và 390px. Khung giữa giữ cùng chiều rộng với các trang học hiện có; cảnh báo `unused-canvas` của inspector nhận nhầm điều hướng ngang là sidebar, hai lề nội dung thực tế bằng nhau.
- Inspector sổ câu: 0 FAIL, 0 WARN. Flashcard: 0 FAIL, 1 WARN về khoảng trống sau chân trang trên desktop; giữ vì đây là màn bắt đầu phiên ngắn, không thêm nội dung trang trí để lấp màn hình. Source lint giao diện: 0 FAIL, 0 WARN.
- Inspector tiến bộ sau chỉnh sửa: 0 FAIL, 2 WARN (`unused-canvas` như trên và `ragged-row`). Chấp nhận chênh chiều cao ở trạng thái chưa có dữ liệu để khối dạng yếu thu theo nội dung, không kéo một thẻ rỗng cao bằng lịch bảy ngày. Đã xem lại ảnh desktop, tablet và mobile của bản production cuối.
