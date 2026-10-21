# Đặc tả từ vựng & ngữ pháp (vocab-grammar-spec)

> **Phiên bản 0.2 · 2026-10-21** · Chủ sở hữu: `hanviet-lexicographer` · Người dùng (product owner) duyệt cuối. Lịch sử thay đổi: [Phụ lục](#phụ-lục--lịch-sử-thay-đổi).
> Đầu ra Giai đoạn 0, hạng mục "Chốt danh sách từ vựng & ngữ pháp theo cấp 3–6 — nguồn, giấy phép, định dạng" ([02 · Lộ trình](02-lo-trinh-trien-khai.md)).
> Bổ sung cho [content-spec](content-spec.md) (của `topik-content-designer`, tài liệu này **không sửa** nó). Dùng chung quy ước mã hoá (§5.1), `reviewed_by` (§5.2, §8) và danh sách `topic:` (§6) của content-spec.
> Mô hình dữ liệu: [schema `lib/db/schema/content.ts`](../lib/db/schema/content.ts) (bảng `words`, `hanja_syllables`, `word_syllables`, `grammar_points`) và [README mục 6–7](../README.md#6-mô-hình-dữ-liệu).
>
> Ai dùng: **hanviet-lexicographer** (soạn) · **topik-content-reviewer** (duyệt, mục 10) · **backend-engineer** (validate/import, mục 7–8) · **frontend-engineer** (hiển thị bạn giả, cây hình vị, bảng so sánh).
> Điểm chưa chắc về pháp lý hoặc dữ liệu gốc được đánh dấu **[cần xác nhận]**; tổng hợp ở mục 9.5.

---

## 1. Quyết định chính

| Vấn đề | Quyết định | Lý do ngắn |
|---|---|---|
| Đơn vị file từ vựng | **Theo lô chủ đề**: `vocab/<topic>.yaml`, 30–60 từ/file; vượt thì `<topic>-02.yaml` | ~1.500 từ ở MVP = 25–50 file, reviewer duyệt theo chủ đề, diff gọn. Mỗi từ một file sẽ thành 1.500 file, PR không đọc nổi |
| Đơn vị file ngữ pháp | **Mỗi điểm một file**: `grammar/<id>-<slug>.yaml` | ~100 điểm, mỗi điểm có giải thích + ≥3 ví dụ + ràng buộc nên dài; duyệt và sửa riêng từng điểm, không đụng nhau |
| Nhóm so sánh | Mỗi nhóm một file: `grammar/groups/<group-slug>.yaml` | Có bảng khác biệt và ví dụ đối chiếu, thuộc về cả nhóm chứ không thuộc điểm nào |
| Bảng âm tiết Hán-Hàn | **Một file duy nhất**: `vocab/_hanja-syllables.yaml` (hiện tại), nên chuyển sang `content/_shared/hanja-syllables.yaml` khi có chương trình thứ hai | `hanja_syllables` không có `program_id`: một chữ Hán có cùng âm ở mọi chương trình. Hiện chỉ có `topik-ii` và vùng file của lexicographer là `content/<program>/` nên đặt tạm ở đây. Chuyển là `git mv`, không đổi nội dung **[cần xác nhận]** |
| Khoá ổn định | Từ `v-00001`, ngữ pháp `g-0001`, nhóm `slug` | Lưu vào `external_id`, import idempotent |
| Duyệt | `reviewed_by` luôn `null` khi soạn, chỉ người dùng điền | Theo content-spec §8.2 |

---

## 2. Đường dẫn, tên file, id

```
content/topik-ii/
├── vocab/
│   ├── _hanja-syllables.yaml        # bảng âm tiết dùng chung (tiền tố "_" = không phải lô từ)
│   ├── society.yaml                 # lô theo chủ đề (tên = giá trị topic: ở content-spec §6, hoặc "general")
│   ├── economy.yaml
│   └── economy-02.yaml              # lô thứ hai cùng chủ đề
└── grammar/
    ├── g-0001-neula-go.yaml         # <id>-<slug>.yaml
    └── groups/
        └── nguyen-nhan-ket-qua-xau.yaml   # <group-slug>.yaml
```

| Đối tượng | Regex | Ghi chú |
|---|---|---|
| `words[].id` | `^v-[0-9]{5}$` | Số thứ tự **toàn chương trình**, cấp dần, không gắn với file hay chủ đề. **Không tái dùng** id của từ đã bỏ: đặt `status: retired`, không xoá khỏi file. Hai nhánh cùng xin số thì nhánh merge sau đánh lại số **trước khi import lần đầu** (sau import thì id bất biến) |
| `grammar.id` | `^g-[0-9]{4}$` | Cùng quy tắc |
| `grammar.slug` | `^[a-z0-9]+(-[a-z0-9]+)*$` | Phiên âm La-tinh không dấu, dùng làm URL và tên file. Duy nhất trong chương trình |
| `compare_group` (slug nhóm) | `^[a-z0-9]+(-[a-z0-9]+)*$` | Tiếng Việt không dấu, nối `-`. Duy nhất. Tên file nhóm = slug |
| Tên file lô từ | `^[a-z0-9-]+(-[0-9]{2})?\.yaml$` | Phần tên đầu thuộc danh sách `topic:` (content-spec §6) hoặc `general` |

Mã hoá chung (như content-spec §5.1): UTF-8 không BOM, Hangul **NFC**, xuống dòng **LF**, thụt đầu dòng 2 dấu cách, không tab.
Riêng ký tự Hangul tương thích: `ㄴ`, `ㄹ`, `ㅂ` trong mẫu ngữ pháp là **Hangul Compatibility Jamo** (U+3131–U+318E), không dùng jamo ghép (U+1100–U+11FF).
Mọi chuỗi tiếng Hàn đặt trong dấu nháy kép `"..."` (tránh lỗi với `-`, `*`, `(`, `:` đầu hoặc giữa chuỗi). Văn bản dài dùng khối `|`.
Giá trị `N` (danh từ) của `form[].host` phải viết `"N"` có nháy: YAML 1.1 (PyYAML…) đọc `N` trần thành `false`. Parser `yaml` của Node (YAML 1.2) không bị, nhưng giữ nháy để tương thích mọi công cụ.

---

## 3. Schema YAML từ vựng

### 3.1 Gốc file lô

| Trường | Kiểu | BB | Ghi chú |
|---|---|---|---|
| `batch` | string | ✓ | Trùng tên file (bỏ `.yaml`) |
| `program` | string | – | Nếu có phải trùng thư mục chương trình |
| `source` | enum | ✓ | Chỉ `original` (nội dung tự viết). Mặc định cho mọi từ trong file |
| `authored_by` | string | ✓ | Mặc định cho mọi từ |
| `created_at` | date | ✓ | `YYYY-MM-DD` |
| `reviewed_by` / `reviewed_at` | string\|null / date\|null | ✓ / – | **Luôn `null` khi soạn.** Từ có khoá `reviewed_by` riêng thì giá trị riêng thắng. Từ bị sửa **nội dung** sau khi duyệt (nghĩa, hanja, âm, ví dụ, bạn giả) phải đặt lại `reviewed_by: null` ngay trong từ đó. **Quy trình điền:** người dùng chỉ điền `reviewed_by` ở gốc lô khi mọi từ trong lô đều PASS; nếu còn từ FIX thì điền riêng từng từ PASS (hoặc đặt `reviewed_by: null` riêng cho từ FIX trước khi điền ở gốc) |
| `verification_vi` | string | ✓ | Nói thật mức đã đối chiếu nguồn của cả lô (bản mẫu: xem `society.yaml`) |
| `words` | list | ✓ | Mục 3.2 |

### 3.2 Một từ

| Trường | Kiểu | BB | Ràng buộc |
|---|---|---|---|
| `id` | string | ✓ | Mục 2 |
| `hangul` | string | ✓ | Dạng từ điển (표제어) viết **NFC**, đúng 띄어쓰기. Động từ/tính từ kết thúc `-다` (`해결하다`, `필요하다`). Từ có phần Hán + phần thuần Hàn viết đủ (`고장 나다`) |
| `hanja` | string\|null | ✓ | Chỉ **phần Hán** của từ (`解決`, không có 하다). `null` nếu thuần Hàn hoặc ngoại lai. Chữ phồn thể theo 표준국어대사전 (敎, 學, 會…), không dùng giản thể; một chữ chỉ ghi một dạng dị thể (ví dụ 敎, không xen 教) |
| `han_viet` | string\|null | ✓ | Có iff `hanja` ≠ null. Âm Hán-Việt **theo từ, quen dùng trong tiếng Việt**, chữ thường, các âm cách 1 dấu cách. Quy tắc chữ đa âm theo content-spec §4.2 |
| `syllables` | list | ✓ nếu có `hanja` | `[{ko, hanja, hv}]`, mỗi phần tử một chữ Hán, **đúng thứ tự trong từ**. Xem 3.3 |
| `meaning_vi` | string | ✓ | Nghĩa tiếng Việt **tự viết**, ngắn gọn, ngăn các nghĩa bằng `; `. Không chép định nghĩa từ điển |
| `pos` | enum | ✓ | Danh sách đóng ở 3.4 |
| `level` | int | ✓ | 1–6. Lô hiện tại là 3–4 |
| `level_basis` | enum | ✓ | `curriculum_2017` (đối chiếu danh sách 급 của 국제통용 한국어 표준 교육과정) · `krdict_band` (đối chiếu 초/중/고급 của 한국어기초사전) · `editor` (người soạn tự đánh giá, **chưa** đối chiếu). Mục 9 |
| `topics` | list[string] | – | Giá trị `topic:` (content-spec §6), 1–3 giá trị |
| `example_ko` | string | ✓ | **Một** câu tự đặt, tự nhiên, đúng 띄어쓰기, có dấu câu cuối, chứa từ ở dạng chia. Dạng chia có thể làm mất gốc từ (복잡하다 → 복잡해서, 어울리다 → 어울려요), nên validator chỉ so khớp thận trọng (mục 8) |
| `example_vi` | string | ✓ | Dịch sát nghĩa, tự nhiên |
| `false_friend` | null \| object | ✓ | Ghi `null` rõ ràng nếu không phải bạn giả. Cấu trúc ở 3.5 |
| `collocations` | list | – | `[{ko, vi}]`, khuyến nghị 2–4 kết hợp từ thật sự hay dùng |
| `note_vi` | string | – | Ghi chú **hiển thị cho người học**: đồng âm khác nghĩa, từ Việt tương đương khác chữ, mẹo nhớ |
| `refs` | list | – | `[{src, entry?, checked, fields?}]`: nguồn đã **thật sự** mở để đối chiếu. `src` ∈ `krdict` · `stdict` · `curriculum_2017` · `learner_list_2003` · `unihan`; `checked`: bool; `fields`: trường đã kiểm (`hanja`, `pos`, `level`…). **`checked: true` chỉ khi đã mở trang mục từ của nguồn** và đọc trường đó ở đó. Chỉ thấy qua kết quả tìm kiếm, bản sao dữ liệu hay trang thứ cấp thì để `checked: false` và ghi chi tiết ở `notes_internal` |
| `status` | enum | – | `active` (mặc định) · `retired` |
| `notes_internal` | string | – | Ghi chú cho reviewer, không hiển thị |
| `source`, `authored_by`, `reviewed_by`, `reviewed_at` | | – | Chỉ khi khác giá trị của lô |

### 3.3 `syllables`: nối từ với bảng âm tiết

- Mỗi phần tử: `ko` (âm Hàn một âm tiết), `hanja` (đúng một chữ Hán), `hv` (âm Hán-Việt của chữ đó **trong từ này**).
- Ràng buộc: `hanja` của từ = nối các `syllables[].hanja`; `han_viet` = nối các `hv` (cách nhau 1 dấu cách); `hangul` **bắt đầu bằng** nối các `ko`. Phần còn lại của `hangul` (nếu có) là phần thuần Hàn: `하다`, `되다`, `시키다`, `스럽다`, `롭다`, `히`, `이`, hoặc từ thuần Hàn riêng (` 나다`).
- Từ láy Hán (`漸漸`): ghi đủ hai phần tử.
- Mỗi cặp (`ko`, `hanja`) phải có mặt trong `_hanja-syllables.yaml`. `hv` phải là `hv` mặc định hoặc nằm trong `alt_hv` của dòng đó (mục 4).

### 3.4 `pos` (danh sách đóng)

`noun` (명사) · `bound_noun` (의존 명사) · `pronoun` (대명사) · `numeral` (수사) · `verb` (동사, gồm `-하다`/`-되다`) · `adjective` (형용사, gồm `-하다`/`-스럽다`) · `determiner` (관형사) · `adverb` (부사) · `interjection` (감탄사) · `particle` (조사) · `ending` (어미) · `affix` (접사) · `idiom` (관용구). Một từ chỉ một `pos` chính (từ danh-phó như 결국 chọn dạng dùng nhiều nhất, ghi phần còn lại ở `note_vi`).

### 3.5 `false_friend` (bạn giả Hán-Việt)

Chỉ đánh dấu khi nghĩa tiếng Hàn **lệch hẳn** nghĩa của từ Hán-Việt thông dụng. Từ Hán-Hàn mà tiếng Việt không dùng âm đó (`고장` "cố chướng", `전공` "chuyên công") **không** phải bạn giả: để `null` và giải thích ở `note_vi`.

```yaml
false_friend:
  kind: full | partial       # full: không có nghĩa nào trùng; partial: trùng một số nghĩa (content-spec §4.2)
  vi_meaning: "..."          # nghĩa của từ Hán-Việt (= han_viet) trong tiếng Việt hiện đại
  note_vi: "..."             # trùng ở nghĩa nào, khác ở nghĩa nào, cách nói đúng trong tiếng Việt
```
Từ Hán-Việt đem so sánh luôn là `han_viet` của chính từ, nên không có trường riêng. Cách ghi này khớp mục "Đáng chú ý" của lời giải (content-spec §4.2).

**Bạn giả chiều Việt → Hàn.** Định nghĩa trên là chiều Hàn → Việt (đọc từ Hàn rồi hiểu sai bằng âm Hán-Việt). Còn một bẫy ngược: người Việt dịch từ Hán-Việt quen thuộc sang từ Hàn **cùng gốc** nhưng khác phạm vi dùng ("khắc phục sự cố" → 극복, "cung cấp thông tin" → 공급, "giảm thiểu" → 감소, "giao dịch" → 교역). Ghi cảnh báo này vào `note_vi` của **từ Hàn đúng** (제공하다, 해결하다, 줄이다, 거래…), không đánh dấu `false_friend`. Nếu sau này giao diện cần lọc riêng thì thêm trường tuỳ chọn `vi_to_ko_trap: [{vi, wrong_ko, note_vi}]` **[cần xác nhận]**.

---

## 4. Bảng âm tiết Hán-Hàn dùng chung

`vocab/_hanja-syllables.yaml`:
```yaml
syllables:
  - { ko: 사, hanja: 社, hv: xã,  alt_hv: [], meaning_vi: "..." }
  - { ko: 사, hanja: 事, hv: sự,  alt_hv: [], meaning_vi: "..." }
```
- **Khoá = (`ko`, `hanja`)**, khớp khoá chính `hanja_syllables(syllable, hanja)`. Một chữ Hán → một âm Hàn → một âm Hán-Việt **mặc định** (`hv`).
- **Đồng âm khác chữ** (사: 社 xã / 事 sự / 史 sử / 思 tư; 수: 手 thủ / 收 thu / 輸 thâu): mỗi chữ một dòng riêng, **không bao giờ** gộp.
- **Một chữ Hán nhiều âm Hàn** (樂 락/악/요; 行 행/항): mỗi âm Hàn một dòng, cùng `hanja`.
- **Một âm Hàn của một chữ nhiều âm Việt** (行 hành/hạnh/hàng; 處 xử/xứ; 要 yếu/yêu; 營 doanh/dinh; 切 thiết/thế): `hv` là âm phổ biến nhất của chữ; các âm khác liệt kê ở `alt_hv`. Từ dùng âm khác thì khai `hv` ở `syllables` của **từ** (vd. 영양 營養 → `hv: dinh`) và `han_viet` của từ khớp. Không suy `han_viet` của từ từ `hv` mặc định (content-spec §4.2). Chỉ ghi `alt_hv` khi đã có nguồn Hán-Việt: **không** coi một từ Việt dùng chữ khác là âm khác của chữ này (vd. "tài nguyên" ứng với 財, không phải âm khác của 資; 資源 đọc "tư nguyên").
- **Biến thể 두음법칙** (流 유/류, 利 이/리, 來 래/내, 女 여/녀…): mỗi âm Hàn một dòng riêng với cùng `hanja`, cùng `hv`. Từ dùng âm nào thì khai đúng âm đó ở `syllables[].ko` (流行 → 유행, 氣流 → 기류).
- Mọi chữ Hán mới trong một lô từ phải được thêm vào bảng **cùng PR**. Mỗi dòng có `meaning_vi` ngắn (nghĩa gốc của chữ), phục vụ "cây hình vị" trên giao diện.
- Chữ có âm Việt chưa chắc: ghi `notes_internal` ở dòng đó để reviewer kiểm.

---

## 5. Schema YAML ngữ pháp

Một điểm ngữ pháp = một file `grammar/<id>-<slug>.yaml`.

| Trường | Kiểu | BB | Ràng buộc |
|---|---|---|---|
| `id`, `slug` | string | ✓ | Mục 2. Tên file = `<id>-<slug>.yaml` |
| `pattern` | string | ✓ | Quy ước ở 5.1. Duy nhất trong chương trình |
| `variants` | list[string] | – | Biến thể ghi khác (`-(으)ㄴ가 보다` cho `-나 보다`), dùng để tìm kiếm |
| `meaning_vi` | string | ✓ | Một câu ngắn, tự viết |
| `level` | int | ✓ | 1–6 |
| `level_basis` | enum | ✓ | Như từ vựng |
| `function` | enum | ✓ | Danh sách đóng 5.2 |
| `compare_group` | string\|null | ✓ | Slug nhóm so sánh (mục 6) hoặc `null`. Nhóm phải tồn tại |
| `form` | list | ✓ | Cách kết hợp: `[{host, attach, note_vi?}]`. `host` ∈ `V`, `A`, `N`, `V/A`; `attach` ghi dạng hiện tại/quá khứ/tương lai cụ thể (`V-는 탓에`, `V-(으)ㄴ 탓에`…) |
| `constraints` | object | ✓ | `register` ∈ `spoken`/`written`/`both` (**bắt buộc**); `polarity` ∈ `any`/`negative`/`positive` (sắc thái kết quả vế sau); `subject_vi`, `tense_vi`, `main_clause_vi`, `other_vi` (văn bản). Điểm thuộc nhóm so sánh phải có đủ `subject_vi`, `tense_vi`, `main_clause_vi`, `polarity` để bảng nhóm đối chiếu được |
| `examples` | list | ✓ | `[{ko, vi, note_vi?}]`, **≥ 3**, tự đặt, đa dạng chủ ngữ và loại từ |
| `non_examples` | list | – | Câu **sai** người học hay viết: `[{ko, fix_ko?, note_vi}]`. Khuyến nghị ≥ 2 với điểm thuộc nhóm so sánh. Không dùng ký tự `*` trong `ko`: giao diện tự thêm dấu hiệu sai. **Mỗi câu phải sai ngay trên câu chữ**: người học không thể bảo vệ nó bằng một ngữ cảnh khác, và không chỉ sai về logic nội dung. Nếu cần ngữ cảnh để sai thì viết luôn vào `ko` (vd. "제가 직접 먹어 보니까 …"). `note_vi` bắt đầu bằng "Sai:"; riêng lỗi văn phong (câu đúng ngữ pháp nhưng sai văn phong của ngữ cảnh đã nêu trong `ko`) thì bắt đầu bằng "Không hợp văn phong:". |
| `common_mistakes_vi` | list[string] | ✓ | ≥ 1, lỗi **của người Việt** (dịch từng chữ, nhầm hiểu…) |
| `related` | list[id] | – | Điểm liên quan ngoài nhóm |
| `body_md` | string (md) | ✓ | Giải thích ngắn bằng tiếng Việt (ý cốt lõi, mẹo nhớ, liên hệ đề thi). Không lặp lại bảng/ví dụ đã có ở trường riêng |
| `refs`, `source`, `authored_by`, `created_at`, `reviewed_by`, `reviewed_at`, `status`, `notes_internal` | | | Như từ vựng; ở đây là trường riêng của file (không có giá trị mặc định theo lô) |

### 5.1 Quy ước ghi `pattern`

| Quy tắc | Ví dụ |
|---|---|
| Gắn vào gốc từ thì mở đầu `-`; cấu trúc có danh từ đi trước thì bắt đầu bằng `N` | `-느라고`, `N 때문에` |
| `(으)` = âm tiết chỉ xuất hiện khi gốc từ có patchim | `-(으)ㄹ까 봐` |
| `/` ngăn các biến thể theo loại từ, thứ tự **ㄴ/는/ㄹ** (quá khứ·tính từ / hiện tại động từ / tương lai) | `-(으)ㄴ/는 탓에` |
| Biến thể nguyên âm `아/어` viết `-아/어`, không viết `여` | `-아/어도` |
| Dấu cách theo 띄어쓰기 chuẩn (불완전 명사 tách, 어미 dính) | `-는 바람에`, `-(으)ㄴ/는 듯하다` |
| Giữ đuôi `다` nếu là một phần của mẫu (động từ phụ trợ, tính từ) | `-(으)ㄴ/는 모양이다` |
| Không dùng `~`, không dùng chú thích trong `pattern` | |

**Tag tương ứng**: `grammar:` + `pattern` với dấu cách đổi thành `-` (khớp content-spec §6 và các câu đã soạn): `-(으)ㄹ까 봐` → `grammar:-(으)ㄹ까-봐`; `-(으)ㄴ/는 탓에` → `grammar:-(으)ㄴ/는-탓에`. Validator dùng quy tắc này để kiểm tag `grammar:` của câu hỏi trỏ tới một điểm có thật (cảnh báo). Nó so với cả `pattern` lẫn `variants`. Tag cũ không khớp (vd. `grammar:-아-놓다` ở l11-0001, trong khi pattern chuẩn là `-아/어 놓다`) được cảnh báo để `topik-content-designer` đổi theo pattern chuẩn khi điểm ngữ pháp đó được soạn; lexicographer **không sửa** câu hỏi.

### 5.2 `function` (danh sách đóng)

| Giá trị | Nghĩa | Giá trị | Nghĩa |
|---|---|---|---|
| `cause` | Nguyên nhân, lý do | `experience` | Trải nghiệm |
| `purpose` | Mục đích | `retrospection` | Hồi tưởng |
| `condition` | Điều kiện, giả định | `reported_speech` | Lời dẫn |
| `concession` | Nhượng bộ | `ability_possibility` | Khả năng |
| `contrast` | Đối lập | `obligation_necessity` | Nghĩa vụ, cần thiết |
| `conjecture` | Phỏng đoán, suy đoán | `permission_prohibition` | Cho phép, cấm |
| `concern` | Lo ngại | `attempt` | Thử |
| `intention_plan` | Ý định, dự định | `completion_state` | Hoàn thành, trạng thái |
| `time_order` | Trình tự, thời điểm | `change` | Biến đổi |
| `simultaneity` | Đồng thời | `comparison_degree` | So sánh, mức độ |
| `addition` | Bổ sung, thêm vào | `habit_repetition` | Thói quen, lặp lại |
| `listing` | Liệt kê, lựa chọn | `passive_causative` | Bị động, sai khiến |
| `honorific_politeness` | Kính ngữ | `nominalization_modification` | Danh từ hoá, định ngữ |
| `emphasis_ending` | Sắc thái cuối câu | `other` | Khác (ghi lý do ở `notes_internal`) |

Thêm giá trị mới phải sửa bảng này qua PR.

---

## 6. File nhóm so sánh

`grammar/groups/<slug>.yaml` — nhóm gồm **≥ 2** điểm gần nghĩa dễ nhầm. Điểm nằm trong nhóm khai `compare_group: <slug>`; nhóm liệt kê lại `members` (hai chiều, validator kiểm khớp).

| Trường | Kiểu | BB | Ghi chú |
|---|---|---|---|
| `slug` | string | ✓ | Trùng tên file |
| `title_vi` | string | ✓ | Tiêu đề hiển thị, ví dụ "Nguyên nhân dẫn đến kết quả xấu: -느라고 / -는 바람에 / -는 탓에" |
| `function` | enum | ✓ | Chức năng chung (5.2) |
| `level` | int | ✓ | Cấp thấp nhất trong các thành viên |
| `members` | list[id] | ✓ | 2–5 id; thứ tự = thứ tự cột của bảng |
| `summary_vi` | string (md) | ✓ | Điểm chung và điểm khác trong 2–4 câu |
| `compare_table` | object | ✓ | `{columns, rows}`. `columns`: list pattern (khớp `members`); `rows`: `[{criterion_key, criterion, cells}]`, `cells` có đúng bằng số cột. `criterion_key` là khoá cố định để validator kiểm và giao diện căn hàng giữa các nhóm: `meaning` (nghĩa cốt lõi) · `pos` (loại từ đi kèm) · `subject` (chủ ngữ) · `tense` (thì) · `main_clause` (vế sau: kết quả/mệnh lệnh/đề nghị) · `nuance` (sắc thái) · `register` (văn nói/văn viết) · `other` (hàng bổ sung, được lặp). Bảng phải có đủ 7 khoá đầu, mỗi khoá một lần; `criterion` là nhãn hiển thị tự do |
| `contrast_examples` | list | ✓ | ≥ 2 tình huống: `[{situation_vi, items: [{member, ko, vi, ok, note_vi}]}]`. Mỗi tình huống đặt các thành viên vào **cùng một ngữ cảnh**; `vi` luôn là nghĩa dự định của câu; `ok: false` cho câu sai, `note_vi` **bắt buộc bắt đầu bằng "Sai:"** kèm lý do (validator kiểm). Một thành viên được xuất hiện nhiều lần trong một tình huống (để so ok/không ok) |
| `decision_tips_vi` | list[string] | ✓ | Mẹo chọn nhanh khi làm bài |
| `topik_traps_vi` | list[string] | – | Bẫy thường gặp ở R01–R04 (`near_synonym_grammar`) |
| `source`, `authored_by`, `created_at`, `reviewed_by`, `reviewed_at`, `notes_internal` | | | Như điểm ngữ pháp |

---

## 7. Ánh xạ YAML → CSDL

### 7.1 Từ vựng

| YAML | CSDL |
|---|---|
| `id` | `words.external_id` (unique, NOT NULL khi import) |
| `program` (từ đường dẫn) | `words.program_id` |
| `hangul`, `hanja`, `han_viet`, `meaning_vi`, `pos`, `level`, `example_ko`, `example_vi` | `words.*` cùng tên |
| `syllables[]` | `word_syllables(word_id, syllable_index, syllable=ko, hanja)` |
| bảng `_hanja-syllables.yaml` | `hanja_syllables(syllable, hanja, han_viet=hv)` |
| `false_friend` | `words.false_friend` hiện là `text`: **chưa đủ** cho cấu trúc (xem 7.3) |
| `collocations`, `note_vi`, `topics`, `refs`, `level_basis`, `status`, `notes_internal`, `syllables[].hv` (khi khác mặc định), `meaning_vi` và `alt_hv` của chữ Hán, `source`, `authored_by`, `reviewed_by/at` | **Chưa có cột** |

### 7.2 Ngữ pháp

| YAML | CSDL |
|---|---|
| `id` | `grammar_points.external_id` |
| `pattern`, `meaning_vi`, `level`, `function`, `compare_group`, `body_md` | `grammar_points.*` cùng tên |
| `slug`, `variants`, `form`, `constraints`, `examples`, `non_examples`, `common_mistakes_vi`, `related`, `refs`, `level_basis`, `status`, `source`, `authored_by`, `reviewed_by/at`, `notes_internal` | **Chưa có cột** |
| Nhóm: `slug`, `title_vi`, `function`, `level`, `members`, `summary_vi`, `compare_table`, `contrast_examples`, `decision_tips_vi`, `topik_traps_vi` | **Chưa có bảng** |

### 7.3 Cần backend-engineer bổ sung (đề xuất)

1. **`words`**
   - Thêm `meta jsonb not null default '{}'` (cùng kiểu với `questions.meta`) chứa `collocations`, `note_vi`, `topics`, `refs`, `level_basis`, `notes_internal`.
   - Thêm cột như `questions`: `source text not null default 'original'`, `authored_by text`, `reviewed_by text`, `reviewed_at date`, `published boolean not null default false` (hoặc `status`).
   - `false_friend`: đổi `text` → `jsonb` (`null` = không phải bạn giả; object `{kind, vi_meaning, note_vi}`). Bảng chưa có dữ liệu thật nên đổi kiểu rẻ.
   - Ràng buộc: `level` between 1 and 6; `pos` thuộc danh sách 3.4; `external_id` NOT NULL cho nội dung import; `program_id` NOT NULL cho nội dung import.
   - **`external_id` theo chương trình.** Id được đánh số theo từng chương trình (mục 2), nhưng `words_external_id_uq` và `grammar_points_external_id_uq` hiện là unique **toàn bảng**, nên chương trình thứ hai sẽ đụng `v-00001`. Chọn một trong hai: (i) đổi thành unique (`program_id`, `external_id`); hoặc (ii) giữ unique toàn cục và thêm tiền tố chương trình vào id khi có chương trình thứ hai. Áp dụng cả cho `questions` (`questions_external_id_uq`) **[cần backend-engineer quyết]**.
2. **`hanja_syllables`**: thêm `meaning_vi text` và `alt_han_viet text[] not null default '{}'`.
3. **`word_syllables`**: thêm `han_viet text null` (âm của chữ **trong từ này** khi khác `hanja_syllables.han_viet`).
4. **`grammar_points`**: thêm `slug text` (unique theo chương trình), `variants text[]`, `tag text` (sinh theo 5.1, unique, để nối với tag `grammar:` của câu hỏi), `meta jsonb` chứa `form`, `constraints`, `examples`, `non_examples`, `common_mistakes_vi`, `related`, `refs`, `level_basis`; cùng nhóm cột `source/authored_by/reviewed_by/reviewed_at/published` như trên. `compare_group` thành khoá ngoại tới bảng mới.
5. **Bảng mới `compare_groups`**: `id`, `program_id`, `slug` (unique theo chương trình), `title_vi`, `function`, `level`, `summary_md`, `meta jsonb` (`compare_table`, `contrast_examples`, `decision_tips_vi`, `topik_traps_vi`), và nhóm cột nguồn/duyệt. Bảng nối thành viên: lấy từ `grammar_points.compare_group`.
6. **Import**: chạy cả ba tầng (hanja_syllables → words/word_syllables → grammar/compare_groups) trong một giao dịch; upsert theo `external_id`/`slug`; chỉ import mục có `reviewed_by` hiệu lực ≠ null và `source = original`; từ `status: retired` thì ẩn (`published = false`), không xoá.
7. **Validator** (`lib/db/content-validation.ts`) hiện **bỏ qua** mọi YAML ngoài `practice/` (dòng "chỉ `<program>/practice/**` là file câu hỏi"). Cần thêm trình kiểm cho `vocab/` và `grammar/` theo mục 8. File mẫu `tests/fixtures/content/valid/topik-ii/vocab/vocab-sample.yaml` đang là danh sách gốc, không có `id` và không theo schema này: cần cập nhật khi viết validator (QA/backend, ngoài vùng của lexicographer).
8. **Tag `vocab:`** của câu hỏi chỉ nhận `hangul`, không phân biệt đồng âm khác chữ Hán (`수입` 收入/輸入). Nếu cần phân biệt, đề xuất `vocab:수입#v-00017` (khớp `\S+`) **[cần xác nhận]**.

---

## 8. Quy tắc validate đề xuất

**Lỗi (chặn import)**
1. Thiếu trường bắt buộc, sai kiểu, sai enum (`pos`, `function`, `kind`, `register`, `polarity`, `source`, `level_basis`).
2. `id`/`slug` sai regex; `id` trùng trong cùng chương trình; `batch`/`slug`/tên file không khớp.
3. `hangul`/mọi chuỗi tiếng Hàn không NFC; có BOM, tab, CRLF, jamo ghép trong `pattern`.
4. `hanja` ≠ null mà thiếu `han_viet` hoặc `syllables`; ngược lại `hanja` = null mà có `han_viet`/`syllables`.
5. Nối `syllables[].hanja` ≠ `hanja`; nối `hv` ≠ `han_viet`; `hangul` không bắt đầu bằng nối `ko`.
6. Cặp (`ko`, `hanja`) không có trong `_hanja-syllables.yaml`; `hv` không thuộc {`hv`, `alt_hv`} của dòng đó. Bảng âm tiết có hai dòng cùng (`ko`, `hanja`).
7. `hanja` chứa ký tự ngoài khối CJK Unified Ideographs (kể cả Extension A) hoặc chứa Hangul.
8. `false_friend` ≠ null mà thiếu `kind`/`vi_meaning`/`note_vi`, hoặc `kind` ngoài {`full`,`partial`}.
9. `level` ngoài 1–6.
10. Ngữ pháp: `examples` < 3; thiếu `common_mistakes_vi`; `compare_group` trỏ tới nhóm không tồn tại; nhóm có `members` không tồn tại hoặc điểm khai nhóm mà nhóm không liệt kê (và ngược lại); số `cells` của một hàng ≠ số cột; `columns` không khớp `pattern` các thành viên theo thứ tự; nhóm < 2 thành viên; bảng thiếu một trong 7 `criterion_key` bắt buộc (`meaning`, `pos`, `subject`, `tense`, `main_clause`, `nuance`, `register`) hoặc `criterion_key` ngoài danh sách; `note_vi` của `contrast_examples` có `ok: false` không bắt đầu bằng "Sai:".
11. `pattern` trùng trong chương trình; `pattern` chứa `~`; `pattern` không khớp quy tắc ký tự ở 5.1.
12. Import khi `reviewed_by` hiệu lực là `null` hoặc `source` ≠ `original` (như content-spec §5.9 lỗi 12).
13. Từ ghi `status: retired` bị xoá khỏi file (so với bản đã merge).

**Cảnh báo (không chặn)**
- Cặp (`hangul`, `hanja`) trùng ở hai từ `active` (nghi nhập đôi; từ đồng âm khác chữ Hán thì hợp lệ).
- `hv` ≠ `hv` mặc định mà từ thiếu `note_vi` hoặc `notes_internal` giải thích.
- `example_ko` không chứa phần Hán của từ (nối các `ko` của `syllables`); với từ thuần Hàn thì không chứa gốc từ bỏ âm tiết cuối (어울리- → 어울). Không so với "`hangul` bỏ `-다`" vì dạng chia làm mất gốc (복잡하다 → 복잡해서, 마련하다 → 마련해, 어울리다 → 어울려요) và sẽ báo nhầm hàng loạt; cảnh báo này chỉ gợi ý kiểm tay.
- `example_ko` quá 60 ký tự hoặc có hai câu; ví dụ trùng với `example_ko` của từ khác.
- `non_examples` có `ko` chứa `*`; `note_vi` của `non_examples` không bắt đầu bằng "Sai" (hoặc "Không hợp văn phong" cho lỗi văn phong, khi đã nêu rõ).
- `level_basis: editor` (cho biết chưa đối chiếu), từ Hán-Hàn không có `refs` với `checked: true` cho trường `hanja`.
- `collocations` < 2; `topics` ngoài danh sách content-spec §6.
- Phần dư của `hangul` sau các `ko` không thuộc danh sách phần thuần Hàn ở 3.3.
- `false_friend: null` mà `note_vi` chứa "bạn giả" (hoặc ngược lại).
- Ngữ pháp: tag `grammar:` của câu hỏi (content-spec §6) không khớp pattern điểm nào; `examples[].ko` không chứa hình thức của `pattern` (kiểm thô theo phần cố định như `바람에`, `탓에`).
- Lô > 80 từ; lô có phân bố `level` hoặc `pos` lệch nhiều.

---

## 9. Nguồn & giấy phép

Tra cứu ngày **2026-10-20** bằng WebSearch/WebFetch. Mức chắc chắn: **Cao** = đọc được trang chính thức; **Vừa** = chỉ thấy qua trang thứ cấp hoặc kết quả tìm kiếm; **Thấp** = suy luận, chưa kiểm.

### 9.1 Các nguồn

| Nguồn | Nội dung | Giấy phép / điều kiện | Chắc chắn |
|---|---|---|---|
| (a) **한국어 학습용 어휘 목록** (국립국어연구원, 2003-05) | 5.965 từ chia 3 mức A/B/C (982 / 2.111 / 2.872), kèm thứ hạng tần suất và ký hiệu đồng âm theo 표준국어대사전. Tải về dạng Excel/văn bản | Trang tải của 국립국어원 ghi **공공누리 Type 1 (출처표시)**: dùng được sau khi ghi rõ nguồn | Cao về nội dung và loại giấy phép (trang `korean.go.kr/front_eng/down/down_02V.do?etc_seq=70`). Thấp về mức dùng được cho mục tiêu của ta: 3 mức, **không** ứng với cấp 3–6, danh sách từ năm 2003 |
| (b) **국제통용 한국어 표준 교육과정** (국립국어원, nghiên cứu 2010–2017) | Theo bài giới thiệu trên 『새국어생활』 2018: **10.635 từ** (1급 735 · 2급 1.100 · 3급 1.655 · 4급 2.200 · 5급 2.365 · 6급 2.580) và **336 điểm ngữ pháp** (45 · 45 · 67 · 67 · 56 · 56). Tức cấp 3–4 có khoảng 3.855 từ và 134 điểm ngữ pháp | Chưa tìm được trang tải danh sách và loại 공공누리 của riêng tài liệu này | Vừa về số liệu (qua kết quả tìm kiếm trích 『새국어생활』). Chưa kiểm: danh sách đầy đủ có công khai không, giấy phép nào. **Không tìm thấy** bản 2020 hoặc 2022 như đề bài nhắc tới; không xác nhận được. **[cần xác nhận]** |
| (c1) **한국어기초사전** (krdict) | Từ điển học tập, mục từ có 원어 (Hán tự), từ loại, mức 초/중/고급 (hiển thị bằng ★★★ / ★★ / ★), ví dụ | Trang 저작권 정책: nội dung **không ghi riêng** theo **CC BY-SA 2.0 KR**: phải ghi tác giả, cho phép thương mại, **tác phẩm phái sinh phải cùng giấy phép (ShareAlike)**. Hình, âm thanh, video, phát âm: điều kiện riêng từng tệp. Không thấy 공공누리 ở trang này | Cao (đọc trực tiếp `krdict.korean.go.kr/kor/kboardPolicy/copyRightTermsInfo`). Có "tải toàn bộ" và Open API nhưng chưa đọc điều khoản riêng của chúng **[cần xác nhận]** |
| (c2) **표준국어대사전** | Từ điển chuẩn, có 원어, từ loại | **Chưa xác định.** (Tài liệu 편찬 지침 của 국립국어원 — không phải nội dung từ điển — ghi 공공누리 Type 1 và một loại riêng cho huấn luyện AI. Điều khoản của chính cổng từ điển chưa đọc được.) | Thấp. **[cần xác nhận]** |
| (c3) **우리말샘** | Từ điển mở của 국립국어원 | CC BY-SA 2.0 KR (trang 저작권 정책 của 우리말샘); văn bản có 출전 phải xin phép tác giả gốc; đa phương tiện có điều kiện riêng | Cao (đọc trực tiếp `opendict.korean.go.kr/service/copyrightPolicy`, theo kết quả duyệt 2026-10-21). Giữ quyết định **không dùng**: nội dung do người dùng đóng góp, độ tin cậy không đồng đều; ShareAlike |
| (d) Danh sách từ/ngữ pháp của sách luyện thi và nền tảng thương mại (Migii, sách TOPIK, TalkToMeInKorean…) | | Có bản quyền | **Không dùng**, kể cả để "đối chiếu" hay phỏng theo thứ tự/cấp, để tránh bị coi là tác phẩm phái sinh |
| (e) **Unihan** (Unicode) | Trường `kHangul`, `kVietnamese`… dùng để kiểm âm tiết bảng 4 | Unicode Terms of Use (cho phép dùng) | Vừa; chưa kiểm điều khoản chi tiết và độ phủ của `kVietnamese`. **[cần xác nhận]** |

TOPIK không công bố danh sách từ vựng theo cấp chính thức mà tôi tìm được; thang 1–6 của `level` dựa theo 1급–6급 của (b), được hiểu xấp xỉ cấp TOPIK **[cần xác nhận]**.

### 9.2 Cách dùng hợp lệ (quy tắc cho người soạn)

1. **Chỉ tham khảo, không nhập hàng loạt.** (a), (b), (c) dùng để *đối chiếu*: mục từ có thuộc cấp này không, chữ Hán (원어) nào, từ loại gì. Không đưa nguyên danh sách, không đưa định nghĩa hay ví dụ của họ vào repo.
2. **Tự viết** `meaning_vi`, `example_ko`, `example_vi`, `note_vi`, `body_md`. Không dịch lại định nghĩa tiếng Hàn của từ điển; ví dụ phải tự đặt.
3. Vì (c1) là **ShareAlike**, văn bản chép hoặc sát nghĩa từ krdict có thể kéo cả nội dung phái sinh của Topikly vào CC BY-SA. Tránh hoàn toàn bằng cách không chép. Sự thật đơn thuần (chữ Hán của một từ, từ loại, cấp) không phải sáng tạo có bản quyền, nhưng đây là nhận định của người soạn, không phải ý kiến pháp lý **[cần xác nhận]**.
   Ngoài từng sự thật, danh sách có chọn lọc và xếp cấp là cơ sở dữ liệu / tác phẩm biên tập. Không sao chép có hệ thống cấp độ của (b) hoặc krdict cho phần lớn từ vựng khi chưa rõ giấy phép (chép có hệ thống thứ tự và cấp của hàng nghìn mục từ có thể đụng quyền của người làm cơ sở dữ liệu, 저작권법 제93조); `level_basis` chỉ ghi kết quả đối chiếu từng mục **[cần xác nhận pháp lý]**.
4. Ghi vết: mỗi mục đã đối chiếu thật có `refs: [{src, entry, checked: true, fields: [...]}]`. Mục chưa đối chiếu để `refs` rỗng và `level_basis: editor`; nói rõ ở `verification_vi` của lô. Không ghi `checked: true` nếu chưa mở trang mục từ của nguồn (định nghĩa ở 3.2); thấy qua kết quả tìm kiếm thì `checked: false` và ghi ở `notes_internal`.
5. **Ghi công ở đâu**: (i) trường `refs` của từng mục; (ii) trang "Nguồn & ghi công" trên web (frontend-engineer tạo), liệt kê nguồn đã dùng, giấy phép và liên kết, theo mẫu: "Cấp độ tham chiếu: 국제통용 한국어 표준 교육과정 (국립국어원). Từ điển tham khảo: 한국어기초사전 (국립국어원), 표준국어대사전 (국립국어원). Nội dung giải nghĩa, ví dụ do Topikly tự biên soạn." (iii) tên nguồn, không nhúng tệp của họ.
6. Hình ảnh, âm thanh, phát âm từ krdict: **không dùng** (điều kiện theo từng tệp).

### 9.3 Quy tắc chữ Hán và âm Hán-Việt

- Hán tự lấy theo 표준국어대사전/한국어기초사전 (dạng phồn thể Hàn). Âm Hán-Việt lấy theo từ điển Hán-Việt phổ biến (Thiều Chửu, Đào Duy Anh…) và cách dùng thực tế trong tiếng Việt; âm theo **từ** (content-spec §4.2). Chưa chọn từ điển Hán-Việt tham chiếu duy nhất **[cần xác nhận]**.
- Từ đã có trong lời giải của câu hỏi đã duyệt (xem `content/_reviews/`) phải **khớp** (ví dụ 對處 đối xử, 豫防 dự phòng, 負擔 phụ đảm, 變動 biến động).

### 9.4 Tính toán quy mô MVP

MVP: ~1.500 từ và ~100 điểm ngữ pháp cấp 3–4 ([02 · Lộ trình](02-lo-trinh-trien-khai.md)). So với (b): ~39% số từ cấp 3–4 và ~75% số điểm ngữ pháp cấp 3–4 của khung 336 điểm, nên chọn lọc theo tần suất xuất hiện ở TOPIK II.

### 9.5 Tổng hợp **[cần xác nhận]**

1. Giấy phép và trang tải của danh sách 어휘/문법 theo 급 trong (b); có bản 2020/2022 hay không.
2. Điều khoản của cổng 표준국어대사전 (공공누리 Type 1 chỉ thấy ở tài liệu 편찬 지침, chưa chắc áp cho nội dung từ điển), và của "tải toàn bộ"/Open API của krdict (thương mại, tái phân phối, ShareAlike).
3. Ý kiến pháp lý: dùng sự thật (chữ Hán, từ loại, cấp) từ (c1)/(c2) trong sản phẩm thương mại có phát sinh nghĩa vụ ghi công hoặc ShareAlike không; và quyền với cơ sở dữ liệu / tác phẩm biên tập khi đối chiếu cấp độ cho hàng loạt mục từ (9.2.3).
4. Cách ánh xạ 급 của (b) và 초/중/고 của krdict sang `level` 1–6 và TOPIK.
5. Vị trí cuối cùng của `_hanja-syllables.yaml` (hiện trong `topik-ii/vocab/`).
6. Từ điển Hán-Việt tham chiếu; giấy phép/độ phủ Unihan nếu dùng.
7. Quy ước tag `vocab:` cho từ đồng âm (mục 7.3, điểm 8).

---

## 10. Quy trình & duyệt

```
lexicographer soạn (reviewed_by: null) → validator → topik-content-reviewer → NGƯỜI DÙNG điền reviewed_by/reviewed_at → merge → import
```
- Chỉ người dùng điền `reviewed_by`/`reviewed_at`. Agent soạn và reviewer không bao giờ điền.
- Cuối mỗi lượt, lexicographer liệt kê file đã tạo/sửa cho reviewer.
- Reviewer kiểm: (1) chữ Hán và `syllables` khớp từ; (2) âm Hán-Việt đúng chữ và đúng quen dùng; (3) phân loại `false_friend` đúng định nghĩa `full`/`partial`, không bắt nhầm; (4) cấp độ hợp lý và `level_basis` trung thực; (5) nghĩa, ví dụ tự nhiên, không phải bản chép; (6) ngữ pháp: ràng buộc nêu đúng, ví dụ đúng và thật sự minh hoạ điểm, `non_examples` thật sự sai; (7) bảng nhóm so sánh nhất quán với từng điểm.
- Sửa **nội dung** (nghĩa, hanja, âm, ví dụ, bạn giả, ràng buộc ngữ pháp, bảng nhóm) sau khi đã có `reviewed_by` thì đặt lại `reviewed_by: null` cho mục đó (và các mục có tham chiếu chéo, như điểm ngữ pháp trong cùng nhóm khi sửa bảng nhóm). Sửa `topics`, `notes_internal`, `refs`, `level_basis` chỉ là metadata.

---

## 11. Lô mẫu (đã sửa theo duyệt 2026-10-21)

| File | Nội dung |
|---|---|
| `content/topik-ii/vocab/_hanja-syllables.yaml` | Bảng 87 cặp (âm Hàn, chữ Hán) cho mọi chữ Hán trong lô |
| `content/topik-ii/vocab/{society,environment,economy,workplace,education,health,general}.yaml` | 52 từ (`v-00001` … `v-00052`), 51 từ cấp 3–4 và 1 từ cấp 2 (쓰레기): 45 Hán-Hàn, 7 thuần Hàn; 14 bạn giả (3 full: 대처하다, 인정하다, 실수; 11 partial). 거래 để `null` vì âm "khứ lai" không dùng trong tiếng Việt; 쓰레기 hạ xuống cấp 2 |
| `content/topik-ii/grammar/g-0001 … g-0010-*.yaml` | 10 điểm ngữ pháp cấp 3–4 |
| `content/topik-ii/grammar/groups/*.yaml` | 3 nhóm so sánh: `nguyen-nhan-ket-qua-xau` (g-0001..0003), `phong-doan-dua-vao-quan-sat` (g-0004..0006), `nhuong-bo-cho-du` (g-0007..0008); g-0009 và g-0010 chưa thuộc nhóm |

Toàn bộ `reviewed_by: null`, `level_basis: editor` (cấp độ do người soạn đánh giá, **chưa** đối chiếu với danh sách chính thức); mục chưa chắc ghi ở `notes_internal`.

---

## Phụ lục · Lịch sử thay đổi

### v0.2 · 2026-10-21
Sửa theo báo cáo duyệt `content/_reviews/2026-10-21-tu-vung-ngu-phap-mau.md`.
- §3.1: quy trình điền `reviewed_by` theo lô. §3.2: định nghĩa `refs.checked` (chỉ true khi đã mở trang mục từ); `example_ko` không còn so khớp theo gốc từ. §3.5: thêm bạn giả chiều Việt → Hàn.
- §4: bỏ 資 khỏi ví dụ chữ đa âm (資源 đọc "tư nguyên", "tài nguyên" ứng với 財); thêm quy tắc 두음법칙 và nguyên tắc chỉ ghi `alt_hv` khi có nguồn.
- §5: `non_examples` phải sai ngay trên câu chữ. §5.1: tag cũ không khớp pattern chuẩn được cảnh báo (vd. `grammar:-아-놓다` ở l11-0001; chỉ ghi chú, không sửa câu hỏi).
- §6: thêm `criterion_key` cố định (7 khoá bắt buộc) và quy tắc "Sai:" cho `ok: false`.
- §7.3: `external_id` unique theo chương trình. §8: cập nhật quy tắc validate tương ứng.
- §9: 우리말샘 có trang chính thức (CC BY-SA 2.0 KR); 공공누리 Type 1 của 편찬 지침 không đồng nghĩa giấy phép nội dung 표준국어대사전; thêm lưu ý quyền cơ sở dữ liệu / tác phẩm biên tập **[cần xác nhận pháp lý]**.
- §11: 14 bạn giả (3 full, 11 partial).

### v0.1 · 2026-10-20
Bản đầu tiên.
