# 04 · Phân công agent

> Dự án dùng các subagent của Claude Code, định nghĩa trong [`.claude/agents/`](../.claude/agents/). Mỗi agent có **một vai trò, một vùng file riêng** để nhiều agent chạy song song mà không ghi đè lên nhau.

## 1. Đội hình

| Agent | Vai trò | Vùng file được sửa | Model |
|---|---|---|---|
| [`topik-content-designer`](../.claude/agents/topik-content-designer.md) | Chuyên gia khảo thí: đặc tả dạng câu, soạn câu hỏi/đề, lời giải, chiến lược | `content/*/exams`, `practice`, `strategies`, `docs/content-spec.md` | opus |
| [`hanviet-lexicographer`](../.claude/agents/hanviet-lexicographer.md) | Từ vựng, Hán tự, âm Hán-Việt, bạn giả, ngữ pháp gần nghĩa | `content/*/vocab`, `content/*/grammar` | sonnet |
| [`topik-content-reviewer`](../.claude/agents/topik-content-reviewer.md) | Kiểm duyệt độc lập mọi nội dung, chỉ báo cáo | `content/_reviews/` | opus |
| [`frontend-engineer`](../.claude/agents/frontend-engineer.md) | Giao diện 5 trụ, trình làm bài, audio, 원고지, PWA | `app/` (trừ `api/`), `components/`, `styles/`, `public/` | sonnet |
| [`backend-engineer`](../.claude/agents/backend-engineer.md) | Schema, RLS, API, chấm điểm, lộ trình, SRS, Premium, import nội dung | `lib/{db,scoring,planner,srs,billing}`, `app/api/` (trừ `writing/`), `scripts/`, `supabase/` | sonnet |
| [`writing-ai-engineer`](../.claude/agents/writing-ai-engineer.md) | Rule check + chấm Viết AI theo rubric, hiệu chỉnh | `lib/writing/`, `app/api/writing/`, `tests/writing-eval/` | opus |
| [`qa-engineer`](../.claude/agents/qa-engineer.md) | E2E, hồi quy, di động, trợ năng, review trước merge | `tests/` (trừ `writing-eval/`) | sonnet |

**Người dùng (product owner)** giữ quyền: chốt phạm vi, duyệt cuối nội dung (`reviewed_by`), merge, phát hành, thanh toán thật.

## 2. Luồng làm việc

### Nội dung (hai lớp: soạn → duyệt)

```
topik-content-designer ─┐
                        ├──▶ topik-content-reviewer ──▶ PASS ──▶ người dùng điền reviewed_by ──▶ backend import
hanviet-lexicographer ──┘            │
                                     └── FIX / BLOCKER ──▶ quay lại agent soạn
```

Agent soạn **không bao giờ** tự duyệt bài của mình.

### Tính năng (hợp đồng trước, code sau)

```
backend-engineer định nghĩa type + API ──▶ frontend-engineer dựng giao diện ──▶ qa-engineer test E2E
writing-ai-engineer định nghĩa WritingResult ─┘
```

Khi frontend cần API chưa có, nó mô tả hợp đồng (TypeScript type input/output) và giao cho backend, không tự viết vào `app/api/`.

## 3. Phân công theo giai đoạn

| Giai đoạn | Agent chạy song song | Việc chính |
|---|---|---|
| **0 · Nền móng** | content-designer · lexicographer · backend | Đặc tả dạng câu + 20 câu mẫu · danh sách từ/ngữ pháp cấp 3–4 · schema, khung repo, script validate |
| | reviewer (sau) | Duyệt 20 câu mẫu |
| **1 · MVP** | frontend · backend · content-designer · lexicographer | Khung 5 trụ, trình làm bài, chế độ khách · API chấm, thống kê, test trình độ · 2 Full + 4 Mini + ~300 câu · ~1.500 từ, ~100 ngữ pháp |
| | reviewer · qa (liên tục) | Duyệt theo lô · E2E luồng 1–2 |
| **2 · Lộ trình & Viết** | backend (planner) · writing-ai · frontend (원고지, lộ trình) · content-designer (đề Viết + bài mẫu) | |
| | qa | E2E luồng 3–4 |
| **3 · Khác biệt & Premium** | lexicographer (Hán-Việt, bạn giả) · backend (SRS, billing) · frontend (IBT, flashcard) · content-designer (Hard test) | |
| | qa | E2E luồng 5, kiểm thử trước phát hành |

## 4. Cách gọi agent

Trong Claude Code, nhắc tên agent trong yêu cầu, ví dụ:

- "Dùng **topik-content-designer** soạn 10 câu Đọc dạng R39 (chèn câu), độ khó 4."
- "Dùng **topik-content-reviewer** duyệt toàn bộ `content/topik-ii/practice/R39/`."
- "Dùng **backend-engineer** tạo schema Drizzle theo README mục 6."
- "Chạy song song **frontend-engineer** dựng trình làm bài và **backend-engineer** làm API chấm trắc nghiệm."

Việc lớn, độc lập (vd. một giai đoạn của frontend) nên chạy trong **session riêng có worktree riêng** để mỗi việc có nhánh và PR riêng.

## 5. Quy tắc chung cho mọi agent

- Đọc `CLAUDE.md` và tài liệu trong `docs/` trước khi bắt đầu.
- Chỉ sửa file trong vùng của mình; cần thay đổi ngoài vùng → báo lại, không tự sửa.
- Không commit, không push trừ khi người dùng yêu cầu. Commit **không** gắn dòng ghi công Claude / `Co-Authored-By`.
- Cuối mỗi lượt: liệt kê file đã sửa, việc còn dở, và agent nào cần làm tiếp.
