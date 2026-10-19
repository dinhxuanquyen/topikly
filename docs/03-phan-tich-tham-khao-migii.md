# 03 · Phân tích tham khảo: Migii TOPIK

> Khảo sát ngày 19/10/2026 trên các trang công khai của `migii.net/vi` và `topik.migii.net/vi`, **không đăng nhập**. Phần nội dung bên trong bài học, câu hỏi và lời giải bị khoá sau đăng nhập/Premium nên chưa đánh giá được chất lượng chi tiết. Số liệu dưới đây là số Migii tự công bố trên trang.

---

## 1. Migii là gì

- **Nền tảng luyện thi đa chứng chỉ**: JLPT (Nhật), HSK/HSKK (Trung), TOPIK & EPS-TOPIK (Hàn), TOEIC (Anh). Mỗi kỳ thi là một subdomain riêng (`topik.migii.net`, `jlpt.migii.net`, `hsk.migii.net`), giao diện dùng chung.
- Có cả **web và app**, đồng bộ nhiều thiết bị, dùng offline (Premium).
- Đa ngôn ngữ giao diện: Việt, Anh, Indonesia.
- Tự công bố hơn 1.000.000 học viên (trên toàn nền tảng).

## 2. Kiến trúc thông tin của Migii TOPIK

```
topik.migii.net/vi
├── Lý thuyết
│   ├── Từ vựng: theo cấp 1–6, EPS (vd. cấp 1: 838 từ, có đếm "đã thuộc / chưa thuộc")
│   ├── Ngữ pháp: theo cấp (53 / 46 / 50 / 48 / 46 / 60 điểm ngữ pháp cho cấp 1→6) và theo biểu hiện
│   └── Nâng cao: Standard Korean 1–6, Korean Writing/Reading/Listening/Speaking 1–6,
│                 chủ đề giao tiếp, từ vựng theo chủ đề, chuyên ngành, Hán-Hàn (55 bài × ~40 từ)
├── Lộ trình
│   └── Test trình độ (8 câu / 8 phút) → chọn cấp → chọn 30 / 60 / 90 / 180 ngày → bài theo ngày + tracking
├── Luyện tập: TOPIK I · TOPIK II & Speaking · EPS
│   ├── Nghe   7 phần  (1–3, 4–8, 9–12, 13–16, 17–20, 21–36 "hội thoại ngắn", 37–50 "hội thoại dài")
│   ├── Đọc   13 phần  (1–2, 3–4, 5–8, 9–12, 13–15, 16–18, 19–24, 25–27, 28–31, 32–34, 35–38, 39–41, 42–50)
│   ├── Viết   3 phần  (51–52, 53, 54) — có nhãn "Chấm điểm AI"
│   └── Nói    6 phần
├── Đề thi: Full test · Mini test · Hard test  (TOPIK II: 3 "đề tham khảo" + 35 đề đánh số; 180 phút)
├── Tài liệu (ebook) · Blog SEO (kinh nghiệm, từ vựng, ngữ pháp, tài liệu, tin kỳ thi)
└── Nâng cấp (Premium)
```

Mỗi thẻ "phần" luyện tập hiển thị **số câu trả lời đúng + thanh tỉ lệ đúng** → người học thấy ngay dạng nào yếu.

## 3. Mô hình kinh doanh

**Freemium + quảng cáo.** Bảng so sánh trên trang (hai trang có con số hơi khác nhau, có thể do cập nhật không đồng bộ):

| | Miễn phí | Premium |
|---|---|---|
| Đề thi thử | 6–10 | 60–140 |
| Số câu hỏi | 2.000–2.500 | 10.000–12.000 |
| Dạng bài luyện | 15 | 49 |
| Thiết bị | 1 | 3 |
| Offline, bỏ quảng cáo, mẹo thi, lớp phát âm, từ vựng EPS | ✗ | ✓ |

**Giá Premium** (đang hiển thị giảm 50%): 6 tháng **569.000đ**, 1 năm **854.000đ**, trọn đời **1.424.000đ** (giá gốc gấp đôi). Định vị: "giá bằng 1/3 trung tâm".

**Kênh tăng trưởng quan sát được:** popup "đề dự đoán TOPIK mới nhất", testimonial, ảnh chứng chỉ người dùng, blog SEO theo chuyên mục, hỗ trợ qua Zalo/WhatsApp, linh vật + trợ lý AI tên "Mia".

---

## 4. Đánh giá chuyên môn

### 4.1 Điều Migii làm tốt — nên học theo

| Mẫu thiết kế | Vì sao hiệu quả | Áp dụng cho Topikly |
|---|---|---|
| Menu 5 trụ: Lý thuyết · Lộ trình · Luyện tập · Đề thi · Nâng cấp | Khớp đúng hành trình người học: học → có kế hoạch → luyện → kiểm tra | Giữ cấu trúc này làm khung điều hướng |
| Test trình độ siêu ngắn (8 câu/8 phút) | Ma sát thấp, người mới không ngại | Bài xếp lớp ngắn ở đầu, bài chẩn đoán đầy đủ để sau |
| Lộ trình theo số ngày (30/60/90/180) | Người học nghĩ theo "còn bao lâu đến ngày thi" | Lộ trình tính ngược từ **ngày thi thật** |
| Thẻ dạng bài có tỉ lệ đúng | Phản hồi tiến độ trực quan | Dashboard theo dạng ngay từ MVP |
| Full / Mini / Hard test | Phù hợp nhiều quỹ thời gian | Thêm Mini test (1 kỹ năng, ~20–30 phút) từ MVP |
| Học theo flow, mở khoá tuần tự | Giữ kỷ luật, tạo cảm giác tiến bộ | Dùng cho lộ trình, không khoá cứng ở luyện tự do |
| Đa kỳ thi trên cùng nền tảng | Tận dụng một hạ tầng cho nhiều sản phẩm | **Thiết kế dữ liệu theo "chương trình thi"** để sau thêm TOPIK I, EPS |
| Web + app, offline, đồng bộ | Người học Việt học nhiều trên điện thoại | PWA có cache offline sớm hơn kế hoạch cũ |
| Blog SEO theo chuyên mục | Nguồn người dùng miễn phí bền vững | Làm blog ngay từ giai đoạn MVP |

### 4.2 Khoảng trống — nơi Topikly có thể làm tốt hơn

1. **Rộng nhưng chưa chắc đã sâu.** Migii trải ra 4 ngôn ngữ, 7+ kỳ thi. Topikly tập trung **một kỳ thi (TOPIK II) cho một nhóm người học (người Việt)** → đầu tư sâu hơn vào sư phạm cho từng dạng câu.

2. **Phân nhóm dạng còn thô.** Migii gộp Nghe 21–36 thành "hội thoại ngắn", 37–50 thành "hội thoại dài", Đọc 42–50 thành "đoạn văn khó". Nhưng trong một nhóm đó có những kỹ năng rất khác nhau: tìm *mục đích*, *thái độ người nói*, *chèn câu*, *đọc văn học*. Topikly gắn nhãn **kỹ năng con** cho từng câu → chẩn đoán điểm yếu chính xác hơn (xem [01 · mục 2](01-phan-tich-chuyen-mon.md#2-bản-đồ-dạng-câu-hỏi-유형--xương-sống-của-dữ-liệu)).

3. **Hán-Hàn đang xếp theo vần tiếng Hàn** (bài 1 "vần 가", bài 2 "vần 거 겨 계"…) — thực chất là danh sách từ xếp theo bảng chữ cái. Topikly xếp theo **hình vị Hán**: một âm tiết gốc (學 – 학 – *học*) → cả gia đình từ → bài tập đoán nghĩa từ mới. Đây là cách khai thác Hán-Việt đúng bản chất. *(Chưa xem được nội dung bên trong bài của Migii nên chưa rõ họ có ghi âm Hán-Việt hay không.)*

4. **Viết.** Migii có chấm AI, nhưng trên trang công khai không thấy trình soạn 원고지, kiểm tra quy tắc (số ký tự, văn phong -요/-다) hay chấm theo 3 tiêu chí chính thức. Đây là phần quyết định cấp 4+ và vẫn là nơi tạo khác biệt lớn nhất.

5. **Trải nghiệm học bị gián đoạn.** Gần như mọi thao tác đòi đăng nhập ngay; popup quảng cáo che nội dung khi vừa vào trang luyện tập; phần lớn dạng bài có biểu tượng khoá. Topikly: **cho làm thử không cần tài khoản** (chế độ khách, lưu tạm trên máy), chỉ yêu cầu đăng nhập khi người học muốn lưu tiến độ; không dùng quảng cáo che nội dung.

6. **Bản quyền đề.** Migii có mục "Đề tham khảo số 102A/96A/91A" — nhiều khả năng dựa trên đề thi thật. Topikly không nên sao chép cách làm này cho mục đích thương mại khi chưa xác nhận quyền sử dụng (xem [01 · mục 5](01-phan-tich-chuyen-mon.md#5-bản-quyền--nguồn-nội-dung-rủi-ro-cần-xử-lý-sớm)).

7. **IBT.** Không thấy chế độ mô phỏng thi trên máy riêng. Topikly có thể làm sớm vì là web.

### 4.3 Định vị đề xuất

> **Migii** = "app luyện đề đa năng, nhiều đề, giá rẻ".
> **Topikly** = "người thầy TOPIK II cho người Việt" — ít đề hơn lúc đầu, nhưng mỗi câu được giải thích kỹ, chẩn đoán đúng dạng yếu, và **sửa bài Viết như giáo viên**.

Không nên cạnh tranh trực diện về **số lượng đề** ở giai đoạn đầu (Migii đã có 35+ đề TOPIK II, 10.000+ câu). Cạnh tranh bằng **chất lượng giải thích, Viết, Hán-Việt và trải nghiệm học không gián đoạn**.

---

## 5. Bảng đối chiếu tính năng

| Tính năng | Migii TOPIK | Topikly MVP | Topikly sau MVP |
|---|---|---|---|
| Từ vựng theo cấp | ✓ | ✓ (cấp 3–6) | + SRS FSRS |
| Ngữ pháp theo cấp & theo biểu hiện | ✓ | ✓ | + bảng so sánh ngữ pháp gần nghĩa |
| Hán-Hàn | Danh sách theo vần | — | **Cây hình vị + âm Hán-Việt + bạn giả** |
| Test trình độ | 8 câu | 10–15 câu | Bài chẩn đoán đầy đủ |
| Lộ trình theo ngày | 30/60/90/180 ngày | Tính ngược từ ngày thi | Thích ứng theo kết quả hằng tuần |
| Luyện theo dạng | 7 / 13 / 3 / 6 phần | Theo dạng + kỹ năng con | — |
| Lời giải | Có | Có, **kèm phân tích phương án nhiễu** | — |
| Full / Mini / Hard test | ✓ | Full + Mini | + Hard, + IBT |
| Chấm Viết AI | ✓ | — (đếm ký tự + bài mẫu) | **원고지 + rule check + rubric 3 tiêu chí** |
| Nói | ✓ | — | Giai đoạn 4 |
| TOPIK I / EPS | ✓ | — | Kiến trúc sẵn sàng, mở sau |
| Dùng thử không cần tài khoản | ✗ | ✓ | — |
| App / offline | ✓ | PWA cơ bản | PWA offline → app |
| Blog SEO | ✓ | ✓ | — |
| Giá | 569k/6 tháng · 854k/năm · 1,42tr trọn đời | Miễn phí (beta) | Freemium, mức giá tham chiếu Migii |
