# Topikly 🇰🇷

**Web học & luyện thi tiếng Hàn cho người Việt — bắt đầu từ TOPIK II.**
Học lý thuyết theo cấp, đi theo lộ trình đến ngày thi, luyện từng dạng câu, thi thử như thật, được chấm bài Viết như có giáo viên, và học từ vựng qua cầu nối **Hán-Việt ↔ Hán-Hàn**.

> Trạng thái: 🚧 Giai đoạn 1 (MVP) đang làm — xem [bảng tiến độ](docs/02-lo-trinh-trien-khai.md#tiến-độ).
> Mô hình sản phẩm tham khảo [Migii TOPIK](https://topik.migii.net/vi/) — xem [phân tích tham khảo](docs/03-phan-tich-tham-khao-migii.md).

---

## Mục lục

1. [Định vị](#1-định-vị)
2. [Sơ đồ trang (5 trụ)](#2-sơ-đồ-trang-5-trụ)
3. [Tính năng](#3-tính-năng)
4. [Các hướng triển khai](#4-các-hướng-triển-khai)
5. [Kiến trúc đề xuất](#5-kiến-trúc-đề-xuất)
6. [Mô hình dữ liệu](#6-mô-hình-dữ-liệu)
7. [Cấu trúc thư mục dự kiến](#7-cấu-trúc-thư-mục-dự-kiến)
8. [Quy trình nội dung](#8-quy-trình-nội-dung)
9. [Lộ trình](#9-lộ-trình)
10. [Tài liệu](#10-tài-liệu)

---

## 1. Định vị

| | Migii TOPIK | Topikly |
|---|---|---|
| Phạm vi | Đa ngôn ngữ, đa kỳ thi (JLPT, HSK, TOPIK, EPS, TOEIC) | Tiếng Hàn, **tập trung TOPIK II** trước, mở TOPIK I/EPS sau |
| Thế mạnh | Nhiều đề (35+ đề TOPIK II, 10.000+ câu), web + app, giá rẻ | **Độ sâu sư phạm cho người Việt** |
| Lời giải | Có | Có, **phân tích cả phương án nhiễu** |
| Chẩn đoán | Theo nhóm dạng (vd. "Đọc 42~50") | Theo **dạng + kỹ năng con** (mục đích, thái độ, chèn câu…) |
| Viết | Chấm AI | **원고지 + kiểm tra quy tắc + rubric 3 tiêu chí** + bài mẫu |
| Hán-Hàn | Danh sách theo vần | **Cây hình vị + âm Hán-Việt + bạn giả** |
| Trải nghiệm | Đăng nhập sớm, popup quảng cáo | **Dùng thử không cần tài khoản**, không quảng cáo che nội dung |

Một câu: *Migii là app luyện đề đa năng; Topikly là người thầy TOPIK II cho người Việt.*

Phân tích chi tiết: [docs/01-phan-tich-chuyen-mon.md](docs/01-phan-tich-chuyen-mon.md) · [docs/03-phan-tich-tham-khao-migii.md](docs/03-phan-tich-tham-khao-migii.md)

---

## 2. Sơ đồ trang (5 trụ)

Giữ khung điều hướng đã được Migii chứng minh hiệu quả, khớp với hành trình *học → lập kế hoạch → luyện → kiểm tra*:

```
topikly
├── 📚 Lý thuyết
│   ├── Từ vựng theo cấp 3–6 · theo chủ đề · Hán-Hàn (theo hình vị)
│   ├── Ngữ pháp theo cấp · theo chức năng · nhóm gần nghĩa
│   └── Chiến lược làm bài cho từng dạng câu
├── 🗺️ Lộ trình
│   └── Test trình độ → cấp mục tiêu + ngày thi → nhiệm vụ mỗi ngày → tracking
├── ✍️ Luyện tập          Nghe · Đọc · Viết · (Nói)
│   └── Thẻ dạng bài: số câu đúng, tỉ lệ đúng, kỹ năng con yếu
├── 📝 Đề thi             Full test · Mini test · Hard test · IBT
├── 📰 Blog & Tài liệu    kinh nghiệm thi, từ vựng, ngữ pháp, tin kỳ thi (SEO)
├── 💎 Nâng cấp           Premium
└── 👤 Tài khoản          tiến độ, sổ từ, câu sai, lịch sử bài Viết
```

URL theo chương trình thi để mở rộng sau: `/topik-ii/luyen-tap/doc/R39`, `/topik-ii/de-thi/full/01`, `/topik-i/...`, `/eps/...`

---

## 3. Tính năng

### Lý thuyết
- Từ vựng theo cấp, đánh dấu *đã thuộc / chưa thuộc*, flashcard **SRS** (FSRS), thêm từ ngay từ đoạn văn đang đọc.
- **Hán-Việt theo hình vị** — 경제 · 經濟 · *kinh tế*; bấm 경 → mọi từ chứa 經; cảnh báo bạn giả (공부 ≠ "công phu").
- Ngữ pháp theo cấp và theo chức năng; **bảng so sánh ngữ pháp gần nghĩa** (-느라고 / -는 바람에 / -는 탓에…).

### Lộ trình
- Test trình độ ngắn (~10 phút) → gợi ý cấp xuất phát.
- Nhập ngày thi + cấp mục tiêu + phút/ngày (hoặc chọn nhanh 30/60/90/180 ngày) → kế hoạch theo ngày.
- Mở khoá tuần tự, streak, nhắc học, tự điều chỉnh khi bỏ lỡ ngày hoặc điểm Mini test thấp.

### Luyện tập
- Nghe / Đọc / Viết theo từng dạng câu, lời giải tiếng Việt cho đáp án đúng **và từng phương án nhiễu**.
- Trình phát audio: chế độ thi (phát 1 lần) và chế độ luyện (tua, tốc độ, transcript song ngữ), 받아쓰기, shadowing.
- **Viết**: trình soạn 원고지 / IBT, đếm ký tự kể cả khoảng trắng, cảnh báo văn phong -요/-습니다 ở bài 53–54, chấm AI theo 3 tiêu chí chính thức, bản sửa và bài mẫu.

### Đề thi
- **Full test** (Nghe 60' + Viết 50' + Đọc 70'), **Mini test** (một kỹ năng), **Hard test** (cho cấp 5–6), **chế độ IBT** (giao diện máy, gõ Hangul).
- Kết quả: điểm từng phần, quy đổi cấp 3–6, tỉ lệ đúng theo dạng & kỹ năng con, câu sai để làm lại.

### Nền tảng
- **Chế độ khách**: làm bài không cần đăng nhập, tiến độ lưu tạm và chuyển lên tài khoản khi đăng ký.
- PWA dùng được offline, đồng bộ nhiều thiết bị.
- Freemium (xem [lộ trình · Giai đoạn 3](docs/02-lo-trinh-trien-khai.md#giai-đoạn-3--hán-việt-srs-ibt--premium-6-tuần)).

---

## 4. Các hướng triển khai

Ba hướng, từ nhanh–rẻ đến linh hoạt–tốn công. Chúng **không loại trừ nhau**: có thể bắt đầu ở A/B rồi tách dần sang C khi cần.

### Hướng A — Web tĩnh, nội dung dạng file (JAMstack)

```
Next.js (SSG) ── nội dung JSON/MDX trong repo ── localStorage/IndexedDB ── Vercel/Cloudflare Pages
```

- **Ưu:** nhanh nhất để có bản chạy; chi phí ~0; nội dung quản lý bằng Git; SEO tốt (hợp với trụ Lý thuyết và Blog).
- **Nhược:** không có tài khoản/đồng bộ, không làm được Lộ trình cá nhân, Premium hay thống kê thật; chấm AI vẫn cần serverless function.
- **Hợp khi:** muốn kiểm chứng ý tưởng trong 2–3 tuần, dự án cá nhân/phi thương mại.

### Hướng B — Full-stack với BaaS ⭐ *đề xuất*

```
Next.js (App Router, TypeScript) ── Supabase (Postgres + Auth + Storage + RLS) ── Vercel
                                 └─ Route Handlers / Server Actions ── LLM API (chấm Viết)
```

- **Ưu:** đủ cho cả 5 trụ — tài khoản, đồng bộ, lộ trình, thống kê, Premium; Postgres đủ mạnh cho ngân hàng đề + log trả lời; Storage cho audio; 1 codebase TypeScript; gói miễn phí đủ cho beta.
- **Nhược:** phụ thuộc nhà cung cấp BaaS (giảm được vì lõi là Postgres chuẩn); cần tổ chức logic nghiệp vụ gọn trong `lib/` để không rải rác.
- **Hợp khi:** muốn MVP thật trong ~8 tuần với 1–2 dev và có lộ trình thu phí.

### Hướng C — Frontend và Backend tách biệt

```
Next.js (web) ─┐
Expo (mobile) ─┼── REST/GraphQL ── NestJS hoặc FastAPI ── PostgreSQL + Redis + S3
               │                         └─ hàng đợi job (chấm AI, tạo TTS, sinh lộ trình, thống kê)
Admin CMS ─────┘
```

- **Ưu:** toàn quyền kiểm soát; phục vụ nhiều client (web + app như Migii); job nặng chạy hàng đợi; FastAPI thuận lợi cho NLP tiếng Hàn (kiwipiepy, KoNLPy để tách hình vị — hữu ích cho Hán-Việt và chấm Viết).
- **Nhược:** công vận hành cao; chậm ra MVP; tốn chi phí server từ đầu.
- **Hợp khi:** đã có người dùng, cần app mobile thật, mở thêm TOPIK I/EPS/Nói, hoặc bán cho trung tâm.

### So sánh nhanh

| Tiêu chí | A · Tĩnh | B · BaaS ⭐ | C · Tách BE |
|---|---|---|---|
| Thời gian ra MVP | 2–3 tuần | ~8 tuần | 12–16 tuần |
| Chi phí khởi đầu | ~0 | Thấp | Trung bình |
| Đủ 5 trụ (Lộ trình, Premium…) | ✗ | ✓ | ✓ |
| Thống kê / thích ứng | Hạn chế | ✓ | ✓✓ |
| Web + app | PWA | PWA → Expo | ✓✓ |
| Công vận hành | Rất thấp | Thấp | Cao |
| Khả năng mở rộng đa kỳ thi | Thấp | Tốt | Rất tốt |

**Khuyến nghị:** đi **Hướng B**, giữ **nội dung đề dạng file trong Git** (như Hướng A) và có script import vào Postgres — nội dung được review qua Pull Request, dữ liệu người dùng nằm trong CSDL. Khi cần app mobile, Nói, hoặc nhiều chương trình thi, tách dần sang Hướng C.

### Lựa chọn thành phần

| Thành phần | Lựa chọn đề xuất | Phương án thay thế |
|---|---|---|
| Framework web | Next.js + TypeScript | Nuxt, SvelteKit |
| UI | Tailwind CSS + shadcn/ui | Mantine, Chakra |
| Font tiếng Hàn | Pretendard / Noto Sans KR | Nanum Gothic |
| State & data | TanStack Query + Zustand | SWR, Redux Toolkit |
| Offline / PWA | Serwist (service worker) + IndexedDB | Workbox |
| Kiểm thử | Vitest + Playwright | Jest, Cypress |
| CSDL | PostgreSQL (Supabase) | Neon |
| ORM | Drizzle ORM | Prisma |
| Audio | HTML5 Audio + Howler.js | wavesurfer.js |
| Audio luyện tập | TTS tiếng Hàn đa giọng (Naver Clova, Azure, Google) | Thu âm người thật cho đề thi thử |
| Chấm Viết | LLM API (vd. Claude) + rubric + kiểm tra quy tắc | Mô hình riêng khi đủ dữ liệu |
| SRS | FSRS (`ts-fsrs`) | SM-2 |
| Thanh toán | VNPay, MoMo | Stripe cho người dùng quốc tế |
| Phân tích | PostHog | Plausible, GA4 |
| Blog | MDX trong repo | Headless CMS (Sanity, Payload) |

---

## 5. Kiến trúc đề xuất

```
┌──────────────────────────── Trình duyệt / PWA (offline) ────────────────────────────┐
│ Lý thuyết · Lộ trình · Luyện tập · Đề thi · Blog · Nâng cấp     (chế độ khách: IndexedDB) │
└──────────────────────────────────────┬──────────────────────────────────────────────┘
                                       │
┌──────────────────────────────── Next.js (server) ───────────────────────────────────┐
│ Auth · chấm trắc nghiệm · sinh & điều chỉnh lộ trình · SRS · quyền Premium            │
│ Writing pipeline: ① rule check (ký tự, văn phong, chép đề)                             │
│                   ② LLM chấm theo rubric → JSON (điểm, lỗi, bản sửa)                  │
│                   ③ lưu kết quả + giới hạn lượt theo gói                              │
└────────────┬───────────────────────┬──────────────────────┬────────────────┬─────────┘
             │                       │                      │                │
        PostgreSQL             Object storage            LLM API      Cổng thanh toán
 (đề, lý thuyết, lộ trình,   (audio, ảnh biểu đồ)    (chấm Viết, giải thích)  (VNPay/MoMo)
  log trả lời, SRS, gói)
```

- **Chấm trắc nghiệm phía server** ở chế độ thi (không gửi đáp án xuống trước khi nộp).
- Mọi lượt trả lời được log (`answers`) — nguồn dữ liệu cho thống kê theo dạng, lộ trình thích ứng và (sau này) IRT.
- **Quyền Premium kiểm tra phía server**, không chỉ ẩn nút ở giao diện.

---

## 6. Mô hình dữ liệu

```
programs         (id, code[topik-ii|topik-i|eps], name)                 -- mở rộng đa kỳ thi
question_types   (code[L21|R39|W54…], program_id, skill, range, name_vi, subskill)

-- Đề & câu hỏi
exams            (id, program_id, kind[full|mini|hard|ibt], title, source, published, is_premium)
sections         (id, exam_id, skill[listening|writing|reading|speaking], order, duration_sec)
question_groups  (id, section_id | null, passage_md, audio_url, image_url, transcript_ko, transcript_vi)
questions        (id, group_id, number, type_code, subskill, stem, difficulty, explanation_vi)
choices          (id, question_id, label, text, is_correct, distractor_note_vi)
tags / question_tags

-- Lý thuyết
words            (id, hangul, hanja, han_viet, meaning_vi, pos, level, example_ko, example_vi, false_friend)
hanja_syllables  (syllable, hanja, han_viet)              -- 학 · 學 · học
word_syllables   (word_id, syllable_index, hanja)
grammar_points   (id, pattern, meaning_vi, level, function, compare_group)
lessons          (id, program_id, pillar, title, body_mdx, order)

-- Người học
profiles         (user_id, program_id, target_level, exam_date, minutes_per_day)
placement_results(user_id, score, estimated_level, weak_types[])
study_plans      (id, user_id, start_date, end_date, status)
plan_tasks       (plan_id, day, kind[vocab|grammar|practice|mini_test|writing], ref_id, done_at)
attempts         (id, user_id, exam_id | practice_type, mode, started_at, submitted_at, score_json)
answers          (attempt_id, question_id, choice_id, time_spent_ms, flagged)
writing_submissions (id, user_id, question_id, text, char_count, rule_checks_json,
                     ai_score_json, ai_feedback_json, model_version)
srs_cards        (user_id, item_type, item_id, due_at, stability, difficulty, reps, lapses)

-- Thương mại
subscriptions    (user_id, plan[free|premium_6m|premium_1y|lifetime], expires_at, provider, device_limit)
usage_counters   (user_id, day, ai_gradings, practice_questions)
```

---

## 7. Cấu trúc thư mục dự kiến

```
topikly/
├── app/                              # Next.js App Router
│   ├── (marketing)/                  # landing, giới thiệu, bảng giá
│   ├── [program]/                    # topik-ii | topik-i | eps
│   │   ├── ly-thuyet/                # từ vựng, ngữ pháp, Hán-Việt, chiến lược
│   │   ├── lo-trinh/                 # test trình độ, kế hoạch theo ngày
│   │   ├── luyen-tap/[skill]/[type]/ # luyện theo dạng
│   │   └── de-thi/[kind]/[examId]/   # full | mini | hard | ibt
│   ├── blog/
│   ├── nang-cap/
│   ├── tai-khoan/
│   └── api/                          # route handlers (chấm bài, AI, thanh toán webhook)
├── components/                       # QuestionView, AudioPlayer, ManuscriptEditor, TypeCard…
├── lib/
│   ├── scoring/                      # quy đổi điểm → cấp, thống kê theo dạng
│   ├── planner/                      # sinh & điều chỉnh lộ trình
│   ├── writing/                      # rule checks + prompt rubric + parse kết quả AI
│   ├── srs/                          # lịch ôn FSRS
│   ├── billing/                      # gói, quyền, giới hạn lượt
│   └── db/                           # schema Drizzle, truy vấn
├── content/                          # NỘI DUNG — review qua Pull Request
│   └── topik-ii/
│       ├── exams/                    # đề thi (YAML/JSON)
│       ├── practice/                 # câu luyện theo dạng
│       ├── vocab/                    # từ vựng + Hán-Việt
│       ├── grammar/                  # điểm ngữ pháp (MDX)
│       └── strategies/               # chiến lược từng dạng (MDX)
├── scripts/                          # validate & import nội dung vào CSDL
├── docs/
└── tests/
```

Ví dụ một câu hỏi trong `content/topik-ii/practice/R39/`:

```yaml
id: r39-0001
type_code: R39            # Đọc 39–41: chèn câu vào vị trí phù hợp
subskill: insert_sentence
difficulty: 4
tags: [topic:environment, connector:그-결과]
passage: |
  ( ㉠ ) 최근 도시 양봉이 늘고 있다. ( ㉡ ) ...
stem: 다음 글에서 <보기>의 문장이 들어가기에 가장 알맞은 곳을 고르십시오.
insert_sentence: 그 결과 꿀벌의 개체 수가 빠르게 회복되었다.
choices:
  - { label: "①", text: "㉠", note_vi: "Chưa có biện pháp nào được nêu trước đó…" }
  - { label: "②", text: "㉡", correct: true }
  - { label: "③", text: "㉢", note_vi: "…" }
  - { label: "④", text: "㉣", note_vi: "…" }
explanation_vi: |
  "그 결과" (kết quả là) cần đứng ngay sau câu nêu nguyên nhân/biện pháp…
reviewed_by: <người duyệt>
```

---

## 8. Quy trình nội dung

Nội dung là **nút thắt lớn nhất** — và là chỗ duy nhất có thể thắng đối thủ đã có hàng nghìn câu hỏi.

```
Đặc tả dạng câu ─▶ Soạn nháp (người hoặc AI) ─▶ Script validate ─▶ Người có chuyên môn duyệt ─▶ Merge ─▶ Import CSDL
```

- **Không dùng lại đề thi gốc của NIIED cho mục đích thương mại** khi chưa xác nhận quyền; tự biên soạn đề mô phỏng, liên kết tới `topik.go.kr` khi cần.
- Đề do AI soạn nháp **bắt buộc** qua người duyệt (duy nhất 1 đáp án đúng, phương án nhiễu hợp lý, văn phong tự nhiên, đúng độ khó).
- Mỗi câu phải có: `type_code`, `subskill`, `difficulty`, lời giải tiếng Việt, ghi chú cho từng phương án nhiễu, người duyệt.
- Kiểm tra giấy phép của từng nguồn từ điển / audio trước khi đưa vào.

---

## 9. Lộ trình

| Giai đoạn | Thời gian | Kết quả |
|---|---|---|
| 0 · Nền móng | 2 tuần | Taxonomy dạng + kỹ năng con, đặc tả biên soạn, schema đa chương trình, khung 5 trụ |
| 1 · MVP | 8 tuần | Chế độ khách, Luyện tập theo dạng, Full + Mini test, Lý thuyết cấp 3–4, test trình độ, blog → **beta** |
| 2 · Lộ trình & Viết | 6 tuần | Lộ trình theo ngày đến ngày thi, Viết AI + 원고지 + rubric |
| 3 · Khác biệt & thu phí | 6 tuần | Hán-Việt theo hình vị, SRS, ngữ pháp gần nghĩa, IBT, Hard test, **Premium** |
| 4 · Mở rộng | liên tục | Nói, TOPIK I, EPS-TOPIK, app Expo, không gian giáo viên |

Chi tiết từng hạng mục, chỉ số thành công và rủi ro: [docs/02-lo-trinh-trien-khai.md](docs/02-lo-trinh-trien-khai.md)

---

## 10. Tài liệu

- [01 · Phân tích chuyên môn TOPIK II & người học Việt Nam](docs/01-phan-tich-chuyen-mon.md)
- [02 · Lộ trình triển khai](docs/02-lo-trinh-trien-khai.md)
- [03 · Phân tích tham khảo Migii TOPIK](docs/03-phan-tich-tham-khao-migii.md)
- [04 · Phân công agent](docs/04-phan-cong-agent.md) — 7 subagent Claude Code trong [`.claude/agents/`](.claude/agents/), mỗi agent một vùng file
- [CLAUDE.md](CLAUDE.md) — quy ước chung cho Claude và các agent
- Nguồn chính thức: [topik.go.kr](https://www.topik.go.kr) — luôn đối chiếu cấu trúc đề mới nhất tại đây.
