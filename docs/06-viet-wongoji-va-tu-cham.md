# Viết trên giấy ô và tự chấm

> Ghi chú tích hợp: khi đồng bộ `origin/main`, bản xem trước dưới đây đã được thay bằng trình soạn trực tiếp trong `docs/07-trinh-soan-wongoji.md`. Giữ trình soạn và kiểm tra quy tắc mới từ remote; phần điểm tự chấm, lưu nháp và xóa điểm khi sửa bài tiếp tục áp dụng. Mô tả bố cục ước tính và vùng mã bản xem trước bên dưới là lịch sử của bản đầu, không còn là hành vi hiện tại.

Ngày 2026-11-02. Phần luyện W53–W54 có bản xem giấy 원고지 cập nhật theo ô gõ, chuyển sang IBT để ẩn giấy mà giữ nguyên nội dung. Màn làm đề dùng lại bản xem giấy; điểm tự chấm của đề thi tiếp tục dùng luồng kết quả hiện có.

Ô textarea là bề mặt nhập liệu duy nhất, giữ bộ gõ Hàn, chọn chữ, dán và thao tác bàn phím gốc của trình duyệt. Giấy là bản xem trước bên dưới, không phải trình sửa từng ô. Trình đọc màn hình đọc nội dung qua ô gõ; các ô trang trí được ẩn để tránh lặp từng ký tự.

Bố cục theo quy ước ước tính trong dự án: 20 ô/dòng, thụt một ô đầu mỗi đoạn không rỗng, NFC, đếm code point, bỏ khoảng trắng cuối đoạn. Xuống dòng bắt đầu đoạn mới, dòng rỗng được bỏ qua. Mỗi dấu câu chiếm một ô; chưa thực hiện ghép hoặc treo dấu câu theo quy tắc giấy thi. Số ô làm tròn theo dòng và số ký tự là hai phép đếm khác nhau, được ghi rõ trên giao diện. Phần vượt khung được tô màu, không cắt bài. Giấy cuộn dọc khi dài, 20 cột co theo màn hình.

Sau khi tải bài mẫu, người học xem checklist, nhận xét theo ba tiêu chí và ghi một điểm chung. Thang điểm lấy từ `program.writing_points`, không suy ra từ nội dung hoặc dùng điểm AI. Điểm chỉ nhận số nguyên trong khung; đọc nháp kiểm tra kiểu và giới hạn. Nháp cũ vẫn đọc được. Sửa nội dung xóa điểm trước đó; xóa nháp xóa cả điểm. Điểm và bài viết lưu trên thiết bị theo đề, không đồng bộ tài khoản.

Các vùng mã: `lib/practice/manuscript-layout.ts`, `components/writing/manuscript-preview.tsx`, `components/writing/writing-runner.tsx`, `components/writing/writing-draft.ts`, `lib/practice/writing-source.ts`. Không sửa bài mẫu, lời giải hoặc trạng thái duyệt nội dung.

Hướng giao diện: Framed sheet, seed 1832412416; giữ khung điều hướng, màu và font hiện có. Giấy ô là phần nhận diện trực tiếp của bài viết tiếng Hàn. Câu hỏi chính là “Bài của mình chiếm bao nhiêu ô và tự đánh giá thế nào sau khi đối chiếu?”. Không có dữ liệu minh họa mới.

Kiểm tra: TypeScript và ESLint đạt; nhóm kiểm thử Viết đạt 79 test, sau đó thêm và chạy lại 10 test nháp (bao gồm điểm 0 của bài trống). Đã xem desktop, tablet và mobile, nhập bài thật qua trình duyệt, mở bài mẫu, nhập 22/30 và tải lại để xác nhận khôi phục cả điểm lẫn nội dung. Ở 390px giấy có 20 cột, không tràn ngang. Inspector: 0 FAIL, 2 WARN. Giữ cảnh báo khoảng trống vì khung đọc hiện có căn giữa với hai lề bằng nhau; cảnh báo canh số thuộc bảng thay thế của biểu đồ hiện có, không thuộc lưới ô hoặc ô điểm mới. Giấy mobile nhỏ để giữ đủ 20 cột, còn ô nhập vẫn dùng cỡ chữ dễ đọc. Chưa chạy production build hoặc toàn bộ E2E trong lần này.
