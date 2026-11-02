# 07 · Trình soạn 원고지

Cập nhật ngày 2026-11-02, tiếp theo [06 · Kiểm tra quy tắc Viết](06-kiem-tra-quy-tac-viet.md). Hạng mục Giai đoạn 2B: viết bài 53–54 trên giấy kẻ ô như bài thi giấy, hoặc trên ô gõ như bài thi máy (IBT).

## Người học thấy gì

- Trên ô viết của W53–W54 (Luyện tập và Mini test Viết) có hai nút **원고지 (giấy thi)** và **Ô gõ (máy, IBT)**. Lựa chọn lưu trên thiết bị (`topikly:writing-mode:v1`) và dùng chung cho mọi bài. Mặc định là ô gõ.
- Chế độ 원고지 vẽ khung đúng số ô của đề: W53 300 ô (15 dòng), W54 700 ô (35 dòng), mỗi dòng 20 ô, có mốc 100/200/… bên phải (ẩn trên điện thoại). Bài dài hơn khung thì hiện vạch "Hết khung" và các dòng tô đỏ.
- Bấm vào ô nào thì con trỏ tới chữ đó; phím lên/xuống đi theo dòng của giấy. Chữ bị kiểm tra quy tắc bắt lỗi được tô ngay trên ô.
- Dưới giấy hiện "Đã dùng X/300 ô · Y/15 dòng". Bộ đếm ký tự của đề vẫn hiện như cũ: hai con số có thể khác nhau và trang ghi rõ vì sao.

## Quy tắc xếp ô

1. Mỗi đoạn (một lần xuống dòng) bắt đầu dòng mới, thụt `indent_cells` ô. Khoảng trắng gõ ở đầu đoạn bị bỏ.
2. Mỗi âm tiết, dấu câu, ký hiệu, khoảng trắng một ô. Chữ số và chữ Latin thường hai chữ một ô.
3. Khoảng trắng rơi vào đầu dòng không viết. Sau dấu chấm, dấu phẩy không để ô trống; sau ? và ! vẫn để.
4. Dấu câu đóng rơi vào đầu dòng được viết chung ô cuối dòng trước.

Số ô mỗi dòng và số ô thụt lấy từ `ProgramConfig.manuscript`; khung ô = `char_limit.max` làm tròn lên theo dòng. Không hard-code. Mọi bài mẫu hiện có đều vừa khung theo cách xếp này (có test).

Quy tắc theo cách hướng dẫn 원고지 phổ biến cho bài 53–54. Số ô và số ô mỗi dòng của phiếu trả lời thật vẫn là mục cần đối chiếu A12 trong content-spec.

## Cách làm

Chữ vẫn gõ vào một ô nhập `textarea` thật, nên bộ gõ tiếng Hàn, dán, hoàn tác, nháp, trình đọc màn hình và kiểm thử cũ giữ nguyên. Ô nhập trong suốt và được đặt đúng tại ô con trỏ trên giấy, nên khung gợi ý của bộ gõ hiện cạnh chữ đang viết và trình duyệt cuộn theo con trỏ. Lưới giấy chỉ để nhìn (`aria-hidden`); ô nhập trỏ `aria-describedby` tới bộ đếm, gợi ý và số ô đã dùng.

- `lib/writing/manuscript.ts`: `layoutManuscript` (xếp ô, mỗi ô giữ vị trí trên văn bản gốc), `caretAt`, `offsetAt`, `frameRows`.
- `components/writing/manuscript-editor.tsx`: `ManuscriptGrid` (lưới, dùng lại được để hiện bài chỉ đọc) và `ManuscriptEditor`.
- `components/writing/essay-field.tsx`: nút chọn cách viết và ô viết chung cho Luyện tập (`writing-runner.tsx`) và Đề thi (`exam-writing.tsx`).
- `components/writing/writing-mode.ts`: lựa chọn cách viết, lưu localStorage.
- `WritingPrompt.manuscript`: cấu hình 원고지 gửi kèm đề W53–W54.

## Giới hạn và việc tiếp theo

- Chưa chọn vùng bằng kéo chuột trên giấy (Shift + phím mũi tên trong ô nhập vẫn chọn được, phần chọn được tô trên giấy). Home/End theo dòng giấy chưa làm.
- Dấu ngoặc kép thẳng (`"`) không phân biệt mở/đóng nên không treo cuối dòng.
- Có thể dùng `ManuscriptGrid` để hiện bài mẫu và bài đã nộp trên giấy ở phần tự so sánh.
