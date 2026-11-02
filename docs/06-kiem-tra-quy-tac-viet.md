# 06 · Kiểm tra quy tắc Viết tức thì

Cập nhật ngày 2026-11-02, tiếp tục từ `main` tại `56f3b9f`. Đây là bước 1 trong pipeline Viết của Giai đoạn 2B ([lộ trình](02-lo-trinh-trien-khai.md#2b-viết-có-chấm-ai)): bắt lỗi hình thức ngay trên máy người học, không gọi AI, không chấm điểm.

## Phạm vi

Quy tắc lấy từ [phân tích chuyên môn](01-phan-tich-chuyen-mon.md) mục 2.3 và [content-spec](content-spec.md) mục 4.6 ("Lỗi bị trừ" của W51–W54).

| Quy tắc | Dạng | Mức | Cách phát hiện |
|---|---|---|---|
| Văn phong -ㄴ다/-다 | W52–W54 | Lỗi | Từ cuối mỗi câu kết thúc bằng 요/죠 (trừ danh từ như 필요, 중요) hoặc 니다/니까 sau 습 hay âm tiết có patchim ㅂ; -십시오, -ㅂ시다 |
| Không chép đề | W53–W54 | Lỗi | Đoạn liên tiếp ≥ 20 ký tự (khoảng trắng đã gộp) trùng nguyên văn lệnh đề, nội dung đề hoặc đoạn văn |
| Không có tiêu đề | W53 lỗi, W54 lưu ý | | Dòng đầu ≤ 30 ký tự, không có dấu kết câu hay đuôi vị ngữ, phía sau còn dòng khác |
| Không gạch đầu dòng | W53–W54 | Lưu ý | Dòng bắt đầu bằng -, •, ·, *, 1., 1), ①, 가. … |
| Không thêm ý kiến cá nhân | W53 | Lưu ý | 나는, 내가, 필자는, 저는…; 생각한다, -아야 한다, 바람직하다 |
| Không xưng 저/제 | W54 | Lưu ý | Từ đứng riêng: 저는, 제가, 저의, 저희… |
| Không dùng khẩu ngữ | W53–W54 | Lưu ý | 너무, 진짜, 되게, 엄청, 근데, 그치만, 완전, 좀… |
| Không lạm dụng -는 것 같다 | W54 | Lưu ý | Từ 2 lần trở lên |
| Có chia đoạn | W54 | Lưu ý | Từ 300 ký tự mà vẫn một đoạn |
| Đúng một câu | W51–W52 | Lỗi | Chỗ trống có từ 2 câu |

Số ký tự (khung 200–300, 600–700) có trong `checkEssay` khi truyền `char_limit`, nhưng giao diện không truyền vì bộ đếm ký tự đã hiển thị trạng thái này.

Văn phong của W51 theo văn bản gốc, chỉ biết sau khi xem đáp án, nên không kiểm tra. **Thiếu ý đề 54** chưa làm: so khớp từ khoá dễ báo nhầm khi người học diễn đạt lại (điều mà đề khuyến khích), nên để cho bước chấm AI. Người học vẫn tự đối chiếu bằng danh sách ý bắt buộc khi xem bài mẫu.

## Nguyên tắc

- Chỉ bắt lỗi chắc chắn: mọi bài mẫu và đáp án đạt điểm tối đa trong kho nội dung (luyện tập và Mini Viết) phải không bị báo gì. Test chạy trên nội dung thật để giữ điều này khi thêm đề.
- Bài trống thì không hiện bảng. Lỗi có chữ "Lỗi"/"Lưu ý" và biểu tượng, không chỉ dựa vào màu; đoạn trích hiện bằng `lang="ko"`.
- Khi đang gõ, kiểm tra chạy trên giá trị hoãn (`useDeferredValue`) để không chặn bàn phím; vùng `aria-live` chỉ đọc dòng tóm tắt ("2 lỗi cần sửa · 1 lưu ý").
- Trong lúc làm đề thi không hiện (giống thi thật); sau khi nộp, trang kết quả Mini Viết hiện bảng tĩnh cho từng câu.
- Mỗi phát hiện có `start`/`end` trên văn bản gốc để sau này tô sáng trực tiếp trong 원고지.

## Vùng mã

- `lib/writing/rules.ts`: `checkEssay`, `checkBlank`, `classifyEnding`, `findCopiedSpans`; thuần, dùng được ở client và server (để bước chấm AI chạy trước khi gọi API).
- `components/writing/rule-check.tsx`: `RuleCheckPanel` (W53–W54) và `BlankRuleNote` (W51–W52).
- `components/writing/writing-runner.tsx`, `components/exam/exam-writing-result.tsx`: gắn vào Luyện tập Viết và kết quả đề.
- Lời nhắc tiếng Việt ở `components/i18n/vi.ts` → `writing.rules`.

## Còn lại của 2B

1. ~~Trình soạn 원고지 / IBT, tô sáng vị trí lỗi trong ô.~~ Đã làm, xem [07](07-trinh-soan-wongoji.md).
2. Chấm AI theo rubric 3 tiêu chí (cần khoá API, giới hạn lượt theo tài khoản), hiệu chỉnh với bài giáo viên chấm.
3. Thư viện biểu hiện viết theo chức năng.
