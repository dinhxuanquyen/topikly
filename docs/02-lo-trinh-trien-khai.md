# 02 · Lộ trình triển khai Topikly

> Dựa trên [01 · Phân tích chuyên môn](01-phan-tich-chuyen-mon.md) và [03 · Phân tích tham khảo Migii](03-phan-tich-tham-khao-migii.md).
> Mốc thời gian giả định **1–2 developer + 1 người phụ trách nội dung** làm bán thời gian. Làm toàn thời gian có thể rút ngắn khoảng 40%.

## Định hướng sau khi tham khảo Migii

- **Khung sản phẩm theo Migii:** 5 trụ điều hướng *Lý thuyết · Lộ trình · Luyện tập · Đề thi · Nâng cấp* + Blog.
- **Phạm vi:** bắt đầu **TOPIK II** (cấp 3–6), nhưng dữ liệu thiết kế theo "chương trình thi" để sau mở **TOPIK I** và **EPS-TOPIK** mà không phải viết lại.
- **Khác biệt:** độ sâu sư phạm cho người Việt — lời giải phân tích phương án nhiễu, kỹ năng con cho từng câu, Viết có 원고지 + rubric, Hán-Việt theo hình vị, dùng thử không cần tài khoản.

## Tổng quan

```
Giai đoạn 0 ── Nền móng nội dung & kỹ thuật ───────────── 2 tuần
Giai đoạn 1 ── MVP: Luyện tập + Đề thi + Lý thuyết cơ bản ─ 8 tuần   → beta
Giai đoạn 2 ── Lộ trình theo ngày + Viết AI ──────────── 6 tuần   → điểm khác biệt
Giai đoạn 3 ── Hán-Việt, SRS, IBT, Premium ───────────── 6 tuần   → thu phí
Giai đoạn 4 ── Mở rộng: Nói, TOPIK I, EPS, app ───────── liên tục
```

## Tiến độ

> Cập nhật 2026-10-29 (sau giao diện mới, màn mobile và Blog lô 1). ✅ xong · 🚧 đang làm · ⏳ chưa bắt đầu.

| Giai đoạn | Hạng mục | Trạng thái |
|---|---|---|
| 0 | Taxonomy dạng + kỹ năng con, đặc tả biên soạn (content-spec v0.3), 22 câu mẫu | ✅ |
| 0 | Next.js + schema đa chương trình (Drizzle/Supabase), script validate nội dung, CI, khung 5 trụ | ✅ (chưa có staging) |
| 1 | Trang chủ, điều hướng 5 trụ, chế độ khách (IndexedDB) | ✅ |
| 1 | Đăng nhập Google/email, chuyển tiến độ khách lên tài khoản | ⏳ cần dự án Supabase |
| 1 | Trình làm bài trắc nghiệm (luyện tập + làm đề, đánh dấu, đồng hồ) | ✅ |
| 1 | Trình phát audio: chế độ thi (phát 1 lần) / chế độ luyện (tua, 0.75–1.25×, lời thoại song ngữ) | ✅ (chế độ thi chờ Mini test Nghe để chạy thật) |
| 1 | Luyện tập Nghe / Đọc / Viết theo dạng | ✅ (Viết: đề + đếm ký tự + bài mẫu) |
| 1 | Mini test Đọc, chấm + quy đổi cấp + kết quả theo dạng | ✅ |
| 1 | Mini test Nghe (nghe-01, 20 câu / 25 phút, luật bắt buộc audio khi xuất bản) | 🚧 đề nháp đã duyệt nội dung, chờ audio |
| 1 | Mini test Viết (viet-01, W51–W54 / 50 phút, tự chấm theo bài mẫu → điểm /100 và cấp ước lượng) | ✅ (đề nháp đã duyệt nội dung, chờ điền `reviewed_by`) |
| 1 | Full test | ⏳ cần nội dung + audio (đề nhiều phần Nghe + Viết + Đọc đã hỗ trợ ở backend) |
| 1 | Lý thuyết: từ vựng, Hán tự, ngữ pháp, bảng so sánh | ✅ |
| 1 | Test trình độ (placement-01, 12 câu Đọc) | ✅ |
| 1 | Blog: trang danh sách / chuyên mục / bài, SEO (metadata, JSON-LD, sitemap, robots), 5 bài đầu ([blog-spec](blog-spec.md)) | ✅ (bài nháp đã duyệt nội dung, chờ điền `reviewed_by`) |
| 1 | Giao diện mới theo Figma: xanh da trời, Nunito, nút kiểu phím, mèo Topi; landing có câu làm thử thật và "Bài viết mới" | ✅ |
| 1 | Mobile: màn "Hôm nay" (mục tiêu ngày, chuỗi ngày học từ chế độ khách), chế độ tập trung khi làm bài, tổng kết buổi học | ✅ |
| 1 | Beta 20–50 người | ⏳ cần đăng nhập + staging |

**Nội dung hiện có / mục tiêu MVP:** 45 câu luyện / ~300 · 3 Mini test / 2 Full + 4 Mini · ~50 từ vựng / ~1.500 · 10 điểm ngữ pháp / ~100 · 5 bài blog / 5–10. Câu Nghe đều chưa có audio (`audio_url: null`) nên đang hiển thị lời thoại. Toàn bộ nội dung còn `reviewed_by: null`, chờ người dùng duyệt.

---

## Giai đoạn 0 — Nền móng (2 tuần)

**Nội dung**
- [ ] Chốt **taxonomy dạng + kỹ năng con** (`L01`–`L50`, `R01`–`R50`, `W51`–`W54`; kỹ năng con như `purpose`, `attitude`, `insert_sentence`, `headline`…).
- [ ] Chốt danh sách **từ vựng & ngữ pháp theo cấp 3–6** (nguồn, giấy phép, định dạng).
- [ ] Viết **đặc tả biên soạn** từng dạng + checklist kiểm duyệt.
- [ ] Soạn mẫu 10 câu Đọc, 10 câu Nghe, 1 đề Viết 53, 1 đề Viết 54 kèm lời giải tiếng Việt.

**Kỹ thuật**
- [ ] Chốt hướng triển khai (README · mục 4).
- [ ] Schema CSDL có tầng `programs` (topik-ii, topik-i, eps) ngay từ đầu.
- [ ] Repo, lint/format, CI, môi trường staging; định dạng file nội dung + script validate.
- [ ] Bộ khung giao diện (design tokens, font Hàn, layout 5 trụ) chạy tốt trên điện thoại.

**Đầu ra:** `docs/content-spec.md`, schema đã review, 20 câu mẫu đã duyệt, khung web chạy được.

---

## Giai đoạn 1 — MVP (8 tuần)

Mục tiêu: người học **vào là làm được ngay** (không bắt đăng nhập), luyện theo dạng, làm trọn đề thi thử, tra từ vựng/ngữ pháp.

| Tuần | Hạng mục |
|---|---|
| 1 | Trang chủ, điều hướng 5 trụ, **chế độ khách** (lưu tiến độ tạm trên máy) |
| 2 | Đăng nhập Google/email; chuyển tiến độ từ chế độ khách lên tài khoản |
| 2–3 | Trình làm bài trắc nghiệm: đoạn văn/bảng/hình, chọn đáp án, đánh dấu, đồng hồ |
| 3–4 | Trình phát audio: chế độ thi (phát 1 lần) / chế độ luyện (tua, 0.75–1.25×, transcript song ngữ) |
| 4–5 | **Luyện tập**: Nghe / Đọc / Viết theo dạng; thẻ dạng hiển thị số câu đúng + tỉ lệ đúng |
| 5–6 | **Đề thi**: Full test (180') + Mini test (từng kỹ năng); chấm, quy đổi cấp; trang kết quả theo dạng & kỹ năng con |
| 6–7 | **Lý thuyết**: từ vựng theo cấp (đánh dấu đã thuộc/chưa thuộc), ngữ pháp theo cấp và theo chức năng |
| 7 | **Test trình độ** ngắn (10–15 câu, ~10 phút) → gợi ý cấp xuất phát |
| 8 | Blog (5–10 bài SEO đầu tiên), landing, kiểm thử, beta 20–50 người |

**Nội dung tối thiểu khi ra mắt:** 2 Full test + 4 Mini test + ~300 câu luyện theo dạng; ~1.500 từ vựng cấp 3–4; ~100 điểm ngữ pháp cấp 3–4.

**Viết ở MVP:** đề + ô viết có đếm ký tự (kể cả khoảng trắng) + bài mẫu để tự so sánh.

**Chỉ số thành công:** ≥40% người dùng beta làm xong ít nhất 1 Mini test; ≥25% quay lại trong tuần thứ hai; ≥30% khách chuyển thành tài khoản.

---

## Giai đoạn 2 — Lộ trình & Viết (6 tuần)

### 2A. Lộ trình theo ngày
- [ ] Người học nhập **cấp mục tiêu + ngày thi + số phút/ngày** (hoặc chọn nhanh 30/60/90/180 ngày như Migii).
- [ ] Sinh kế hoạch theo ngày: từ vựng + ngữ pháp + luyện dạng + Mini test cuối tuần; ưu tiên dạng yếu từ test trình độ.
- [ ] Mở khoá tuần tự trong lộ trình (học xong ngày trước mới mở ngày sau); luyện tự do vẫn mở.
- [ ] Theo dõi tiến độ theo ngày, chuỗi ngày học (streak), nhắc học qua email/thông báo đẩy PWA.
- [ ] Tự điều chỉnh: bỏ lỡ ngày → dồn/giãn lịch; điểm Mini test thấp → thêm bài cho dạng yếu.

### 2B. Viết có chấm AI
- [ ] Trình soạn **chế độ 원고지** (lưới ô, quy tắc dấu câu, lùi đầu đoạn) và **chế độ IBT** (ô gõ thường).
- [ ] **Kiểm tra quy tắc tức thì** (không tốn API): đếm ký tự, phát hiện -요/-습니다 trong 53–54, chép đề, thiếu ý đề 54.
- [ ] **Chấm AI theo rubric 3 tiêu chí** → điểm ước lượng, nhận xét tiếng Việt, đánh dấu lỗi trên câu, bản sửa, bài mẫu ở cấp mục tiêu.
- [ ] Hiệu chỉnh với ~50 bài giáo viên đã chấm (mục tiêu lệch trung bình ≤ ±5 điểm ở câu 54).
- [ ] Thư viện **biểu hiện viết** theo chức năng (so sánh số liệu, nêu nguyên nhân, kết luận…).
- [ ] Giới hạn lượt chấm/ngày cho tài khoản miễn phí.

**Chỉ số thành công:** ≥35% người dùng hoạt động có lộ trình đang chạy; ≥30% nộp ít nhất 1 bài Viết/tuần.

---

## Giai đoạn 3 — Hán-Việt, SRS, IBT & Premium (6 tuần)

- [ ] **Hán-Việt theo hình vị**: mỗi từ Hán-Hàn có Hán tự + âm Hán-Việt; bấm âm tiết → gia đình từ; bài tập đoán nghĩa; đánh dấu bạn giả.
- [ ] **SRS (FSRS)** cho từ vựng & ngữ pháp; thêm thẻ trực tiếp từ đoạn văn/transcript đang làm.
- [ ] **Ngữ pháp gần nghĩa**: bảng so sánh + bài tập phân biệt.
- [ ] **Chế độ thi IBT**: giao diện máy, gõ phím Hangul, bài luyện gõ.
- [ ] **Hard test** (đề nâng độ khó cho người nhắm cấp 5–6).
- [ ] 받아쓰기 (chép chính tả) & shadowing cho phần Nghe.
- [ ] **Premium**: thanh toán nội địa (VNPay/MoMo), quyền lợi theo gói, giới hạn thiết bị, offline đầy đủ.

### Gói đề xuất (tham chiếu giá Migii)

| | Miễn phí | Premium |
|---|---|---|
| Luyện theo dạng | Toàn bộ dạng, giới hạn số câu/ngày | Không giới hạn |
| Đề thi | 2 Full + toàn bộ Mini | Tất cả Full / Mini / Hard / IBT |
| Lời giải | Đáp án đúng | + phân tích từng phương án nhiễu |
| Chấm Viết AI | 1 bài/ngày | 10 bài/ngày |
| Lộ trình | Có | + tự điều chỉnh thích ứng |
| Quảng cáo | Không che nội dung | Không có |

Mức giá thử nghiệm: thấp hơn hoặc ngang Migii (~500–850k/năm), ưu đãi người dùng beta.

---

## Giai đoạn 4 — Mở rộng (liên tục)

- **Nói** (TOPIK Speaking): ghi âm, chấm phát âm & nội dung bằng AI.
- **TOPIK I** và **EPS-TOPIK**: tái dùng nền tảng, chỉ thêm nội dung + cấu hình chương trình thi.
- App di động (Expo) khi cần thông báo đẩy và offline mạnh hơn PWA.
- Không gian giáo viên/trung tâm: tạo lớp, giao đề, thống kê lớp, chấm Viết thủ công kèm gợi ý AI.
- Cộng đồng: thảo luận dưới mỗi câu, bảng xếp hạng thi thử hằng tuần.

---

## Rủi ro chính & cách giảm thiểu

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Thiếu nội dung chất lượng (nút thắt lớn nhất) | Cao | Bắt đầu từ Giai đoạn 0; AI soạn nháp → người duyệt; ưu tiên dạng hay sai |
| Đối thủ (Migii…) đã có nhiều đề và người dùng | Cao | Không đua số lượng đề; đua chất lượng giải thích, Viết, Hán-Việt, trải nghiệm |
| Bản quyền đề thi gốc | Cao | Không dùng lại đề NIIED cho mục đích thương mại khi chưa xác nhận quyền; tự biên soạn |
| AI chấm Viết sai lệch | Trung bình | Hiệu chỉnh với bài giáo viên chấm; ghi rõ "điểm ước lượng"; cho phép báo sai |
| Chi phí API AI | Trung bình | Rule check chạy trước; cache; giới hạn lượt miễn phí |
| NIIED đổi format / IBT | Trung bình | Cấu trúc đề định nghĩa bằng dữ liệu, không hard-code |
