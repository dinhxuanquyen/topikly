# Topikly — hướng dẫn cho Claude

Web học & luyện thi tiếng Hàn cho người Việt, bắt đầu từ TOPIK II. Xem `README.md` để biết định vị, sơ đồ trang, kiến trúc và mô hình dữ liệu.

## Tài liệu cần đọc
- `docs/01-phan-tich-chuyen-mon.md` — cấu trúc đề, bản đồ dạng câu, rubric Viết, điểm yếu người học Việt
- `docs/02-lo-trinh-trien-khai.md` — các giai đoạn và hạng mục
- `docs/03-phan-tich-tham-khao-migii.md` — đối thủ tham chiếu
- `docs/04-phan-cong-agent.md` — đội agent, vùng file, luồng làm việc

## Quy ước
- Ngôn ngữ: tài liệu, giao diện, lời giải và commit message viết bằng **tiếng Việt**; ví dụ và nội dung đề bằng tiếng Hàn.
- Commit/PR: **không** thêm dòng `Co-Authored-By: Claude` hay bất kỳ ghi công/logo Claude nào.
- Không commit/push khi người dùng chưa yêu cầu.
- Dùng subagent trong `.claude/agents/` theo đúng vùng file ở `docs/04-phan-cong-agent.md`; agent soạn nội dung không tự duyệt nội dung của mình.
- Cấu trúc đề thi (số câu, thời gian, ngưỡng cấp) là dữ liệu cấu hình theo `programs`, không hard-code.

## Nội dung & bản quyền
- Không sao chép đề thi gốc NIIED hay nội dung của nền tảng/sách khác. Tự biên soạn đề mô phỏng.
- Mọi câu hỏi phải có `type_code`, `subskill`, `difficulty`, lời giải tiếng Việt và ghi chú cho từng phương án nhiễu.
- Nội dung do AI soạn phải qua `topik-content-reviewer` và người dùng duyệt trước khi import.
