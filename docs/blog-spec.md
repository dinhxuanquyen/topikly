# Đặc tả bài Blog (blog-spec)

> **Phiên bản 0.1 · 2026-10-27** · Người dùng (product owner) duyệt cuối.
> Hạng mục Giai đoạn 1 tuần 8 "Blog (5–10 bài SEO đầu tiên), landing" ([02 · Lộ trình](02-lo-trinh-trien-khai.md)).
> Hợp đồng kiểu dữ liệu: [`lib/blog/types.ts`](../lib/blog/types.ts). Quy ước chung (tiếng Việt, bản quyền, `reviewed_by`) theo [content-spec](content-spec.md) §8.
>
> Ai dùng: **topik-content-designer** (soạn bài về đề thi, kỹ năng, kinh nghiệm) · **hanviet-lexicographer** (soạn bài về từ vựng, Hán-Việt, ngữ pháp) · **topik-content-reviewer** (duyệt, mục 6) · **backend-engineer** (đọc file, parse, validate, mục 4–5) · **frontend-engineer** (trang `/blog`, mục 7).

## 1. Mục đích và nguyên tắc

- Blog là kênh **SEO** và **dẫn người đọc vào sản phẩm**: mỗi bài trả lời một câu hỏi người học Việt hay tìm ("cấu trúc đề TOPIK II", "cách viết câu 53"…) rồi dẫn sang trang luyện tập, đề thi hoặc lý thuyết liên quan.
- Viết bằng **tiếng Việt**, ví dụ tiếng Hàn. Giọng văn rõ ràng, cụ thể, không quảng cáo quá đà, không hứa điểm số.
- **Không sao chép** bài viết, đề thi hay tài liệu của NIIED, sách hoặc nền tảng khác. Ví dụ minh hoạ phải tự soạn.
- **Dữ kiện về kỳ thi** (số câu, thời gian, thang điểm, ngưỡng cấp, lịch thi, lệ phí, IBT) phải khớp nguồn chính thức và được ghi ở `sources`. Không chắc thì không viết, hoặc ghi rõ "theo thông báo tại thời điểm viết". Số liệu cấu trúc đề phải khớp cấu hình chương trình (`lib/db/programs/topik-ii.ts`).
- Không đăng tin kỳ thi (lịch thi, lệ phí) khi chưa đối chiếu được nguồn chính thức hiện hành.

## 2. Đường dẫn và tên file

```
content/blog/<slug>.md
```

- Mỗi file một bài. `<slug>` gồm chữ thường không dấu, số, dấu `-` (ví dụ `cau-truc-de-topik-ii`) và **phải trùng** trường `slug`.
- Slug `chuyen-muc` bị cấm (trùng route `/blog/chuyen-muc/<mã>`).
- URL bài: `/blog/<slug>`. Đổi slug sau khi xuất bản là đổi URL, tránh làm.

## 3. Frontmatter

File bắt đầu bằng khối YAML giữa hai dòng `---`, sau đó là thân bài Markdown (mục 4).

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `slug` | string | ✓ | trùng tên file |
| `title` | string | ✓ | tiêu đề H1 và `<title>`. Nên ≤ 70 ký tự (vượt: cảnh báo) |
| `description` | string | ✓ | mô tả meta / đoạn tóm tắt ở danh sách. Nên 70–170 ký tự (ngoài khoảng: cảnh báo) |
| `category` | enum | ✓ | mã chuyên mục trong `BLOG_CATEGORIES` (`lib/blog/types.ts`): `cau-truc-de`, `ky-nang`, `viet`, `tu-vung`, `ngu-phap`, `kinh-nghiem`, `tin-ky-thi` |
| `programs` | list | ✓ | chương trình liên quan, ví dụ `[topik-ii]`. Phải là chương trình có trong registry |
| `levels` | list số | | cấp người đọc nhắm tới, ví dụ `[3, 4]`, trong `difficulty_range` của chương trình |
| `tags` | list | | tự do, tối đa 8, chữ thường |
| `status` | enum | ✓ | `draft` \| `published` |
| `published_at` | date | khi `published` | `YYYY-MM-DD`. `draft` có thể để trống |
| `updated_at` | date | | ≥ `published_at` |
| `authored_by` | string | ✓ | agent hoặc người soạn |
| `reviewed_by` | string \| null | ✓ | luôn `null` khi soạn; chỉ người dùng điền. `published` mà `reviewed_by` null: cảnh báo |
| `reviewed_at` | date \| null | | |
| `related` | list | | liên kết sang sản phẩm, hiển thị cuối bài: `{ href, label }`. `href` là đường dẫn nội bộ bắt đầu bằng `/` |
| `sources` | list | khi `category: tin-ky-thi` hoặc bài nêu dữ kiện kỳ thi | `{ title, url }`, `url` là `https://`. Ưu tiên URL **bền** (bài đăng gốc, trang chính thức) thay cho link xem trước/tải tệp tự sinh; buộc dùng link không bền thì ghi "truy cập <ngày>" trong `title` và nhắc kiểm lại ở `notes_internal`. Hiển thị mục "Nguồn tham khảo" |
| `notes_internal` | string | | ghi chú cho reviewer, **không** hiển thị |

`related[].href` phải trỏ tới trang có thật: validator kiểm các mẫu `/<program>/luyen-tap/<kỹ năng>/<type_code>`, `/<program>/de-thi/<kind>/<id>`, `/<program>/ly-thuyet/ngu-phap/<slug>`, `/<program>/ly-thuyet/tu-vung/<id>`, `/blog/<slug>` và các trang trụ cố định; không khớp: cảnh báo.

## 4. Thân bài: Markdown rút gọn

Chỉ hỗ trợ tập con dưới đây. Mọi cú pháp khác là **lỗi** (không đoán ý).

| Cú pháp | Kết quả |
|---|---|
| `## Tiêu đề` | H2, vào mục lục. `id` neo sinh từ chữ (bỏ dấu, chữ thường, `-`), trùng thì thêm `-2`, `-3` |
| `### Tiêu đề` | H3 (phải nằm dưới một H2) |
| đoạn văn | các dòng liền nhau gộp thành một đoạn; dòng trống tách đoạn |
| `- mục` / `* mục` | danh sách không thứ tự (không lồng) |
| `1. mục` | danh sách có thứ tự |
| `> câu` | khung **mẹo / lưu ý** (các dòng `>` liền nhau gộp một khung) |
| bảng `\| a \| b \|` + dòng `\|---\|---\|` | bảng có hàng tiêu đề; mọi hàng cùng số cột |
| `**đậm**`, `*nghiêng*` | trong dòng |
| `[chữ](/duong-dan)` hoặc `[chữ](https://…)` | liên kết; nội bộ bắt đầu bằng `/`, ngoài bắt đầu bằng `https://` |

Bị cấm (lỗi): `# H1` (tiêu đề bài lấy từ `title`), `####` trở xuống, HTML thô (`<…>`), ảnh `![…](…)`, khối code ``` ``` ```, danh sách lồng, liên kết `http://` hay `javascript:`.

Chữ Hàn trong văn bản được giao diện tự gắn `lang="ko"`. Ví dụ tiếng Hàn dài nên đặt thành mục danh sách hoặc bảng kèm nghĩa tiếng Việt.

Độ dài: 600–2.500 từ (ngoài khoảng: cảnh báo). Nên có ít nhất 2 H2. Thời gian đọc ước lượng = số từ / 200, làm tròn lên, tối thiểu 1 phút.

## 5. Validate

`npm run validate:content` kiểm `content/blog/*.md` theo mục 2–4. Lỗi chặn: thiếu trường bắt buộc, sai kiểu/enum, slug lệch tên file, cú pháp Markdown bị cấm, H3 trước H2, bảng lệch cột, liên kết sai giao thức, `published` thiếu `published_at`. Cảnh báo: độ dài title/description/thân bài, `related` không khớp trang có thật, `published` chưa duyệt, thiếu `sources` khi cần.

Bài `draft` hiển thị ở môi trường dev và bản build hiện tại (gắn nhãn "Bản nháp", `noindex`), ẩn khi đặt `TOPIKLY_HIDE_DRAFT_POSTS=1`. Bài `draft` không vào sitemap.

## 6. Checklist duyệt (topik-content-reviewer)

- B1. Dữ kiện về kỳ thi đúng và có nguồn; khớp cấu hình chương trình.
- B2. Ví dụ tiếng Hàn tự nhiên, đúng chính tả và 띄어쓰기; nghĩa tiếng Việt đúng; Hán tự – âm Hán-Việt đúng.
- B3. Lời khuyên đúng với đề thật, cụ thể, không hứa điểm; không mâu thuẫn với lời giải/chiến lược trong kho.
- B4. Không sao chép; ví dụ tự soạn.
- B5. `related` dẫn đúng trang liên quan; title/description hấp dẫn nhưng không giật tít.
- B6. Văn phong tiếng Việt rõ ràng, nhất quán thuật ngữ với giao diện (Luyện tập, Đề thi, Mini test, Test trình độ…).

## 7. Trang và SEO (frontend-engineer)

- `/blog`: danh sách bài mới nhất trước (bài `draft` sau cùng), lọc theo chuyên mục.
- `/blog/chuyen-muc/<mã>`: danh sách theo chuyên mục.
- `/blog/<slug>`: H1, ngày, thời gian đọc, chuyên mục, mục lục (từ H2), thân bài, "Luyện tiếp trên Topikly" (`related`), "Nguồn tham khảo" (`sources`), bài cùng chuyên mục.
- Metadata: `title`, `description`, canonical, Open Graph `article`; JSON-LD `Article`. Bài nháp `robots: noindex`.
- `app/sitemap.ts`, `app/robots.ts` dùng `NEXT_PUBLIC_SITE_URL`.

## Phụ lục — lịch sử thay đổi

- **v0.1 (2026-10-27):** bản đầu.
- **v0.1.1 (2026-10-27):** quy ước nguồn bền cho `sources` (góp ý review lô blog 1).
