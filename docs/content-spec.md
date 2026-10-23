# Đặc tả biên soạn nội dung TOPIK II (content-spec)

> **Phiên bản 0.3.1 · 2026-10-23** · Chủ sở hữu: `topik-content-designer` · Người dùng (product owner) duyệt cuối. Lịch sử thay đổi: xem [Phụ lục B](#phụ-lục-b--lịch-sử-thay-đổi).
> Đầu ra Giai đoạn 0 theo [02 · Lộ trình](02-lo-trinh-trien-khai.md#giai-đoạn-0--nền-móng-2-tuần). Dựa trên [01 · Phân tích chuyên môn](01-phan-tich-chuyen-mon.md) mục 2, mô hình dữ liệu ở [README mục 6](../README.md#6-mô-hình-dữ-liệu) và mẫu YAML ở [README mục 7](../README.md#7-cấu-trúc-thư-mục-dự-kiến).
>
> Ai dùng tài liệu này:
> - **topik-content-designer**: soạn câu hỏi đúng chuẩn (mục 3–6).
> - **topik-content-reviewer**: duyệt theo checklist (mục 7).
> - **backend-engineer**: viết script validate/import (mục 5.8–5.9).
> - **writing-ai-engineer**: dùng `required_points`, `accepted_answers`, `model_answers` để chấm Viết (mục 4.6, 5.6).
>
> Các chỗ đánh dấu **[cần đối chiếu]** là điểm chưa xác minh được với nguồn chính thức. Danh sách tổng hợp ở [Phụ lục A](#phụ-lục-a--danh-sách-điểm-cần-đối-chiếu).

---

## Mục lục

1. [Quy ước mã dạng](#1-quy-ước-mã-dạng)
2. [Danh mục subskill, kiểu bẫy, thang độ khó](#2-danh-mục-subskill-kiểu-bẫy-thang-độ-khó)
3. [Bảng taxonomy L01–L50, R01–R50, W51–W54](#3-bảng-taxonomy)
4. [Quy tắc biên soạn theo nhóm dạng](#4-quy-tắc-biên-soạn-theo-nhóm-dạng)
5. [Schema YAML](#5-schema-yaml)
6. [Quy tắc tags](#6-quy-tắc-tags)
7. [Checklist kiểm duyệt & định dạng báo cáo](#7-checklist-kiểm-duyệt--định-dạng-báo-cáo)
8. [Bản quyền, nguồn & quy trình](#8-bản-quyền-nguồn--quy-trình)
- [Phụ lục A · Điểm cần đối chiếu](#phụ-lục-a--danh-sách-điểm-cần-đối-chiếu)
- [Phụ lục B · Lịch sử thay đổi](#phụ-lục-b--lịch-sử-thay-đổi)

---

## 1. Quy ước mã dạng

### 1.1 `type_code`

`type_code` = **chữ cái kỹ năng + số vị trí câu (2 chữ số)** trong đề TOPIK II hình thức giấy (PBT):

| Tiền tố | Kỹ năng | Dải mã |
|---|---|---|
| `L` | 듣기 – Nghe | `L01` … `L50` |
| `R` | 읽기 – Đọc | `R01` … `R50` |
| `W` | 쓰기 – Viết | `W51` … `W54` (giữ đúng số câu trong đề, không đánh lại từ 01) |

- Luôn viết hoa, luôn 2 chữ số (`L03`, không phải `L3`).
- Một câu luyện tập mang `type_code` của **vị trí trong đề mà nó mô phỏng**. Ví dụ: một câu chèn câu viết theo độ dài và độ khó của câu 40 thì ghi `R40`, không ghi chung chung `R39`.
- Regex validate: `^(L(0[1-9]|[1-4][0-9]|50)|R(0[1-9]|[1-4][0-9]|50)|W5[1-4])$`.

### 1.2 Nhóm dạng (`type_group`)

Nhiều vị trí liền nhau cùng một dạng, ví dụ R39–R41 đều là chèn câu. Ta gom chúng thành **nhóm dạng**, ứng với cột `question_types.range`. Nhóm dạng là đơn vị của **thẻ luyện tập** ("Đọc 39–41: Chèn câu") và của thống kê điểm yếu.

- Mã nhóm: `<tiền tố><đầu>-<cuối>`, ví dụ `R39-41`, `L21-22`, `W53`.
- Nhóm **không ghi trong file YAML**. Nó được suy ra từ `type_code` qua cấu hình `question_types` của chương trình thi (mục 1.4).
- Trong một nhóm, các mã có thể khác nhau về độ dài, độ khó, thể loại ngữ liệu, thậm chí subskill (ví dụ `L03` là biểu đồ còn `L01–L02` là tranh). Bảng taxonomy ở mục 3 quy định chi tiết cho từng mã.

### 1.3 Bộ câu dùng chung ngữ liệu: `group_key`, `pair_with`

Một số vị trí đi theo **cặp** (hai câu hỏi trên cùng một bài nghe/đoạn văn), và có một **bộ ba**:

- Nghe: toàn bộ `L21–L50` thành 15 cặp: L21–22, L23–24, …, L49–50.
- Đọc: R19–20, R21–22, R23–24, R42–43, R44–45, R46–47 và bộ ba **R48–50**.

Quy ước:

1. **Mỗi file = một câu hỏi.** File nào trong bộ cũng chứa **đầy đủ ngữ liệu chung** (`passage` hoặc `transcript_ko`/`transcript_vi`) cộng với câu hỏi riêng của nó.
2. Các câu trong một bộ dùng **chung số thứ tự (serial)**: `l21-0007` đi với `l22-0007`; `r48-0002`, `r49-0002`, `r50-0002` là một bộ.
3. `group_key` = `<mã đầu>-<số cuối>-<serial>`, viết thường: `l21-22-0007`, `r48-50-0002`. Khi import, các file cùng `group_key` gộp thành **một** dòng `question_groups`.
4. `pair_with` là **danh sách** id của các câu còn lại trong bộ: `[l22-0007]`, hoặc `[r49-0002, r50-0002]`. Được phép trỏ tới id **chưa tồn tại**, nếu câu kia chưa soạn. Khi đó script validate chỉ cảnh báo, không chặn. Riêng đề thi Full test thì bộ câu phải đủ.
5. Ngữ liệu chung trong các file cùng `group_key` phải **giống hệt nhau từng ký tự**. Script validate sẽ so sánh. Sửa ngữ liệu thì sửa đồng thời mọi file trong bộ.
6. Câu đơn (không thuộc bộ nào) thì bỏ trống `group_key` và `pair_with`.

### 1.4 Cấu trúc đề là cấu hình, không hard-code

Số câu, thứ tự, thời gian, điểm từng câu, số lần phát audio, giới hạn ký tự và ngưỡng điểm quy đổi cấp đều là **dữ liệu cấu hình theo `programs`/`question_types`/`sections`**. Không được viết cứng trong code hay trong tài liệu chiến lược. Các con số trong tài liệu này (50 câu Nghe, 70 phút Đọc, 200–300 ký tự…) chỉ để **tham chiếu khi biên soạn**. Nếu NIIED đổi format thì sửa cấu hình và bảng taxonomy, file câu hỏi không phải đổi.

### 1.5 Đối chiếu nguồn chính thức & IBT

- Bản đồ dạng trong tài liệu này dựa trên **đề PBT theo khung cải cách 2014 (từ kỳ 35)** [cần đối chiếu số kỳ] và hiểu biết chuyên môn. Ngày 2026-10-19 tôi **không truy xuất được** trang cấu trúc đề trên `topik.go.kr` bằng công cụ tự động (trang dùng JavaScript). Bản đồ L25–L38 khớp với nguồn thứ cấp (giới thiệu khoá học luyện thi trên Udemy). Trước khi chốt Full test đầu tiên, người dùng hoặc reviewer cần mở `topik.go.kr`, đối chiếu các mục ở Phụ lục A, rồi ghi ngày đối chiếu vào đầu tài liệu này.
- **IBT** có số câu, thời gian, thứ tự và một số dạng câu khác PBT. Quy tắc:
  - Dạng nào IBT dùng giống PBT thì **tái dùng `type_code` PBT**.
  - Dạng chỉ có ở IBT thì cấp **mã mới** trong `question_types` (ví dụ tiền tố riêng do backend và người dùng chốt) [cần đối chiếu]. **Không** gán nghĩa mới cho mã PBT đã có.
  - Subskill vẫn lấy từ danh mục ở mục 2.1 để thống kê xuyên chế độ thi.

---

## 2. Danh mục subskill, kiểu bẫy, thang độ khó

### 2.1 Danh mục subskill (cố định)

Mỗi câu có **đúng một** `subskill`. Giá trị mặc định là subskill chính của `type_code`. Chỉ được dùng một giá trị trong cột "phụ cho phép" ở mục 3 khi lệnh hỏi thực sự hỏi kỹ năng đó. Muốn thêm subskill mới phải sửa tài liệu này trước, qua PR.

| subskill | Mô tả (tiếng Việt) | Dùng chủ yếu ở |
|---|---|---|
| `picture_match` | Nghe tình huống, chọn tranh khớp với hành động, vị trí, đồ vật được nói tới | L01–L02 |
| `chart_reading` | Đọc/nghe số liệu, đối chiếu với biểu đồ hoặc bảng: thứ hạng, xu hướng, tỉ lệ | L03, R10 |
| `next_response` | Chọn lời đáp tiếp theo phù hợp về nội dung **và** ngữ dụng | L04–L08 |
| `next_action` | Suy ra hành động nhân vật sẽ làm **ngay sau** hội thoại | L09–L12 |
| `detail_match` | Chọn phương án trùng khớp nội dung (일치). Đáp án là câu diễn đạt lại thông tin trong bài | L13–L16, cặp Nghe, R09–R12, R32–R34… |
| `detail_specific` | Trả lời một câu hỏi chi tiết có mục tiêu cụ thể (lý do, cách thức, điều kiện), khác với việc đối chiếu toàn bài | L44 |
| `central_thought` | Nắm **suy nghĩ chính của một người nói/nhân vật** cụ thể (중심 생각) | L17–L21, L25, L31, L37 |
| `main_idea` | Nắm **chủ đề / nội dung trung tâm của cả văn bản** (주제, 중심 내용, "무엇에 대한 내용") | L33, L41, L43, R20, R35–R38, R44 |
| `text_identification` | Nhận ra văn bản thực dụng ngắn (quảng cáo, khẩu hiệu, hướng dẫn) nói về cái gì | R05–R08 |
| `purpose` | Nhận ra mục đích, ý định của người nói hoặc tác giả (의도, 목적) | L27, R48 |
| `speech_act` | Nhận ra người nói **đang làm gì** bằng lời: hỏi, yêu cầu, giới thiệu, cảm ơn, kêu gọi… | L23, L35 |
| `speaker_identity` | Suy ra người nói là ai (nghề nghiệp, vai trò) từ nội dung | L29 |
| `attitude` | Nhận ra thái độ của người nói/tác giả đối với một đối tượng: ủng hộ, lo ngại, phê phán, hoài nghi… | L48, L50, R46, R50 |
| `speaker_strategy` | Nhận ra **cách nói/cách lập luận** (말하는 방식): nêu ví dụ, phản bác, so sánh, dẫn số liệu, đặt câu hỏi… | L32, L46 |
| `emotion` | Nhận ra tâm trạng/cảm xúc nhân vật qua chi tiết gián tiếp (심정) | R23, R42 |
| `inference_before` | Suy ra nội dung đứng **trước** đoạn nghe | L39 |
| `fill_blank_grammar` | Chọn cấu trúc ngữ pháp điền vào chỗ trống trong một câu | R01–R02 |
| `similar_expression` | Chọn biểu hiện gần nghĩa nhất với phần gạch chân (유사 문법/표현) | R03–R04 |
| `fill_blank_connector` | Chọn phó từ/từ nối điền vào chỗ trống dựa trên quan hệ logic giữa các câu | R19 |
| `fill_blank_idiom` | Chọn quán ngữ/thành ngữ (관용 표현) hợp ngữ cảnh | R21 |
| `fill_blank_content` | Chọn cụm hoặc mệnh đề điền vào chỗ trống dựa trên mạch lập luận | R16–R18, R28–R31, R45, R49 |
| `sentence_order` | Sắp xếp thứ tự câu dựa trên liên kết: chỉ từ, từ nối, thông tin cũ → mới | R13–R15 |
| `headline` | Hiểu tít báo: lược trợ từ, danh từ hoá, ẩn dụ (빨간불, 날개 달다…) | R25–R27 |
| `insert_sentence` | Chọn vị trí chèn câu `<보기>` dựa trên phương tiện liên kết | R39–R41 |
| `practical_completion` | Viết câu hoàn chỉnh vào chỗ trống trong văn bản thực dụng, đúng ngữ cảnh và đúng kính ngữ | W51 |
| `expository_completion` | Viết câu hoàn chỉnh vào chỗ trống trong đoạn văn giải thích, văn phong 문어체 -ㄴ다 | W52 |
| `data_description` | Mô tả và phân tích biểu đồ/bảng thành đoạn văn 200–300 ký tự | W53 |
| `argumentative_essay` | Viết bài nghị luận 600–700 ký tự trả lời các câu hỏi gợi ý | W54 |

Dự phòng, chưa dùng trong PBT hiện hành: `inference_after` (suy ra nội dung tiếp theo). Chỉ kích hoạt khi một dạng IBT hoặc dạng mới cần đến.

### 2.2 Danh mục kiểu bẫy (`trap`) cho phương án nhiễu

Mỗi phương án sai nên gắn một mã `trap` (trường của choice, mục 5.3). Trong một câu nên dùng **ít nhất 2 kiểu bẫy khác nhau**.

**Ngoại lệ:** ba subskill `fill_blank_connector` (R19), `sentence_order` (R13–R15) và `insert_sentence` (R39–R41) không bắt buộc 2 kiểu bẫy. Ở các dạng này, mọi phương án nhiễu tự nhiên đều có thể cùng là `logic_mismatch` hoặc `cohesion_break`. Bù lại, `note_vi` của từng phương án phải nêu **quan hệ logic cụ thể** mà phương án đó biểu thị (ví dụ "오히려 = đảo ngược kỳ vọng"), hoặc nêu **mối nối cụ thể** bị đứt.

| trap | Mô tả |
|---|---|
| `detail_swap` | Sai một chi tiết: số, thời gian, địa điểm, đối tượng, thứ tự |
| `speaker_swap` | Gán lời nói, hành động hay quan điểm của người này cho người kia, trong số **các người nói hoặc nhân vật có mặt** trong ngữ liệu |
| `concession_point` | Trình bày như lập trường của người nói/tác giả một quan điểm mà ngữ liệu **có nhắc tới nhưng người nói/tác giả không giữ**. Gồm: ý nhượng bộ (`물론 …`), quan điểm của người khác được trích dẫn rồi phản bác (`일부에서는 …`, `흔히 …`, `-다는 우려도 있다` rồi `그러나/하지만`). Bẫy này hay gặp nhất ở R35–R38, R44–R50, L31, L41–L50 |
| `time_shift` | Lẫn đã làm / đang làm / sẽ làm, hoặc lẫn trước / sau |
| `negation_flip` | Đảo khẳng định ↔ phủ định |
| `degree_shift` | Sai mức độ hoặc phạm vi: 일부 ↔ 대부분, 가끔 ↔ 항상, 조금 ↔ 크게 |
| `reverse_causality` | Đảo quan hệ nhân quả hoặc gán sai nguyên nhân |
| `logic_mismatch` | Sai quan hệ logic giữa câu: bổ sung, đối lập, nhân quả, nhượng bộ, ví dụ (dùng cho từ nối, chèn câu, sắp xếp) |
| `cohesion_break` | Vị trí hoặc thứ tự phá vỡ liên kết: chỉ từ không có tiền ngữ, thông tin mới đứng trước thông tin cũ |
| `overgeneralization` | Quá khái quát, tuyệt đối hoá so với văn bản |
| `too_narrow` | Quá hẹp: chỉ là một chi tiết hoặc ví dụ, không bao quát ý chính |
| `true_not_main` | Đúng với văn bản **theo ý của chính người nói/tác giả**, nhưng không phải điều câu hỏi hỏi (ví dụ đúng nhưng không phải ý chính). Nếu đó là quan điểm mà người nói/tác giả không giữ thì dùng `concession_point` |
| `outside_text` | Hợp lý theo hiểu biết chung nhưng văn bản không nói tới |
| `keyword_echo` | Lặp từ khoá nghe/đọc được nhưng ghép sai nghĩa hoặc sai ngữ dụng |
| `near_synonym_grammar` | Ngữ pháp gần nghĩa nhưng sai sắc thái hoặc điều kiện dùng (-느라고 / -는 바람에…) |
| `collocation_error` | Kết hợp từ không tự nhiên hoặc sai quán ngữ |
| `register_mismatch` | Sai văn phong, kính ngữ hoặc tình huống giao tiếp |
| `attitude_mismatch` | Đúng đối tượng nhưng sai thái độ (hoặc sai cường độ), hoặc đúng thái độ nhưng sai đối tượng |

### 2.3 Thang độ khó `difficulty`

`difficulty` là số nguyên **3–6**, bằng **cấp TOPIK mà câu hỏi phân hoá**: thí sinh vững cấp đó làm đúng khoảng 60–70%, thí sinh dưới một cấp phần lớn làm sai. Bảng ở mục 3 ghi độ khó điển hình của từng vị trí. Được lệch ±1 so với bảng (để làm Hard test hoặc bài khởi động), nhưng phải nêu lý do trong `notes_internal`.

Yếu tố quyết định độ khó, xếp theo mức ảnh hưởng:
1. Mức trừu tượng của chủ đề.
2. Cấp của từ vựng và ngữ pháp then chốt.
3. Khoảng cách diễn đạt lại giữa đáp án và văn bản.
4. Độ "gần" của phương án nhiễu.
5. Độ dài ngữ liệu.

---

## 3. Bảng taxonomy

Cột "Độ khó" là độ khó điển hình. "—" nghĩa là không có subskill phụ. Lệnh đề chuẩn của từng nhóm ở mục 4.

### 3.1 듣기 – Nghe

| type_code | Nhóm | Dạng | Thể loại ngữ liệu | subskill chính | Phụ cho phép | Độ khó |
|---|---|---|---|---|---|---|
| L01, L02 | L01-03 | Chọn tranh khớp tình huống | Hội thoại nam–nữ 3–4 lượt ở nơi công cộng: cửa hàng, thư viện, văn phòng, ga | `picture_match` | — | 3 |
| L03 | L01-03 | Chọn biểu đồ đúng | Độc thoại kiểu bản tin hoặc báo cáo khảo sát, có số liệu và thứ hạng | `chart_reading` | `detail_match` | 3–4 |
| L04, L05, L06, L07, L08 | L04-08 | Chọn câu nói tiếp theo | Hội thoại 2–3 lượt, đời sống/công việc. Lượt cuối bỏ ngỏ | `next_response` | — | 3 |
| L09, L10, L11, L12 | L09-12 | Hành động tiếp theo của 여자 | Hội thoại khoảng 4 lượt, có phân công việc | `next_action` | — | 3 |
| L13 | L13-16 | Chọn nội dung trùng khớp | Hội thoại đời sống | `detail_match` | — | 3 |
| L14 | L13-16 | Chọn nội dung trùng khớp | Thông báo, 안내 방송 (đơn thoại) [cần đối chiếu] | `detail_match` | — | 3–4 |
| L15 | L13-16 | Chọn nội dung trùng khớp | Bản tin 뉴스 [cần đối chiếu] | `detail_match` | — | 4 |
| L16 | L13-16 | Chọn nội dung trùng khớp | Phỏng vấn ngắn [cần đối chiếu] | `detail_match` | — | 4 |
| L17, L18, L19 | L17-20 | 중심 생각 của 남자 | Hội thoại ngắn, nam nêu quan điểm | `central_thought` | — | 3–4 |
| L20 | L17-20 | 중심 생각 của 남자 | Phỏng vấn ngắn [cần đối chiếu] | `central_thought` | — | 4 |
| L21 | L21-22 | 중심 생각 của 남자 | Hội thoại công việc: bàn kế hoạch, đề xuất | `central_thought` | — | 4 |
| L22 | L21-22 | Nội dung trùng khớp | (chung với L21) | `detail_match` | — | 4 |
| L23 | L23-24 | Người nói đang làm gì | Hội thoại qua điện thoại hoặc tại quầy: hỏi thông tin, đăng ký, khiếu nại | `speech_act` | `purpose` | 4 |
| L24 | L23-24 | Nội dung trùng khớp | (chung với L23) | `detail_match` | — | 4 |
| L25 | L25-26 | 중심 생각 của người được phỏng vấn | Phỏng vấn người làm hoạt động xã hội hoặc công việc đặc biệt | `central_thought` | — | 4 |
| L26 | L25-26 | Nội dung trùng khớp | (chung với L25) | `detail_match` | — | 4 |
| L27 | L27-28 | Ý định khi nói (의도) | Hội thoại hai người: đề xuất, thuyết phục, góp ý | `purpose` | `speech_act` | 4 |
| L28 | L27-28 | Nội dung trùng khớp | (chung với L27) | `detail_match` | — | 4 |
| L29 | L29-30 | Người nói là ai | Phỏng vấn về một nghề chuyên môn, không nêu thẳng tên nghề | `speaker_identity` | — | 4–5 |
| L30 | L29-30 | Nội dung trùng khớp | (chung với L29) | `detail_match` | — | 4–5 |
| L31 | L31-32 | 중심 생각 của 남자 | Tranh luận/thảo luận chính sách (토론), hai bên đối lập | `central_thought` | — | 5 |
| L32 | L31-32 | Thái độ / cách nói của 남자 | (chung với L31) | `speaker_strategy` | `attitude` | 5 |
| L33 | L33-34 | Nội dung về cái gì | Bài giảng/thuyết trình ngắn (강연) về khoa học, tâm lý, xã hội | `main_idea` | — | 5 |
| L34 | L33-34 | Nội dung trùng khớp | (chung với L33) | `detail_match` | — | 5 |
| L35 | L35-36 | Người nói đang làm gì | Diễn văn, phát biểu nghi lễ (기념식, 시상식, 개회사, 추모사) | `speech_act` | `purpose` | 5 |
| L36 | L35-36 | Nội dung trùng khớp | (chung với L35) | `detail_match` | — | 5 |
| L37 | L37-38 | 중심 생각 của chuyên gia | Chương trình giáo dục/교양 프로그램: MC hỏi, chuyên gia trả lời. Người được hỏi thường là 여자 [cần đối chiếu] | `central_thought` | — | 5 |
| L38 | L37-38 | Nội dung trùng khớp | (chung với L37) | `detail_match` | — | 5 |
| L39 | L39-40 | Nội dung đứng trước đoạn nghe | Đối đàm (대담). Lượt đầu nhắc lại điều vừa nói ("말씀하신 것처럼…") | `inference_before` | — | 5 |
| L40 | L39-40 | Nội dung trùng khớp | (chung với L39) | `detail_match` | — | 5 |
| L41 | L41-42 | Nội dung trung tâm của bài giảng | Bài giảng (강연) học thuật | `main_idea` | `central_thought` | 5–6 |
| L42 | L41-42 | Nội dung trùng khớp | (chung với L41) | `detail_match` | — | 5–6 |
| L43 | L43-44 | Nội dung về cái gì | Phim tài liệu (다큐멘터리), giọng thuyết minh: tự nhiên, lịch sử, văn hoá [cần đối chiếu] | `main_idea` | — | 5–6 |
| L44 | L43-44 | Câu hỏi chi tiết: lý do, cách thức | (chung với L43) [cần đối chiếu cách hỏi] | `detail_specific` | `detail_match` | 5–6 |
| L45 | L45-46 | Nội dung trùng khớp | Bài giảng học thuật chuyên sâu | `detail_match` | — | 6 |
| L46 | L45-46 | Cách nói của người giảng | (chung với L45) | `speaker_strategy` | `attitude` | 5–6 (xem ghi chú) |
| L47 | L47-48 | Nội dung trùng khớp | Đối đàm chuyên gia (대담) về chính sách, xã hội | `detail_match` | — | 6 |
| L48 | L47-48 | Thái độ của 남자 | (chung với L47) | `attitude` | `speaker_strategy` | 6 |
| L49 | L49-50 | Nội dung trùng khớp | Bài giảng học thuật: lịch sử, triết học, nhân văn | `detail_match` | — | 6 |
| L50 | L49-50 | Thái độ của người giảng | (chung với L49) | `attitude` | `speaker_strategy` | 6 |

Ghi chú Nghe:
- Thứ tự câu hỏi trong các cặp L45–L50 ("trùng khớp" đứng trước, "cách nói/thái độ" đứng sau) và giới tính người nói được hỏi ở từng cặp **có thể thay đổi giữa các kỳ** [cần đối chiếu]. Luôn ghi rõ người nói được hỏi trong `stem` (남자/여자).
- Số lần phát audio (ước đoán: L01–L20 một lần, L21–L50 hai lần) [cần đối chiếu] là cấu hình `sections`, không ghi trong file câu hỏi.
- **L46 (và các câu `speaker_strategy` nói chung)**: bài giảng thường có tín hiệu cấu trúc rõ (`크게 세 가지로`, `먼저`, `반대로`), nên đáp án dễ lộ. Chỉ gắn `difficulty: 6` khi có **ít nhất 2 phương án nhiễu bám vào một chi tiết có thật trong bài** (ví dụ cùng bám vào một quan điểm được trích dẫn). Nếu không đạt điều kiện này thì gắn 5.

### 3.2 읽기 – Đọc

| type_code | Nhóm | Dạng | Thể loại ngữ liệu | subskill chính | Phụ cho phép | Độ khó |
|---|---|---|---|---|---|---|
| R01, R02 | R01-02 | Điền ngữ pháp vào chỗ trống | 1 câu (2 mệnh đề) đời sống | `fill_blank_grammar` | — | 3 |
| R03, R04 | R03-04 | Biểu hiện gần nghĩa với phần gạch chân | 1 câu đời sống | `similar_expression` | — | 3 |
| R05, R06 | R05-08 | Văn bản nói về cái gì | Quảng cáo sản phẩm/dịch vụ (khẩu hiệu ngắn) [cần đối chiếu phân bổ] | `text_identification` | — | 3 |
| R07 | R05-08 | Văn bản nói về cái gì | Quảng cáo công ích, chiến dịch (캠페인) | `text_identification` | — | 3 |
| R08 | R05-08 | Văn bản nói về cái gì | Hướng dẫn, lưu ý sử dụng (안내, 주의 사항) | `text_identification` | — | 3 |
| R09 | R09-12 | Nội dung trùng khớp | Thông báo hoặc poster sự kiện (안내문) | `detail_match` | — | 3 |
| R10 | R09-12 | Nội dung trùng khớp với biểu đồ | Biểu đồ/bảng khảo sát | `chart_reading` | `detail_match` | 3–4 |
| R11, R12 | R09-12 | Nội dung trùng khớp | Tin ngắn (기사) | `detail_match` | — | 4 |
| R13, R14, R15 | R13-15 | Sắp xếp thứ tự câu | 4 câu (가)–(라), đời sống hoặc thông tin | `sentence_order` | — | 4 |
| R16, R17, R18 | R16-18 | Điền nội dung vào chỗ trống | Đoạn thông tin ngắn | `fill_blank_content` | `fill_blank_connector` | 4 |
| R19 | R19-20 | Điền phó từ/từ nối | Đoạn giải thích ngắn | `fill_blank_connector` | — | 4 |
| R20 | R19-20 | Chủ đề của đoạn | (chung với R19) [cần đối chiếu: 주제 hay 중심 생각] | `main_idea` | `central_thought` | 4 |
| R21 | R21-22 | Điền quán ngữ (관용 표현) | Đoạn giải thích hoặc nghị luận ngắn | `fill_blank_idiom` | — | 4 |
| R22 | R21-22 | Nội dung trùng khớp | (chung với R21) [cần đối chiếu: 일치 hay 중심 생각] | `detail_match` | `central_thought` | 4 |
| R23 | R23-24 | Tâm trạng nhân vật "나" ở phần gạch chân | Tuỳ bút hoặc truyện ngắn ngôi thứ nhất (수필) | `emotion` | — | 4–5 |
| R24 | R23-24 | Nội dung trùng khớp | (chung với R23) | `detail_match` | — | 4–5 |
| R25, R26, R27 | R25-27 | Giải thích đúng tít báo | Tít báo 1 dòng | `headline` | — | 5 |
| R28, R29, R30, R31 | R28-31 | Điền nội dung vào chỗ trống | Đoạn thông tin/học thuật | `fill_blank_content` | — | 5–6 |
| R32, R33, R34 | R32-34 | Nội dung trùng khớp | Đoạn thông tin/học thuật: lịch sử, khoa học, văn hoá | `detail_match` | — | 5 |
| R35, R36, R37, R38 | R35-38 | Chủ đề của đoạn | Đoạn nghị luận/thông tin | `main_idea` | — | 5 |
| R39, R40 | R39-41 | Chèn câu `<보기>` | Đoạn thông tin/học thuật | `insert_sentence` | — | 5 |
| R41 | R39-41 | Chèn câu `<보기>` | Thường là bài giới thiệu hoặc phê bình sách, phim, triển lãm [cần đối chiếu] | `insert_sentence` | — | 5 |
| R42 | R42-43 | Tâm trạng/thái độ nhân vật ở phần gạch chân | Trích đoạn tiểu thuyết (tự soạn) | `emotion` | `attitude` | 5 |
| R43 | R42-43 | Nội dung trùng khớp | (chung với R42) | `detail_match` | — | 5 |
| R44 | R44-45 | Chủ đề | Bài học thuật dài [cần đối chiếu thứ tự 44/45] | `main_idea` | — | 6 |
| R45 | R44-45 | Điền nội dung | (chung với R44) | `fill_blank_content` | — | 6 |
| R46 | R46-47 | Thái độ của tác giả | Bài nghị luận/chính luận [cần đối chiếu] | `attitude` | — | 6 |
| R47 | R46-47 | Nội dung trùng khớp | (chung với R46) | `detail_match` | — | 6 |
| R48 | R48-50 | Mục đích viết | Bài chính luận dài (chính sách, xã hội, kinh tế) | `purpose` | — | 6 |
| R49 | R48-50 | Điền nội dung | (chung với R48) | `fill_blank_content` | — | 6 |
| R50 | R48-50 | Thái độ của tác giả ở phần gạch chân | (chung với R48) | `attitude` | — | 6 |

Ghi chú Đọc:
- Dạng câu hỏi ở R20, R22, R44–R46 **có thể khác nhau giữa các kỳ**. Chọn `subskill` theo `stem` thực tế, trong phạm vi cột "phụ cho phép".
- Có kỳ đề trước đây dùng R46 làm câu chèn `<보기>` thay cho câu thái độ [cần đối chiếu A11]. Việc này quyết định ngữ liệu chung R46–R47 có cần vị trí ㉠–㉣ hay không. Phải chốt trước khi soạn bộ R46–R47 đầu tiên. Nếu chốt R46 là câu chèn câu thì cùng lúc: đổi subskill chính của R46 thành `insert_sentence` (validator lỗi 4 sẽ chặn nếu không đổi), áp ngoại lệ ≥2 kiểu bẫy ở §2.2 cho R46, và thêm `stem` chèn câu vào bảng ở §4.5.

### 3.3 쓰기 – Viết

| type_code | Nhóm | Dạng | Ngữ liệu | subskill | Độ khó |
|---|---|---|---|---|---|
| W51 | W51 | Viết 2 câu vào chỗ trống ㉠ ㉡ | Văn bản thực dụng: email, thông báo, tin nhắn, bài đăng bảng tin | `practical_completion` | 3–4 |
| W52 | W52 | Viết 2 câu vào chỗ trống ㉠ ㉡ | Đoạn văn giải thích, 문어체 | `expository_completion` | 4 |
| W53 | W53 | Mô tả & phân tích số liệu, 200–300 ký tự | Biểu đồ/bảng (số liệu giả định) | `data_description` | 4–5 |
| W54 | W54 | Nghị luận 600–700 ký tự | Đoạn dẫn + 2–3 câu hỏi gợi ý | `argumentative_essay` | 5–6 |

---

## 4. Quy tắc biên soạn theo nhóm dạng

Độ dài tính bằng **ký tự kể cả khoảng trắng** (cách đếm ở mục 5.7). Riêng transcript Nghe: chỉ đếm **phần lời**, **không tính** nhãn người nói đầu dòng (`남자: `, `여자: `, `남자 1: `…) và ký tự xuống dòng. Validator tự bỏ nhãn trước khi đếm, nên người soạn không cần đếm tay. Các con số là **ước lượng** theo đề thật cùng vị trí, sẽ hiệu chỉnh khi đã có ngân hàng câu.

### 4.1 Quy tắc chung

Phạm vi: phần **Cấu trúc** và **Phương án nhiễu** áp dụng cho câu trắc nghiệm (Nghe, Đọc). Phần **Tiếng Hàn** và **Lỗi AI hay mắc** áp dụng cho **mọi dạng, kể cả Viết** (ngữ liệu, đề, đáp án chấp nhận, bài mẫu).

**Cấu trúc (trắc nghiệm)**
- Đúng **4 phương án**, nhãn `①②③④` theo thứ tự, **đúng 1** phương án `correct: true`.
- Các phương án **song song** về ngữ pháp và độ dài (chênh không quá khoảng 30%). Đáp án đúng **không** được luôn là câu dài nhất, cụ thể nhất hay "mềm" nhất.
- Phân bố nhãn đúng và chu kỳ lặp nhãn, chia theo phạm vi:
  - **Đề lắp ráp (Full, Mini, Hard, IBT): quy tắc bắt buộc**, do script lắp đề kiểm tra và chặn. Mỗi nhãn khoảng 25%. Không quá 3 câu liền nhau cùng nhãn đúng. **Không có chu kỳ lặp nhãn đúng**, tức không có chuỗi nhãn dài từ 4 trở lên lặp lại liền nhau (ví dụ ②④①③ │ ②④①③). Script nên xáo **thứ tự câu** chứ không đảo nhãn. Đảo nhãn phương án buộc phải đảo cả các tham chiếu nhãn trong `explanation_vi`/`note_vi`, nên đó là thay đổi nội dung.
  - **Lô soạn (luyện tập): chỉ là khuyến nghị.** Validator cảnh báo, không chặn. Lô soạn theo thứ tự `type_code` dễ sinh ra chu kỳ, nhưng người học luyện theo dạng không gặp câu theo thứ tự đó. Reviewer ghi nhận ở phần "Nhận xét cấp lô".
- Không dùng phương án kiểu "모두 맞다 / 정답 없음".

**Phương án nhiễu (trắc nghiệm)**
- Mỗi phương án nhiễu phải "hợp lý nhưng sai" vì **một lý do cụ thể**, gắn mã `trap` (mục 2.2).
- Ở dạng trùng khớp, phương án nhiễu nên dùng từ khoá có trong bài. Đáp án đúng phải **diễn đạt lại**, không chép nguyên câu.
- Tự kiểm tra: thử **bảo vệ từng phương án nhiễu**. Nếu tìm được một cách đọc văn bản hợp lý khiến nó đúng, thì sửa.
- Tự kiểm tra: che văn bản đi. Nếu chỉ nhờ hiểu biết chung vẫn chọn được đáp án, thì sửa.

**Tiếng Hàn (mọi dạng, kể cả Viết)**
- 띄어쓰기 và chính tả theo 표준국어대사전 (국립국어원). Đơn vị đi sau chữ số Ả Rập **được phép viết liền hoặc cách** (한글 맞춤법 제43항, phần 다만: `210만 건` / `210만건`, `10개`). Trong một câu hỏi, chọn một cách và dùng **thống nhất**. Bài mẫu và ngữ liệu mặc định viết cách. Không coi cách viết kia là lỗi trong lời giải.
- Dùng dấu câu chuẩn. Số viết bằng chữ số Ả Rập. Tên người là tên Hàn phổ biến, hư cấu.
- Không dùng tên thương hiệu, cơ quan hay người có thật. Cơ quan khảo sát ghi `○○연구소`, `△△시`.
- Từ vựng then chốt ở cấp không cao hơn `difficulty`. Từ khó hơn chỉ được dùng nếu đoán được từ ngữ cảnh và không quyết định đáp án.
- Tránh chủ đề nhạy cảm: chính trị đảng phái, tôn giáo, Bắc Triều Tiên, tranh chấp lãnh thổ, thảm hoạ có thật, nội dung gây phân biệt.
- Kiến thức trong bài thông tin/học thuật phải **đúng sự thật** hoặc là nhận định phổ quát. Không bịa "phát hiện khoa học" gán cho người hay tổ chức có thật.

**Lỗi AI hay mắc (mọi dạng)**
- **번역투** (văn dịch): lạm dụng `그것은/그들은`, `~을 가지다`, `~에 의해`, `~하는 것이 가능하다`, `~에 있어서`, chuỗi danh từ hoá dài.
- Hội thoại cứng như văn viết. Trộn 반말/존댓말 không nhất quán. Ai cũng dùng -습니다.
- Phương án nhiễu sai lộ liễu (lạc chủ đề hoàn toàn). Hoặc ngược lại, nhiễu quá sát nên thành **hai đáp án đúng**.
- Độ khó thấp hơn nhãn, vì đáp án lặp nguyên từ khoá trong bài.
- Văn bản dài hoặc ngắn quá xa so với vị trí. Chủ đề quá "Tây" hoặc quá chung chung.

### 4.2 Lời giải (`explanation_vi`, `note_vi`)

Lời giải đầy đủ hiển thị cho người học = `explanation_vi` + `note_vi` của từng phương án. Không cần chép lại `note_vi` vào `explanation_vi`.

**Trắc nghiệm (Nghe, Đọc):** `explanation_vi` (markdown, khoảng 60–150 từ) theo khung:
```
**Đáp án ②.** Căn cứ: "<trích tiếng Hàn trong văn bản/transcript>" (<dịch>).
<Suy luận ngắn: vì sao căn cứ dẫn tới đáp án; đáp án đã diễn đạt lại thế nào.>
**Mẹo dạng:** <1 câu chiến lược cho dạng này.>
**Đáng chú ý:** <1–3 mục theo mẫu bên dưới, ngăn nhau bằng " · "; hoặc viết thành danh sách gạch đầu dòng>
```

**Viết (W51–W54):** khung "Đáp án ②" và "Mẹo dạng" **không áp dụng**. `explanation_vi` theo khung:
```
**Phân tích đề:** <nhiệm vụ, các ý bắt buộc, tín hiệu trong đề (từ nối, mũi tên, câu hỏi gợi ý)>
**Dàn ý:** <các bước/đoạn, mỗi bước gắn với p1, p2…>
**Lưu ý:** <số liệu (W53) hoặc lập trường (W54); với W51–W52 là căn cứ trước/sau chỗ trống>
**Đáng chú ý:**
- <tối đa 8 mục>
```
- "Đáng chú ý" của Viết có **tối đa 8 mục**, bắt buộc viết thành danh sách gạch đầu dòng. Ưu tiên từ Hán Hàn xuất hiện trong bài mẫu cấp cao. Dùng cùng mẫu ghi Hán tự – âm Hán Việt như trắc nghiệm.
- **Không lặp** mục đã có trong `expression_bank` (biểu hiện, ngữ pháp viết đã liệt kê ở đó thì không đưa lại vào "Đáng chú ý").

Mẫu của **từng mục** trong "Đáng chú ý" (mọi dạng):
- Từ Hán Hàn: `từ (漢字 – âm Hán Việt) – nghĩa`. Ví dụ: `능률 (能率 – năng suất) – năng suất, hiệu suất`.
- **Bạn giả**: thêm cảnh báo khi âm Hán Việt dễ gây hiểu sai. Phân biệt hai loại:
  - **Bạn giả hoàn toàn** (không có nghĩa nào trùng): `từ (漢字 – âm HV) – nghĩa; khác "…" trong tiếng Việt`. Ví dụ: `대처하다 (對處 – đối xử) – ứng phó; khác "đối xử" trong tiếng Việt`.
  - **Bạn giả một phần** (trùng một số nghĩa): `từ (漢字 – âm HV) – nghĩa; trùng "…" ở nghĩa …, khác ở nghĩa …`. Ví dụ: `예방 (豫防 – dự phòng) – phòng ngừa; trùng "dự phòng" ở nghĩa phòng ngừa (y tế dự phòng = 예방 의학), khác ở nghĩa "để sẵn khi cần" (lốp dự phòng: tiếng Hàn dùng 예비 豫備)`.
  - Loại bạn giả và cách ghi phải khớp trường `false_friend` trong dữ liệu `words` của hanviet-lexicographer.
- **Cảnh báo chính tả hoặc dùng từ** ("đừng viết nhầm thành…", "không dùng…"):
  - Chỉ dùng khi một trong hai cách viết hoặc cách dùng **thật sự sai**, và phải dẫn được **mục từ trong 표준국어대사전** làm căn cứ (ghi tên mục từ, ví dụ "표준국어대사전: 계발, 개발").
  - Nếu cả hai đều đúng nhưng khác sắc thái thì viết thành **so sánh sắc thái**, không viết thành cảnh báo lỗi. Ví dụ: `자기 계발 (自己啓發) – khơi dậy năng lực; cũng gặp 자기 개발 (開發): không sai, 개발 nhấn mạnh việc phát triển năng lực`.
  - Quy tắc 띄어쓰기 dẫn điều khoản 한글 맞춤법 (ví dụ 제43항, 제47항).
- Từ thuần Hàn hoặc từ ngoại lai: `từ – nghĩa`. Ngữ pháp: `-는 바람에 – vì (nguyên nhân bất ngờ, kết quả xấu)`. Từ ghép lai (Hán + thuần Hàn): chỉ ghi Hán tự cho phần Hán, ví dụ `고장 나다 (故障 – cố chướng) – bị hỏng`.
- **Chữ Hán đa âm** (好 hảo/hiếu, 樂 lạc/nhạc/nhạo, 惡 ác/ố, 着 trước/trứ, 率 suất/luật, 行 hành/hạnh/hàng, 數 số/sổ/sác…):
  - Ghi âm Hán Việt **theo từ, quen dùng trong tiếng Việt**. Ví dụ: `능률 (能率 – năng suất)`, `확률 (確率 – xác suất)`, nhưng `법률 (法律 – pháp luật)`.
  - Nếu âm quen dùng khác âm theo nghĩa của chữ trong từ thì thêm chú thích. Ví dụ: `동호회 (同好會 – đồng hảo hội) – câu lạc bộ cùng sở thích; 好 ở đây nghĩa "ưa thích", âm theo nghĩa là "hiếu"`.
  - Không tự suy âm của từ từ âm phổ biến nhất của từng chữ.
- Cách ghi Hán tự và âm Hán Việt phải khớp dữ liệu của hanviet-lexicographer. Âm Hán Việt được lưu **theo từ** trong `words.han_viet`, không suy ra từ `hanja_syllables`, chính vì có chữ đa âm. Nếu từ chưa có trong `words`, ghi vào `notes_internal` để lexicographer bổ sung.
- `note_vi` cho phương án sai: 1–2 câu. Nói rõ **sai ở đâu**, đối chiếu với câu nào trong văn bản. Không chỉ viết "sai", "không đúng".
- Trích tiếng Hàn phải **khớp nguyên văn** ngữ liệu. Bản dịch phải sát nghĩa.
- Văn phong lời giải: tiếng Việt rõ ràng, xưng "bạn" với người học, không dùng emoji.

### 4.3 Nghe — quy tắc chung

**Bắt buộc**
- `transcript_ko`: mỗi dòng bắt đầu bằng nhãn người nói **`남자:`** hoặc **`여자:`** (đúng cách ghi của đề).
  - Hội thoại: mỗi lượt một dòng.
  - **Đơn thoại** (thông báo, tin tức, bài giảng, diễn văn, phim tài liệu) và lượt lời dài: được viết **nhiều dòng liên tiếp cùng nhãn**, mỗi dòng là một đoạn ý (không quá khoảng 3 câu). TTS hiểu các dòng đó là cùng một người nói và ngắt dài hơn giữa hai dòng.
- `transcript_vi`: dịch từng dòng, nhãn `Nam:`/`Nữ:`, **số dòng bằng `transcript_ko`**.
- `speakers`: vai, giới tính, độ tuổi từng người (mục 5.4).
- `audio_url: null` (chưa có audio). `tts_notes`: tốc độ, giọng, ngắt nghỉ, cách đọc số/từ ngoại lai.

**Chuẩn phát âm trong `tts_notes.pronunciation_vi`**
- Chuẩn duy nhất là **표준 발음법** và phát âm ghi trong **표준국어대사전**. Ví dụ `판화 [판화]`, `선착순 [선착쑨]`, `낮잖아요 [낟짜나요]`.
- Biến thể khẩu ngữ (ví dụ ㅎ yếu: `판화` nghe như [파놔]) chỉ được ghi như thông tin cho người học, kèm chữ "**không chuẩn**". **Không** dùng biến thể này để điều khiển TTS.

**Xưng hô trong `transcript_vi`**
- Đại từ tiếng Việt (anh/chị/em, chú/cô/cháu, ông/bà) phải khớp `speakers[].age_range` và quan hệ vai. Ví dụ nữ 20s nói với nam 50s là "chú – cháu", không phải "anh – tôi".
- Cách xưng hô phải **nhất quán** giữa `transcript_vi`, `note_vi` và `explanation_vi`. Đã gọi người phỏng vấn là "ông" thì lời giải cũng gọi "ông".

**Văn nói tự nhiên**
- Có dấu hiệu khẩu ngữ hợp vai: `-거든요`, `-잖아요`, `-더라고요`, `그러니까`, `아`, `네`, rút gọn `뭐`, `그럼`, `근데` (vừa phải).
- Bài giảng và tin tức dùng -습니다 nhưng vẫn là văn nói: `여러분`, `-ㄴ데요`, câu hỏi tu từ.
- Lượt lời không quá 2–3 câu với hội thoại. Bài giảng tách câu ngắn hơn văn viết.

**Đọc thành tiếng được**
- Đọc to transcript **một lần** (hoặc đúng số lần phát theo cấu hình) phải đủ thông tin để trả lời.
- Thông tin quyết định đáp án **không** nằm dồn ở câu cuối cùng. **Ngoại lệ L04–L08**: ở dạng này lượt cuối chính là căn cứ, theo thiết kế.
- Tránh ký hiệu TTS đọc sai (`~`, `/`, `→`, ngoặc lồng). Số có cách đọc mơ hồ (`1,500명`, `3:2`, `2층`) phải ghi cách đọc trong `tts_notes`.

**Phương án Nghe**
- In trên đề nên phải ngắn (khoảng 10–30 ký tự), đọc lướt được trong lúc chờ audio.

**Lỗi AI hay mắc khi soạn Nghe**
- Hội thoại "kịch bản sách giáo khoa", quá lịch sự giữa bạn bè.
- Câu trả lời nằm trong một câu duy nhất, lặp nguyên văn phương án đúng.
- Người nói đổi vai giữa chừng. Transcript_vi lệch nghĩa transcript_ko.
- Từ có hai cách hiểu khi nghe (ví dụ `적잖아요`: 적다 + -잖아요 hay 적잖다 = 적지 않다; `반` là "rưỡi" hay "lớp"). Hai con số đi liền nhau (`오후 3시 2층`) dễ dính vào nhau khi nghe.

**Gợi ý tốc độ TTS (hệ số so với tốc độ chuẩn của engine)** [cần hiệu chỉnh khi chọn engine]

| Thể loại | Tốc độ | Giọng |
|---|---|---|
| Hội thoại đời sống/công việc | 1.0 | Tự nhiên, ngữ điệu hội thoại |
| 안내 방송, tin tức | 1.0 | Giọng phát thanh, rõ, đều |
| Phỏng vấn, đối đàm | 1.0 | MC rõ ràng, khách mời tự nhiên hơn |
| Tranh luận | 1.0–1.05 | Nhấn ở câu phản bác |
| Bài giảng, phim tài liệu | 0.95–1.0 | Ngắt ý rõ, giọng thuyết minh trầm |
| Diễn văn nghi lễ | 0.95 | Trang trọng, ngắt dài sau câu chào |

### 4.4 Nghe theo nhóm

**L01–L03 · Tranh / biểu đồ**
- L01–L02: transcript 3–4 lượt, 60–110 ký tự. Bốn tranh cùng bối cảnh, khác nhau ở **hành động/vị trí/đồ vật** (ví dụ người nam đưa sách hay nhận sách; ngồi hay đứng).
- **Bốn tranh chỉ được khác nhau ở yếu tố có trong audio.** Bố cục, đồ vật nền, vị trí nhân vật và trạng thái các đồ vật khác giữ y hệt nhau. Nếu hai tranh khác nhau ở một chi tiết audio không nhắc tới thì người học không có căn cứ để loại.
- Mỗi phương án có `text: ""` và `image_desc`. Bối cảnh chung mô tả ở `image_desc` cấp câu.
- L03: độc thoại 120–180 ký tự, kiểu "○○연구소가 …을 조사한 결과…". Bốn phương án là bốn biểu đồ (`chart_data` + `image_desc` mỗi phương án), khác nhau ở **thứ hạng hoặc xu hướng**. Số liệu giả định, `data_is_fictional: true`.
- Lệnh đề (chung cho L01–L03): `다음을 듣고 알맞은 그림 또는 그래프를 고르십시오.` [cần đối chiếu A4]
- Lỗi AI: hai tranh đều khớp (mô tả quá chung), hoặc tranh khác nhau ở chi tiết không được nói tới.

**L04–L08 · Câu nói tiếp theo**
- 2–3 lượt, 50–100 ký tự. Lượt cuối là của người A. Người học chọn lời của người B.
- Nhiễu: lặp từ khoá nhưng sai ngữ dụng (`keyword_echo`), đáp lời cho lượt trước chứ không phải lượt cuối (`time_shift`), sai quan hệ/kính ngữ (`register_mismatch`).
- Lệnh đề: `다음 대화를 잘 듣고 이어질 수 있는 말로 가장 알맞은 것을 고르십시오.`
- Lỗi AI: hai phương án đều là lời đáp chấp nhận được. Cần kiểm tra bằng cách đọc nối từng phương án vào sau lượt cuối.

**L09–L12 · Hành động tiếp theo**
- Khoảng 4 lượt, 100–160 ký tự. Có ít nhất 3 hành động được nhắc tới: đã làm, người kia sẽ làm, người hỏi sẽ làm.
- Nhiễu điển hình: việc đã xong (`time_shift`), việc của người kia (`speaker_swap`), việc chỉ được nhắc tới (`keyword_echo`).
- Lệnh đề: `다음 대화를 잘 듣고 여자가 이어서 할 행동으로 가장 알맞은 것을 고르십시오.`

**L13–L16 · Trùng khớp**
- 120–220 ký tự. L13 hội thoại, L14 thông báo, L15 tin tức, L16 phỏng vấn [cần đối chiếu].
- Đáp án là câu diễn đạt lại. Nhiễu dùng `detail_swap`, `degree_shift`, `speaker_swap`, `outside_text`.
- Lệnh đề: `다음을 듣고 들은 내용과 같은 것을 고르십시오.`

**L17–L20 · 중심 생각**
- 100–180 ký tự. Nam nêu quan điểm, thường đối lập với nữ. Quan điểm có thể thể hiện qua `-는 게 좋다`, `-아야 한다`, `-지 않을까요`.
- Nhiễu: ý của nữ (`speaker_swap`), chi tiết nam có nói nhưng không phải ý chính (`true_not_main`), quá khái quát (`overgeneralization`).
- Lệnh đề: `다음을 듣고 남자의 중심 생각으로 가장 알맞은 것을 고르십시오.`

**L21–L50 · Cặp câu trên bài dài**
- Độ dài: L21–L30 khoảng 250–400 ký tự; L31–L44 khoảng 350–550; L45–L50 khoảng 450–650.
- Câu trùng khớp trong cặp **không** được hỏi lại đúng thông tin của câu kia. Đáp án câu này không được làm lộ đáp án câu kia.
- Lệnh chung của cặp: `다음을 듣고 물음에 답하십시오.` (cấu hình nhóm). `stem` chỉ chứa câu hỏi riêng. Mẫu câu hỏi:

| Câu hỏi | `stem` mẫu |
|---|---|
| 중심 생각 | `남자의 중심 생각으로 가장 알맞은 것을 고르십시오.` |
| Trùng khớp | `들은 내용으로 맞는 것을 고르십시오.` [cần đối chiếu: "들은 내용과 같은 것" hay "맞는 것"] |
| Đang làm gì | `남자가 무엇을 하고 있는지 고르십시오.` |
| Ý định | `남자가 말하는 의도로 알맞은 것을 고르십시오.` [cần đối chiếu A4] |
| Người nói là ai | `남자가 누구인지 고르십시오.` [cần đối chiếu A4] |
| Thái độ / cách nói | `남자의 태도로 가장 알맞은 것을 고르십시오.` / `여자의 말하는 방식으로 가장 알맞은 것을 고르십시오.` |
| Về cái gì / trung tâm | `무엇에 대한 내용인지 가장 알맞은 것을 고르십시오.` / `이 강연의 중심 내용으로 가장 알맞은 것을 고르십시오.` |
| Nội dung trước | `이 담화 앞의 내용으로 가장 알맞은 것을 고르십시오.` |

Quy tắc riêng theo cặp:
- **L23 / L35 (`speech_act`)**: phương án dạng `-고 있다` (`…을 문의하고 있다`, `…에 감사를 표하고 있다`). Nhiễu là hành động lân cận: hỏi ↔ khiếu nại, giới thiệu ↔ kêu gọi.
- **L29 (`speaker_identity`)**: không nêu tên nghề. Để lộ qua nhiệm vụ cụ thể. Nhiễu là nghề gần (`detail_swap`).
- **L31–L32 (tranh luận)**: hai bên có lập luận rõ. L32 phương án dạng `상대방의 의견에 반박하고 있다`, `구체적인 사례를 들어 설명하고 있다`.
- **L39 (`inference_before`)**: lượt đầu của đoạn nghe nhắc lại nội dung trước. Đáp án là diễn đạt lại nội dung đó. Nhiễu là những ý xuất hiện **trong** đoạn nghe (`true_not_main`).
- **L46, L48, L50**: phương án dạng `…을 우려하고 있다`, `…의 필요성을 강조하고 있다`, `…에 대해 회의적인 입장이다`. Nhiễu dùng `attitude_mismatch` và `concession_point`. Điều kiện để gắn độ khó 6 cho L46: xem ghi chú dưới bảng 3.1.
- Bài giảng có phân loại (ví dụ "의미의 확대 / 축소 / 이동"): nếu lời giải gọi tên các loại như thuật ngữ thì transcript phải **gọi tên đủ từng loại**. Không để người học phải tự suy ra tên loại.

### 4.5 Đọc theo nhóm

**R01–R04 · Ngữ pháp**
- 1 câu, 25–50 ký tự. R01–R02 có 1 chỗ `(   )`. R03–R04 gạch chân bằng `<u>…</u>`.
- Nhiễu: ngữ pháp gần nghĩa sai điều kiện (`near_synonym_grammar`), ví dụ -느라고 cần cùng chủ ngữ và không đi với mệnh lệnh; sai thì hoặc dạng kết hợp.
- R03–R04: đáp án là **một ngữ pháp khác** cùng nghĩa (-는 바람에 ≈ -는 탓에 trong ngữ cảnh tiêu cực), không phải lặp lại nguyên ngữ pháp.
- Liên kết với `grammar_points` của lexicographer qua tag `grammar:`.
- Lệnh đề: `(   )에 들어갈 가장 알맞은 것을 고르십시오.` / `밑줄 친 부분과 의미가 가장 비슷한 것을 고르십시오.`
- Lỗi AI: hai ngữ pháp đều dùng được (ví dụ -아서/-니까 trong câu không có mệnh lệnh).

**R05–R08 · Văn bản nói về cái gì**
- 10–40 ký tự: khẩu hiệu, 2–3 dòng ngắn. Có thể kèm `image_desc` mô tả bố cục poster.
- Đáp án là danh từ (`세탁기`, `에너지 절약`, `이용 안내`). Nhiễu là vật hoặc chủ đề có liên quan đến từ khoá (`keyword_echo`).
- Lệnh đề: `다음은 무엇에 대한 글인지 고르십시오.`
- Lỗi AI: khẩu hiệu nêu thẳng tên sản phẩm (quá dễ). Khẩu hiệu nên gợi qua công dụng hoặc ẩn dụ.

**R09–R12 · Trùng khớp (văn bản thực dụng, biểu đồ, tin ngắn)**
- R09: poster hoặc thông báo dạng danh sách (`passage` dùng danh sách markdown `- `). R11–R12: tin 200–300 ký tự.
- R10: `chart_data` + `image_desc` bắt buộc, số liệu giả định. **Không lặp tiêu đề biểu đồ trong `passage`.** Nguồn và đối tượng khảo sát ghi ở `chart_data[].caption`. `passage` tuỳ chọn, chỉ dùng khi đề có thêm một đoạn chữ ngoài biểu đồ.
- Nhiễu R10: đảo thứ hạng, đảo tăng/giảm, sai nhóm so sánh.
- Lệnh đề (lệnh nhóm 9–12): `다음 글 또는 그래프의 내용과 같은 것을 고르십시오.` [cần đối chiếu A4]. Câu luyện tập R10 đứng riêng được phép dùng `다음 그래프의 내용과 같은 것을 고르십시오.`; R09, R11, R12 đứng riêng được phép dùng `다음 글의 내용과 같은 것을 고르십시오.` Khi lắp đề, các `stem` này luôn bị ẩn và thay bằng lệnh nhóm (§5.2).

**R13–R15 · Sắp xếp câu**
- 4 câu (가)–(라), mỗi câu một dòng, tổng 150–250 ký tự. Chỉ **một** câu có thể đứng đầu. Câu này:
  - không có chỉ từ trỏ về câu trước, cũng không có từ nối. Chỉ từ trỏ trong cùng câu thì không tính (`그 채소에서` trỏ về `채소` trong cùng câu);
  - nên có **dấu hiệu giới thiệu**: `최근`, `요즘`, `한 + danh từ` (đối tượng mới), câu nêu hiện tượng chung.
- Câu mở đầu nhiễu thường cũng không có chỉ từ hay từ nối, mà chỉ sai vì **giả định thông tin đã biết** (danh từ xác định chưa được giới thiệu, `-면 된다` hướng dẫn một dịch vụ chưa nêu). Tín hiệu đó yếu. Vì vậy:
  - mỗi phương án nhiễu phải sai ở **ít nhất một mối nối có tín hiệu liên kết rõ**, không chỉ sai ở câu mở đầu;
  - `note_vi` phải nêu **mối nối sai rõ nhất**, kèm trích dẫn tín hiệu.
- 4 phương án chỉ có **2 câu mở đầu khác nhau**, mỗi câu mở đầu xuất hiện ở 2 phương án (theo cách ra đề quen thuộc).
- Mọi bước nối phải được đánh dấu bằng phương tiện liên kết: `그래서`, `하지만`, `이`, `그`, `이러한`, `또한`, lặp danh từ.
- Lệnh đề: `다음을 순서대로 맞게 배열한 것을 고르십시오.`
- Lỗi AI: có hai thứ tự đều hợp lý. Cần kiểm tra bằng cách đọc nối cả 4 phương án.

**R16–R18, R28–R31, R45, R49 · Điền nội dung**
- R16–R18: 150–250 ký tự. R28–R31: 200–300. R45, R49: nằm trong bài dài.
- Chỗ trống là cụm hoặc mệnh đề (khoảng 10–25 ký tự). Căn cứ nằm ở câu trước **và** câu sau.
- Nhiễu: đúng chủ đề nhưng ngược logic (`logic_mismatch`), lặp từ khoá (`keyword_echo`), ý quá rộng (`overgeneralization`).
- Lệnh đề: `다음을 읽고 (   )에 들어갈 내용으로 가장 알맞은 것을 고르십시오.`

**R19–R24 · Cặp đoạn văn ngắn**
- R19–R22: 250–400 ký tự, 문어체.
- R19: phương án là 4 phó từ hoặc từ nối khác quan hệ logic (`게다가 / 오히려 / 그래서 / 반면에`, `과연 / 차라리 / 비록 / 마침`…).
- R21: phương án là 4 quán ngữ cùng cấu trúc (`손을 떼다 / 발을 끊다 / 눈을 붙이다 / 귀를 기울이다`). Đáp án phải tự nhiên với ngữ cảnh, nhiễu là quán ngữ có cùng bộ phận cơ thể hoặc cùng trường nghĩa.
- R23–R24: tuỳ bút ngôi thứ nhất, 450–600 ký tự, thì quá khứ.

**`stem` mẫu cho các bộ câu Đọc** (lệnh "다음을 읽고 물음에 답하십시오." lấy từ cấu hình) [cần đối chiếu A4]:

| Câu | `stem` mẫu |
|---|---|
| R19, R21 | `(   )에 들어갈 알맞은 말을 고르십시오.` |
| R20 | `위 글의 주제로 가장 알맞은 것을 고르십시오.` |
| R22, R24, R47 | `위 글의 내용과 같은 것을 고르십시오.` |
| R23, R42 | `밑줄 친 부분에 나타난 '<인물>'의 심정으로 가장 알맞은 것을 고르십시오.` |
| R43 | `위 글의 내용으로 알 수 있는 것을 고르십시오.` |
| R44 | `위 글의 주제로 가장 알맞은 것을 고르십시오.` |
| R45, R49 | `(   )에 들어갈 내용으로 가장 알맞은 것을 고르십시오.` |
| R46 | `위 글에 나타난 필자의 태도로 가장 알맞은 것을 고르십시오.` |
| R48 | `필자가 이 글을 쓴 목적으로 가장 알맞은 것을 고르십시오.` |
| R50 | `밑줄 친 부분에 나타난 필자의 태도로 가장 알맞은 것을 고르십시오.` |

**R23, R42 · Tâm trạng nhân vật (văn tự sự, văn học)**
- R42–R43: 550–750 ký tự, trần thuật -았다/-었다, có đối thoại trong ngoặc kép.
- Phần gạch chân thể hiện cảm xúc **gián tiếp** qua hành động, cử chỉ, quán ngữ. **Không** gọi tên cảm xúc trong văn bản.
- Phương án là tính từ cảm xúc: `서운하다`, `착잡하다`, `홀가분하다`, `민망하다`, `억울하다`, `담담하다`, `조마조마하다`… Nhiễu là cảm xúc gần (`degree_shift`) hoặc cảm xúc của nhân vật khác (`speaker_swap`).
- Lệnh đề: `밑줄 친 부분에 나타난 '<인물>'의 심정으로 가장 알맞은 것을 고르십시오.` Thay `<인물>` bằng **đúng tên gọi trong văn bản** của nhân vật được gạch chân ('나', '어머니', '할아버지', '민수'…). R43: `위 글의 내용으로 알 수 있는 것을 고르십시오.` [cần đối chiếu A4]
- **Bản quyền**: tự viết 100%. Không trích, không phỏng theo tiểu thuyết có thật (kể cả tác phẩm đề TOPIK từng dùng).
- Lỗi AI: văn hoa mỹ kiểu dịch, cảm xúc quá lộ, bối cảnh không phải Hàn Quốc.

**R25–R27 · Tít báo**
- Tít 15–35 ký tự. Đặc trưng:
  - Lược trợ từ, kết bằng danh từ hoặc dạng `-아`/`-어`.
  - Dấu phẩy, dấu `…`, ngoặc đơn kép `' '`.
  - Từ tượng hình/ẩn dụ: `뚝`, `껑충`, `주춤`, `빨간불`, `훈풍`, `날개 달다`, `발목 잡다`.
- Ví dụ tự soạn: `봄꽃 축제 첫 주말, 궂은 날씨에 관람객 '뚝'`.
- Phương án là câu đầy đủ -ㄴ다 giải thích tin. Nhiễu: hiểu sai ẩn dụ (`negation_flip`, `degree_shift`), đảo nguyên nhân–kết quả (`reverse_causality`).
- Lệnh đề: `다음 신문 기사의 제목을 가장 잘 설명한 것을 고르십시오.`
- Lỗi AI: tít viết như câu văn thường (có đủ trợ từ, đuôi -다). Tít không có từ khó hay ẩn dụ nào nên quá dễ.

**R32–R38 · Học thuật: trùng khớp, chủ đề**
- 250–380 ký tự, 문어체.
- R35–R38: luận điểm thường ở câu cuối hoặc sau `그러나 / 따라서 / 즉`. Nhiễu: chi tiết đúng nhưng không phải chủ đề (`true_not_main`), ý nhượng bộ hoặc quan điểm bị phản biện (`concession_point`), ví dụ minh hoạ (`too_narrow`), khái quát quá (`overgeneralization`).
- Phương án chủ đề viết dạng `-아야 한다 / -는 것이 중요하다 / -(으)ㄹ 필요가 있다`.
- Lệnh đề: `다음을 읽고 내용이 같은 것을 고르십시오.` / `다음 글의 주제로 가장 알맞은 것을 고르십시오.`

**R39–R41 · Chèn câu**
- 250–350 ký tự, 4 vị trí `( ㉠ )`–`( ㉣ )` đặt ở ranh giới câu.
- Câu `<보기>` **phải chứa tín hiệu liên kết**: chỉ từ (`이러한`, `이 같은`), từ nối (`그 결과`, `반면`, `이 때문에`), hoặc thông tin cũ cần tiền ngữ.
- Chỉ **một** vị trí thoả mãn **cả hai phía**: câu trước dẫn vào được, câu sau tiếp nối được.
- Tự kiểm tra: chèn thử vào cả 4 vị trí, đọc nối.
- Nhiễu dùng `cohesion_break`, `logic_mismatch`.
- Phương án có `text` là `㉠`…`㉣`.
- Lệnh đề: `다음 글에서 <보기>의 문장이 들어가기에 가장 알맞은 곳을 고르십시오.`
- Lỗi AI: câu `<보기>` trung tính, chèn đâu cũng được.

**R44–R50 · Bài học thuật dài**
- R44–R45: 450–600 ký tự. R46–R47: 500–650. R48–R50: 600–750.
- Chủ đề trừu tượng: kinh tế, công nghệ – đạo đức, chính sách, môi trường, triết học ứng dụng.
- R46, R50 (thái độ): tác giả có lập trường rõ. Phương án dạng `…에 대해 우려하고 있다`, `…을 촉구하고 있다`, `…을 긍정적으로 평가하고 있다`.
- R48 (mục đích): phương án dạng `…을 촉구하기 위해`, `…의 문제점을 지적하기 위해`, `…을 소개하기 위해`. Nhiễu là mục đích của một đoạn nhỏ (`too_narrow`).
- Lệnh đề: `필자가 이 글을 쓴 목적으로 가장 알맞은 것을 고르십시오.` / `밑줄 친 부분에 나타난 필자의 태도로 가장 알맞은 것을 고르십시오.`

### 4.6 Viết

#### W51–W52 · Viết câu vào chỗ trống

- **W51**: văn bản thực dụng 100–180 ký tự (email, thông báo, tin nhắn, bài đăng tìm đồ, mời, hỏi). Văn phong **theo văn bản gốc**, thường -습니다/-ㅂ니까 hoặc -아요. Ghi văn phong ở trường `register`.
- **W52**: đoạn giải thích 120–220 ký tự, **문어체 -ㄴ다/-다** bắt buộc.
- Mỗi chỗ trống điền **một câu**. Căn cứ nằm ở câu trước và câu sau: từ nối, câu hỏi, câu kết luận. Chỗ trống thứ hai thường cần một ngữ pháp đích (`-(으)ㄹ 수 있다`, `-기 때문이다`, `-아야 한다`, `-(으)려면`).
- `accepted_answers`: **ít nhất 3** đáp án đạt điểm tối đa, khác nhau về cách diễn đạt.
- `partial_answers`: đáp án đúng ý nhưng sai văn phong hoặc ngữ pháp nhỏ, hoặc thiếu một yếu tố.
- `rejected_answers` (tuỳ chọn): đáp án sai kèm lý do, phục vụ chấm AI.
- `required_elements_vi`: các yếu tố nội dung và ngữ pháp bắt buộc để đạt điểm tối đa.
- Điểm mỗi chỗ trống lấy từ cấu hình (thường chia đều 10 điểm/câu) [cần đối chiếu cách chấm điểm từng phần].
- Lệnh đề: `다음 글의 ㉠과 ㉡에 알맞은 말을 각각 한 문장으로 쓰십시오.`
- Lỗi bị trừ: viết nhiều hơn một câu; sai văn phong (W52 dùng -아요); chỉ viết cụm từ; lặp nguyên câu trước.

#### W53 · Mô tả số liệu (200–300 ký tự)

- **Đề** (`task`): tên chủ đề + dữ liệu.
  - Dữ liệu có 2–3 khối: xu hướng theo thời gian, tỉ lệ/nguyên nhân, triển vọng hoặc so sánh.
  - Dữ liệu ghi trong `chart_data`, mô tả hình ở `image_desc`, `data_is_fictional: true`.
  - Các kiểu đề: (a) thay đổi + nguyên nhân + triển vọng; (b) so sánh hai nhóm; (c) kết quả khảo sát + lý do; (d) quá trình, ưu nhược điểm [cần đối chiếu các kiểu gần đây].
- `required_points`: mỗi khối dữ liệu là một ý bắt buộc, phải được nhắc tới **kèm số liệu chính**.
- Lệnh đề mẫu: `다음은 '…'에 대한 자료이다. 이 내용을 200~300자의 글로 설명하십시오. 단, 글의 제목을 쓰지 마십시오.`
- **Văn phong**: chỉ dùng **-ㄴ다/-다** (-았다, -(으)ㄹ 것이다, -(으)로 나타났다). Không -요, không -습니다.
- **Bố cục một đoạn**: giới thiệu khảo sát → số liệu chính, có so sánh → nguyên nhân/lý do (**chỉ khi dữ liệu có**) → **triển vọng chỉ khi dữ liệu có khối 전망**. Nếu dữ liệu không có khối 전망 thì kết thúc ở khối dữ liệu cuối, hoặc thêm một câu tổng kết rút ra từ chính dữ liệu, không suy diễn.
- **Không biến nhãn dữ liệu thành quan hệ khác.** Ví dụ khối "이용 이유" (lý do sử dụng) không phải "nguyên nhân tăng trưởng". Viết `중고 거래를 이용하는 이유로는`, không viết `이용자가 증가한 원인으로는`.
- **Mũi tên trong dữ liệu**: ở dòng xu hướng (`18% → 41% → 67%`), mũi tên chỉ **trình tự thời gian** (`-에서 -(으)로 증가하였다`). Ở dòng 전망 hoặc dòng nguyên nhân (`플랫폼 다양화 → 이용자 증가`), mũi tên là **nhân quả** (`-(으)ㅁ에 따라`, `-(으)면서`, `-(으)로 인해`).
- **Ngân hàng biểu hiện**: `-을 대상으로 조사한 결과`, `-(으)로 나타났다`, `-에서 -(으)로 증가하였다`, `-에 불과하였으나`, `-에 달하였다`, `-에 비해`, `반면`, `가장 많았으며 … 그 뒤를 이었다`, `-(으)ㄹ 것으로 전망된다`.
- **Lỗi bị trừ**:
  - Dùng -요/-습니다.
  - Dưới 200 ký tự. Phần vượt 300 ký tự có thể không được chấm [cần đối chiếu].
  - Viết tiêu đề.
  - Thêm **ý kiến cá nhân** không có trong dữ liệu (`나는 … 생각한다`).
  - Viết dự báo, nguyên nhân hoặc kết luận **không có trong dữ liệu**.
  - Sai hoặc bỏ số liệu, bỏ một khối dữ liệu.
  - Chép nguyên câu đề.
  - Liệt kê số mà không có biểu hiện so sánh hay liên kết.
  - Khẩu ngữ (`너무`, `진짜`, `되게`).

#### W54 · Nghị luận (600–700 ký tự)

- **Đề** (`task`): 1–3 câu dẫn nêu vấn đề + **2–3 câu hỏi gợi ý**. Mỗi câu hỏi là một phần tử của `required_points`.
- Lệnh đề mẫu: `다음을 주제로 하여 자신의 생각을 600~700자로 글을 쓰십시오. 단, 문제를 그대로 옮겨 쓰지 마십시오.`
- **Bố cục**:
  - 서론: bối cảnh hoặc định nghĩa + nêu vấn đề, khoảng 120–150 ký tự.
  - 본론: trả lời lần lượt từng câu hỏi, mỗi câu hỏi một đoạn hoặc một khối rõ ràng.
  - 결론: tổng kết + đề xuất, khoảng 100–130 ký tự.
  - Thường 3–4 đoạn.
- **Văn phong**: -ㄴ다/-다 nhất quán, không -요/-습니다.
- **Ngân hàng biểu hiện**: `-(으)ㄴ/는다는 점에서`, `-(으)ㄹ 뿐만 아니라`, `-기 위해서는 … -아야 한다`, `물론 … -지만`, `이와 같이`, `따라서`, `-(으)ㄹ 수밖에 없다`, `-는 데 그 원인이 있다`.
- **Dùng lại từ khoá của đề**: được dùng lại cụm danh từ then chốt của câu hỏi gợi ý làm câu chủ đề. Không được chép nguyên câu dẫn hoặc nguyên câu hỏi. W54 không cấm tiêu đề (lệnh cấm tiêu đề là của W53), nhưng tiêu đề tốn ô 원고지 và không được tính điểm nội dung, nên **không viết**.
- **Lỗi bị trừ**:
  - Không trả lời đủ câu hỏi gợi ý.
  - Chép đoạn dẫn của đề, hoặc chép câu hỏi gợi ý thành câu văn.
  - Vượt 700 ký tự (phần vượt khung không được chấm [cần đối chiếu A12]).
  - Lạm dụng `-는 것 같다` (cách nói rào đón) khiến lập luận thiếu dứt khoát. Nên dùng `-다고 본다`, `-아야 한다`.
  - Lạc đề.
  - Dưới 600 ký tự.
  - Trộn -요/-습니다.
  - Lập trường mâu thuẫn.
  - Không chia đoạn.
  - Khẩu ngữ, viết tắt.
  - Ví dụ cá nhân quá dài, lấn át lập luận.

#### Bài mẫu (W53, W54) — bắt buộc 2 bài

- Hai bài: **cấp mục tiêu** (`level` = `difficulty`) và **cấp cao hơn một bậc** (`difficulty + 1`). Nếu `difficulty = 6` thì dùng cấp 5 và 6.
- Bài mẫu **không được có lỗi**. Khác biệt giữa các cấp nằm ở độ phong phú của cấu trúc và từ vựng, mức liên kết, độ sâu lập luận, không nằm ở số lỗi.
- Mỗi bài ghi `char_count` (đếm theo mục 5.7) **nằm trong `char_limit`**, và `covers` (các ý bắt buộc đã đáp ứng). Mọi bài mẫu phải bao quát **tất cả** `required_points`.
- **Giới hạn mềm cho bài mẫu**, để người học bắt chước trên giấy không bị tràn khung (cách ước tính ô 원고지 ở mục 5.7):
  - W53: `char_count` ≤ 290 và ước tính ô 원고지 ≤ 300.
  - W54: `char_count` ≤ **680** và ước tính ô 원고지 ≤ **700** (vừa khung). Công thức ở mục 5.7 đã làm tròn lên theo từng đoạn, nên không cần trừ thêm biên.
- Hai bài mẫu không được lặp nguyên câu của nhau. Câu cùng nội dung phải khác về cấu trúc hoặc từ vựng, thể hiện rõ chênh lệch cấp. **Ngoại lệ:** câu giới thiệu khảo sát theo khuôn của W53 (`○○에서 … -을 대상으로 … 조사하였다`) được phép gần giống nhau giữa hai cấp, vì đây là khuôn chuẩn của dạng và không phải chỗ thể hiện chênh lệch cấp.
- `rubric_notes_vi` nhận xét theo **3 tiêu chí chính thức**:
  - `task_fulfillment` — 내용 및 과제 수행: đủ ý, đúng nhiệm vụ, đúng số liệu.
  - `organization` — 글의 전개 구조: bố cục, liên kết, từ nối, chia đoạn.
  - `language_use` — 언어 사용: đa dạng và chính xác ngữ pháp, từ vựng; đúng văn phong viết.
- Phân bổ điểm từng tiêu chí là cấu hình (ví dụ W53 30 điểm, W54 50 điểm) [cần đối chiếu cách chia điểm theo tiêu chí].

---

## 5. Schema YAML

### 5.1 Đường dẫn, tên file, `id`

```
content/topik-ii/practice/<type_code>/<id>.yaml
ví dụ: content/topik-ii/practice/R39/r39-0001.yaml
       content/topik-ii/practice/L22/l22-0001.yaml
       content/topik-ii/practice/W54/w54-0001.yaml
```
- Thư mục là `type_code` **viết hoa**. Tên file là `id` **viết thường** + `.yaml`.
- `id` = `<type_code viết thường>-<serial 4 chữ số>`. Regex: `^[lrw][0-9]{2}-[0-9]{4}$`. Tiền tố của `id` phải trùng `type_code`.
- Serial tăng dần trong từng `type_code`. **Không tái dùng** id của câu đã xoá. Câu trong một bộ dùng chung serial (mục 1.3).
- Chương trình thi lấy từ đường dẫn (`topik-ii`). Trường `program` là tuỳ chọn, nếu có thì phải khớp đường dẫn.
- Đề thi (`content/topik-ii/exams/`) tham chiếu tới id câu hỏi. Định dạng file đề: xem [tiểu mục ngay dưới](#định-dạng-file-đề-thi).
- Mã hoá UTF-8, Hangul dạng NFC, xuống dòng LF.

#### Định dạng file đề thi

Định dạng do backend-engineer chốt theo mục này. Content-designer cập nhật spec khi định dạng thay đổi. Nguồn gốc là khối "ĐỊNH DẠNG FILE ĐỀ" ở đầu `lib/exam/source.ts`. Nếu hai nơi lệch nhau thì báo backend-engineer để thống nhất.

**Đường dẫn**

```
content/<program>/exams/<kind>/<id>.yaml
ví dụ: content/topik-ii/exams/mini/doc-01.yaml
```
- `<program>`: slug chương trình, ví dụ `topik-ii`.
- `<kind>`: `full`, `mini`, `hard` hoặc `ibt`. Thư mục **phải khớp** trường `kind`.
- `<id>`: khoá ổn định trong URL `/[program]/de-thi/[kind]/[id]`. Chỉ gồm chữ thường, chữ số và dấu `-` (ví dụ `doc-01`). **Phải khớp** tên file.
- Mỗi file là **một** đề.

**Trường cấp đề**

| Trường | Kiểu | Bắt buộc | Ràng buộc / ghi chú |
|---|---|---|---|
| `id` | string | ✓ | Khớp tên file |
| `kind` | enum | ✓ | `full` \| `mini` \| `hard` \| `ibt`. Khớp thư mục |
| `title` | string | ✓ | Tiêu đề tiếng Việt, ví dụ `"Mini test Đọc 01"` |
| `status` | enum | ✓ | `draft` \| `published`. **`draft`**: đề mẫu hoặc đang soạn. Vẫn hiển thị được; các luật "đủ số câu" và "phân bố nhãn đúng" chỉ **cảnh báo**. **`published`**: các luật đó thành **lỗi chặn**, đề có lỗi không được phục vụ |
| `program` | string | – | Nếu có thì phải khớp thư mục chương trình |
| `sections` | list | ✓ | Các phần thi **theo thứ tự làm bài**. Mỗi kỹ năng có tối đa một phần |

**Trường của mỗi phần tử `sections[]`**

| Trường | Kiểu | Bắt buộc | Ràng buộc / ghi chú |
|---|---|---|---|
| `skill` | enum | ✓ | `reading` \| `listening`. Viết và Nói chưa được hỗ trợ trong đề |
| `duration_sec` | int | – | **Ghi đè** thời gian của phần này (giây). Bỏ trống thì lấy `exam_blueprints[kind][skill].duration_sec` của chương trình (đề Full: lấy theo `sections` của chương trình). Chỉ ghi khi thật sự cần thời gian khác blueprint |
| `questions` | list[id] | ✓ | Id câu hỏi (file trong `practice/`) **theo thứ tự trong đề**. Số câu trong đề là vị trí của câu (đếm từ 1, liên tục trong phần thi), **không nhất thiết** trùng số trong `type_code` |

**Ví dụ**

```yaml
id: doc-01
kind: mini
title: "Mini test Đọc 01"
status: draft
sections:
  - skill: reading
    # duration_sec: 1200   # tuỳ chọn, chỉ ghi khi muốn ghi đè thời gian của blueprint (giây)
    questions: [r01-0001, r03-0001, r07-0001]
```

Ví dụ trên rút gọn còn 3 câu để minh hoạ cú pháp. Đề thật phải đủ số câu theo blueprint (Mini Đọc hiện là 20 câu). Khi không ghi `duration_sec`, phần thi dùng thời gian của blueprint (Mini Đọc hiện là 30 phút).

**Ràng buộc** (kiểm bởi `npm run validate:content`, mã nguồn ở `lib/db/exam-validation.ts`):
- Mọi id câu phải tồn tại, đúng kỹ năng của phần, không trùng nhau trong đề.
- Các câu cùng `group_key` (cặp hoặc bộ dùng chung ngữ liệu, mục 1.3) phải có **đủ** số câu của bộ (đọc từ `group_key`, ví dụ `r46-47-0001` cần 2 câu), đứng **liền nhau** và theo `type_code` tăng dần.
- Số câu mỗi phần bằng `exam_blueprints` (Mini) hoặc `sections` (Full) của chương trình. `draft`: cảnh báo; `published`: lỗi.
- Luật nhãn đúng của đề lắp ráp (mục 4.1), tính trên từng phần. `draft`: cảnh báo; `published`: lỗi.
  - Mỗi nhãn khoảng 25% (áp dụng từ 8 câu trở lên).
  - Không quá 3 câu liền nhau cùng nhãn.
  - Không có chu kỳ lặp, tức không có chuỗi từ 4 nhãn trở lên lặp lại liền nhau.
  - Muốn sửa thì **đổi thứ tự câu**, không đảo nhãn phương án.

**Lệnh nhóm.** Lệnh nhóm tiếng Hàn (`instruction_ko`) **không** nằm trong file đề. Lệnh được lấy từ cấu hình chương trình theo `type_group` (mục 5.2). Giao diện luôn ẩn `stem` của câu đơn.

### 5.2 Trường chung (mọi biến thể)

| Trường | Kiểu | Bắt buộc | Ràng buộc / ghi chú |
|---|---|---|---|
| `id` | string | ✓ | Mục 5.1 |
| `type_code` | string | ✓ | Mục 1.1. Khớp thư mục |
| `subskill` | enum | ✓ | Thuộc {chính, phụ cho phép} của `type_code` (mục 3) |
| `difficulty` | int | ✓ | 3–6 |
| `tags` | list[string] | ✓ | Có ít nhất 1 `topic:` và **đúng 1** `genre:` (mục 6) |
| `stem` | string | ✓ | Xem quy tắc `stem` ngay dưới bảng |
| `explanation_vi` | string (md) | ✓ | Mục 4.2. Với Viết là phân tích đề + dàn ý |
| `group_key` | string | khi thuộc bộ | Mục 1.3 |
| `pair_with` | list[id] | khi thuộc bộ | Mục 1.3. Có thể trỏ tới id chưa tồn tại |
| `source` | enum | ✓ | Chỉ `original` (mục 8) |
| `authored_by` | string | ✓ | `topik-content-designer` hoặc tên người soạn |
| `created_at` | date | – | `YYYY-MM-DD` |
| `reviewed_by` | string \| null | ✓ | **Luôn `null` khi soạn. Chỉ người dùng điền**, sau khi reviewer kết luận PASS. Reviewer và agent soạn **không bao giờ** điền, kể cả sau khi đã sửa theo báo cáo |
| `reviewed_at` | date \| null | – | Người dùng điền cùng `reviewed_by` |
| `notes_internal` | string | – | Ghi chú cho reviewer, không hiển thị cho người học |

**Quy tắc `stem`**
- **Câu đơn** (L01–L20, R01–R18, R25–R41, W51–W54): `stem` = **lệnh đầy đủ như in trên đề**, theo lệnh đề ở mục 4.4–4.6. Ví dụ `다음 대화를 잘 듣고 여자가 이어서 할 행동으로 가장 알맞은 것을 고르십시오.` Khi render đề lắp ráp (Full, Mini, Hard, IBT), giao diện **luôn ẩn `stem` của câu đơn** và chỉ in lệnh nhóm lấy từ cấu hình `question_types`, một lần ở đầu nhóm. Giao diện **không so khớp chuỗi**, nên các lệnh biến thể dùng cho câu đứng riêng (ví dụ R10 `다음 그래프의 내용과 같은 것을…`) không bao giờ bị in hai lần. `stem` của câu đơn chỉ hiển thị ở chế độ luyện từng câu. *(Cần báo frontend-engineer.)*
- **Câu trong bộ** (L21–L50, R19–R24, R42–R50): `stem` = **câu hỏi riêng** của câu đó (bảng ở mục 4.4 và 4.5). Lệnh `다음을 듣고/읽고 물음에 답하십시오.` lấy từ cấu hình, không ghi vào `stem`.

**Quy ước ngăn đoạn** cho mọi trường văn bản nhiều dòng (`passage`, `transcript_ko`, `transcript_vi`, `task`, `model_answers[].text`):
- **Mỗi dòng là một đơn vị**: một đoạn (văn bản), một lượt hoặc một đoạn ý (transcript), một mục (danh sách).
- Không có dòng trống, không thụt đầu dòng, không có khoảng trắng ở đầu hoặc cuối dòng.
- Giao diện render mỗi `\n` thành ngắt dòng cứng (tương đương remark-breaks). Ngắt đoạn của 원고지 do giao diện xử lý. *(Cần báo frontend-engineer.)*
- Ngoại lệ có định dạng riêng: R09 dùng danh sách markdown `- …`; R13–R15 mỗi dòng một câu `(가) …`; R10 thường không có `passage` (mục 5.3).

Quy ước đánh dấu trong văn bản (`passage`, `transcript_ko`):
- Chỗ trống một ô: `(   )` (ngoặc + 3 khoảng trắng).
- Chỗ trống có nhãn: `( ㉠ )`.
- Gạch chân: `<u>…</u>`.
- Chữ đậm: `**…**` (hiếm khi dùng).
- Câu sắp xếp: mỗi câu một dòng `(가) …`.

### 5.3 Biến thể A — Trắc nghiệm Đọc (R01–R50)

Thêm vào trường chung:

| Trường | Kiểu | Bắt buộc | Ràng buộc / ghi chú |
|---|---|---|---|
| `passage` | string (md) | ✓, **trừ R10 (tuỳ chọn)** | Ngữ liệu. Với R13–R15 là 4 dòng (가)–(라). Với R25–R27 là tít báo. Với R10 chỉ dùng khi có thêm đoạn chữ ngoài biểu đồ, không lặp tiêu đề biểu đồ |
| `insert_sentence` | string | R39–R41 ✓ | Câu `<보기>` |
| `image_desc` | string | R10 ✓; R05–R09 tuỳ chọn | Mô tả hình bằng tiếng Việt (nhãn trong hình giữ tiếng Hàn), đủ để hoạ sĩ vẽ lại |
| `image_url` | null | – | Để `null` cho tới khi có ảnh |
| `chart_data` | **list[object]** | R10 ✓ | **Luôn là list**, kể cả khi chỉ có 1 biểu đồ. Cấu trúc từng phần tử ở dưới |
| `data_is_fictional` | bool | ✓ nếu có `chart_data` | Phải là `true` |
| `choices` | list (4) | ✓ | Xem bên dưới |

Mỗi phần tử của `chart_data`:

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `chart_type` | enum | ✓ | `line`, `bar`, `pie`, `table` |
| `title` | string | ✓ | Tiêu đề in trên biểu đồ (tiếng Hàn) |
| `caption` | string | – | Dòng chú thích in dưới tiêu đề: nguồn, đối tượng khảo sát. Ví dụ `○○연구소, 20대·40대 직장인 각 500명 대상` |
| `unit` | string | ✓ | Đơn vị **hiển thị** trên trục hoặc ở nhãn "단위" (`%`, `만 건`, `명`, `원`) |
| `series` | list | ✓ | `[{name, points: [{x, y}]}]`. `y` là số **theo đơn vị `unit`**: `unit: 만 건`, `y: 210` nghĩa là 210만 건 |

Quy tắc theo loại biểu đồ:
- `pie`: `unit: "%"`, tổng `y` của mỗi series bằng **100** (sai số ±1 do làm tròn). Lệch hơn thì validator cảnh báo.
- `bar` hoặc `line` nhiều nhóm: mỗi nhóm là một series, các series có cùng tập `x` và cùng thứ tự `x`.
- `table`: mỗi `series` là **một hàng** (`name` = tên hàng), `x` là **tên cột**.

`choices[]`:

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `label` | `"①"`…`"④"` | ✓ | Đúng thứ tự, đặt trong ngoặc kép |
| `text` | string | ✓ | Rỗng `""` chỉ dùng cho phương án là hình (L01–L03) |
| `correct` | bool | đúng 1 cái `true` | Các phương án khác bỏ trường này hoặc ghi `false` |
| `note_vi` | string | ✓ với phương án sai | Tuỳ chọn với đáp án đúng |
| `trap` | enum | khuyến nghị với phương án sai | Mục 2.2 |
| `image_desc`, `chart_data` | | L01–L03 ✓ | Khi phương án là tranh hoặc biểu đồ |

### 5.4 Biến thể B — Trắc nghiệm Nghe (L01–L50)

Gồm các trường của biến thể A, trừ `passage` (không có, vì đề Nghe không in ngữ liệu). Thêm:

| Trường | Kiểu | Bắt buộc | Ràng buộc / ghi chú |
|---|---|---|---|
| `transcript_ko` | string | ✓ | Mỗi dòng có nhãn `남자: …` / `여자: …`. Hội thoại: một lượt một dòng. Đơn thoại hoặc lượt dài: nhiều dòng liên tiếp cùng nhãn, mỗi dòng một đoạn ý (mục 4.3) |
| `transcript_vi` | string | ✓ | Dịch từng dòng, `Nam: …` / `Nữ: …`. Số dòng bằng `transcript_ko`. Xưng hô theo mục 4.3 |
| `speakers` | list | ✓ | `[{label: 남자\|여자, gender: male\|female, role_vi, age_range, voice_hint_vi}]`. `age_range` ∈ `teen`, `20s`, `30s-40s`, `50s`, `60s+`. Mỗi nhãn trong transcript phải có trong `speakers` |
| `audio_url` | null | ✓ | `null` cho tới khi có audio |
| `tts_notes` | object | ✓ | `{speed: số, style_vi, pauses_vi?, pronunciation_vi?}` (mục 4.3). `pronunciation_vi` theo 표준 발음법. Biến thể khẩu ngữ ghi kèm chữ "không chuẩn" |
| `image_desc` | string | L01–L03 ✓ | Bối cảnh chung. Từng tranh mô tả ở `choices[].image_desc` |

Nếu hai người cùng giới tính (hiếm) thì dùng `남자 1:`/`남자 2:` và khai báo đủ trong `speakers`.

### 5.5 Biến thể C1 — Viết W51–W52

Không có `choices`. Thêm:

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `passage` | string | ✓ | Có `( ㉠ )`, `( ㉡ )` |
| `register` | enum | ✓ | `formal_polite` (-습니다), `polite` (-아요), `written_plain` (-ㄴ다). W52 luôn là `written_plain` |
| `blanks` | list (2) | ✓ | Mỗi phần tử: `label` ✓ (`"㉠"`/`"㉡"`), `accepted_answers` ✓ (≥3), `required_elements_vi` ✓, `partial_answers` –, `rejected_answers` – (`[{text, reason_vi}]`), `note_vi` – |
| `scoring_notes_vi` | string | ✓ | Cách cho điểm tối đa, điểm một phần, 0 điểm |
| `common_mistakes_vi` | list[string] | ✓ | Lỗi người Việt hay mắc ở đề này |

### 5.6 Biến thể C2 — Viết W53–W54

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `task` | string | ✓ | Nội dung đề tiếng Hàn: tên chủ đề, dữ liệu dạng chữ (W53); đoạn dẫn + câu hỏi gợi ý (W54) |
| `chart_data`, `image_desc`, `data_is_fictional` | | W53 ✓ | Như biến thể A |
| `required_points` | list | ✓ | `[{id: p1, ko, vi}]`. W53: mỗi khối dữ liệu. W54: mỗi câu hỏi gợi ý |
| `char_limit` | object | ✓ | `{min, max}`. W53 `{min: 200, max: 300}`, W54 `{min: 600, max: 700}`. Phải khớp cấu hình chương trình |
| `model_answers` | list (2) | ✓ | `[{level, text, char_count, covers: [p1…], rubric_notes_vi: {task_fulfillment, organization, language_use}}]` |
| `outline_vi` | string | – | Dàn ý gợi ý (có thể đặt trong `explanation_vi`) |
| `expression_bank` | list | – | `[{ko, vi}]` biểu hiện nên dùng cho đề này |
| `scoring_notes_vi` | string | ✓ | Điều kiện đạt mức cao / thấp theo 3 tiêu chí |
| `common_mistakes_vi` | list[string] | ✓ | Mục 4.6 + lỗi riêng của đề |

`model_answers[].text`: theo quy ước ngăn đoạn ở mục 5.2. W53 viết một đoạn trên một dòng. W54 mỗi đoạn một dòng, **không** thêm dòng trống, **không** thụt đầu dòng (thụt đầu dòng 원고지 do giao diện xử lý). `chart_data` của W53 là list, giống biến thể A.

### 5.7 Đếm ký tự

`char_count` = số **code point Unicode** của văn bản sau khi:
1. Chuẩn hoá NFC.
2. Bỏ ký tự xuống dòng (`\n`, `\r`) và khoảng trắng ở cuối dòng.

Mỗi âm tiết Hangul, chữ số, dấu câu, ký hiệu (`%`, `○`) và **mỗi khoảng trắng** tính là 1. Ký tự `\n` giữa hai đoạn tính 0.

**Khoảng trắng.** Văn bản được đếm **nguyên trạng**, nên khoảng trắng phải chuẩn:
- Giữa hai câu có **đúng 1** khoảng trắng.
- Không có khoảng trắng đầu dòng, cuối dòng, không có khoảng trắng kép, không có tab.
- Validator báo **lỗi** nếu vi phạm. Ngoại lệ: dấu chỗ trống `(   )` có sẵn khoảng trắng bên trong.

**Ước tính ô 원고지.** Đây là cách đếm thô để tránh bài mẫu tràn khung giấy:
- Mỗi đoạn chiếm `ceil((1 + số ký tự của đoạn) / 20)` dòng (1 ô thụt đầu đoạn, 20 ô một dòng).
- Tổng số ô = tổng số dòng × 20.
- Ví dụ: W54 có 4 đoạn dài 153 / 153 / 186 / 177 ký tự → 8 + 8 + 10 + 9 = 35 dòng = 700 ô, tức là đầy khung.
- Cách đếm chính xác (quy tắc dấu câu, khoảng trắng đầu dòng) do `lib/writing` của writing-ai-engineer xử lý. Khi chưa có `lib/writing`, reviewer ước tính tay theo công thức trên.

Hai cách đếm có thể chênh nhau. Giới hạn mềm cho bài mẫu ở mục 4.6 (W53 ≤ 290 ký tự và ≤ 300 ô; W54 ≤ 680 ký tự và ≤ 700 ô). Bài mẫu cũng không được sát biên dưới: nên cách `min` ít nhất 10 ký tự. Script validate sẽ tự đếm lại và báo lỗi nếu `char_count` lệch.

### 5.8 Ánh xạ YAML → CSDL (README mục 6)

| YAML | CSDL |
|---|---|
| `id`, `type_code`, `subskill`, `difficulty`, `stem`, `explanation_vi` | `questions.*` cùng tên (`id` YAML lưu làm khoá ngoài ổn định) |
| `passage` | `question_groups.passage_md` |
| `transcript_ko`, `transcript_vi`, `audio_url`, `image_url` | `question_groups.*` cùng tên |
| `group_key` | Khoá gộp file thành một `question_groups` khi import |
| `choices[].label`, `.text` | `choices.label`, `choices.text` |
| `choices[].correct` | `choices.is_correct` |
| `choices[].note_vi` | `choices.distractor_note_vi` |
| `tags` | `tags` / `question_tags` |
| `image_desc`, `chart_data`, `data_is_fictional`, `speakers`, `tts_notes`, `insert_sentence`, `choices[].trap`, `pair_with`, `source`, `authored_by`, `reviewed_by/at`, toàn bộ trường Viết | **Chưa có cột** trong README mục 6. Cần **backend-engineer** bổ sung (ví dụ cột `jsonb meta` ở `questions`/`question_groups`/`choices`, hoặc bảng `writing_tasks`) |

### 5.9 Quy tắc validate (đầu vào cho `scripts/` của backend)

Lỗi (chặn import):
1. Thiếu trường bắt buộc. Sai kiểu dữ liệu.
2. `id` sai regex, không khớp tên file, hoặc tiền tố không khớp `type_code`.
3. `type_code` không khớp thư mục.
4. `subskill` ngoài tập cho phép.
5. `difficulty` ngoài 3–6.
6. Trắc nghiệm: số phương án khác 4, nhãn sai thứ tự, số `correct: true` khác 1, phương án sai thiếu `note_vi`.
7. Nghe: thiếu `transcript_ko`/`transcript_vi`, số dòng hai transcript lệch nhau, dòng không có nhãn hợp lệ (`^(남자|여자)( [0-9])?: `), nhãn người nói không có trong `speakers`, `age_range` ngoài enum.
8. `chart_data` có mà `data_is_fictional` không phải `true`. `chart_data` không phải list. Phần tử thiếu `chart_type`/`title`/`unit`/`series`. R10 thiếu `chart_data` hoặc `image_desc`.
9. W53–W54: số bài mẫu khác 2; `char_count` lệch so với đếm lại; `char_count` ngoài `char_limit`; bài mẫu chứa đuôi `-요.` hoặc `-습니다/-ㅂ니다` (regex trên cuối câu); `covers` không phủ đủ `required_points`.
10. W51–W52: một chỗ trống có ít hơn 3 `accepted_answers`; W52 có `register` khác `written_plain`.
11. Các file cùng `group_key` có ngữ liệu chung khác nhau.
12. Import vào CSDL khi `reviewed_by` là `null` hoặc `source` khác `original`.
13. Tag sai định dạng hoặc dùng tiền tố ngoài bảng mục 6. Số tag `genre:` khác 1. Giá trị `genre:`, `topic:` hoặc `setting:` ngoài danh sách ở mục 6. Có hơn 1 tag `setting:`.
14. Khoảng trắng sai quy tắc ở mục 5.7 (đầu dòng, cuối dòng, kép, tab), hoặc có dòng trống, trong **các trường theo quy ước ngăn đoạn** ở mục 5.2: `passage`, `transcript_ko`, `transcript_vi`, `task`, `model_answers[].text`. Các trường markdown (`explanation_vi`, `scoring_notes_vi`, `note_vi`, `outline_vi`, `notes_internal`…) **được phép** có dòng trống và không bị kiểm tra theo quy tắc này.
15. Mã `trap` ngoài danh mục ở mục 2.2.

Cảnh báo (không chặn):
- `pair_with` trỏ tới id chưa tồn tại.
- Phương án sai thiếu `trap`. Câu có ít hơn 2 kiểu `trap`, trừ ngoại lệ ở mục 2.2.
- Độ dài ngữ liệu lệch quá 30% so với mục 4. Transcript được đếm sau khi bỏ nhãn.
- Có quá 8 tag.
- Biểu đồ `pie` có tổng `y` lệch 100 quá ±1.
- Bài mẫu vượt giới hạn mềm ở mục 4.6: W53 > 290 ký tự hoặc ước tính 원고지 > 300 ô; W54 > 680 ký tự hoặc > 700 ô.
- Hai dòng liền nhau cùng nhãn người nói khi `genre` là `conversation` hoặc `phone-call`.
- Lô có phân bố nhãn đúng lệch, hoặc có chu kỳ lặp nhãn đúng (mục 4.1).

### 5.10 Ví dụ

> Các ví dụ dưới đây do topik-content-designer tự soạn để minh hoạ schema, **chưa qua duyệt** (`reviewed_by: null`). Đã cập nhật ở v0.2 theo báo cáo duyệt ngày 2026-10-19. Ví dụ A (R19) được miễn quy tắc ≥2 kiểu bẫy theo ngoại lệ ở mục 2.2.

#### A · Đọc — câu cặp R19 (đi với R20)

```yaml
id: r19-0001
type_code: R19
subskill: fill_blank_connector
difficulty: 3                 # dễ hơn mức điển hình (4): quan hệ bổ sung lộ rõ ở câu kết
tags: [topic:workplace, topic:health, genre:expository, connector:게다가]
group_key: r19-20-0001
pair_with: [r20-0001]          # r20-0001 (chủ đề của đoạn) có thể chưa soạn
source: original
authored_by: topik-content-designer
created_at: 2026-10-19
reviewed_by: null
notes_internal: "Hạ độ khó xuống 3 để làm bài khởi động cho thẻ R19-20."
passage: |
  요즘 점심시간에 회사 근처를 짧게 산책하는 직장인이 늘고 있다. 점심을 먹고 나면 졸음이 오고 일의 능률이 떨어지기 쉬운데, 10분 정도만 걸어도 몸이 가벼워지고 머리가 맑아진다고 한다. (   ) 동료와 함께 걸으면 자연스럽게 이야기를 나누게 되어 사무실에서는 꺼내기 어려웠던 고민을 털어놓기도 한다. 이처럼 짧은 산책은 건강뿐만 아니라 직장 내 인간관계에도 좋은 영향을 준다.
stem: "(   )에 들어갈 알맞은 말을 고르십시오."
choices:
  - label: "①"
    text: 게다가
    correct: true
    note_vi: "게다가 = hơn nữa, thêm vào đó: bổ sung một lợi ích cùng chiều."
  - label: "②"
    text: 오히려
    trap: logic_mismatch
    note_vi: "오히려 (trái lại) dùng khi vế sau ngược với điều được chờ đợi. Ở đây vế sau là một lợi ích nữa, cùng chiều với câu trước."
  - label: "③"
    text: 그래서
    trap: logic_mismatch
    note_vi: "그래서 nối nguyên nhân với kết quả. Trò chuyện với đồng nghiệp không phải là kết quả của việc 'người nhẹ, đầu óc tỉnh táo'."
  - label: "④"
    text: 반면에
    trap: logic_mismatch
    note_vi: "반면에 dùng để đối lập hai mặt. Vế sau không trái ngược mà bổ sung."
explanation_vi: |
  **Đáp án ①.** Căn cứ: câu kết "짧은 산책은 건강뿐만 아니라 직장 내 인간관계에도 좋은 영향을 준다" (đi dạo ngắn tốt không chỉ cho sức khoẻ mà còn cho quan hệ nơi làm việc).
  Câu trước chỗ trống nói lợi ích sức khoẻ, câu sau nói lợi ích quan hệ. Hai câu có quan hệ **bổ sung**, nên cần 게다가.
  **Mẹo dạng:** xác định quan hệ logic giữa câu trước và câu sau chỗ trống (bổ sung / đối lập / nhân quả) trước khi nhìn phương án.
  **Đáng chú ý:**
  - 능률 (能率 – năng suất) – năng suất, hiệu suất
  - 털어놓다 – giãi bày, thổ lộ
  - -뿐만 아니라 – không chỉ … mà còn
```

#### B · Nghe — L09 (câu đơn)

```yaml
id: l09-0001
type_code: L09
subskill: next_action
difficulty: 3
tags: [topic:workplace, genre:conversation, setting:office]
source: original
authored_by: topik-content-designer
created_at: 2026-10-19
reviewed_by: null
audio_url: null
speakers:
  - { label: 여자, gender: female, role_vi: "trưởng nhóm, cấp trên của nam", age_range: 30s-40s, voice_hint_vi: "giọng chín chắn, thân thiện" }
  - { label: 남자, gender: male, role_vi: "nhân viên phụ trách đào tạo", age_range: 20s, voice_hint_vi: "giọng trẻ, lễ phép" }
tts_notes:
  speed: 1.0
  style_vi: "Hội thoại công sở tự nhiên, không đọc như văn bản."
  pauses_vi: "Ngắt ngắn sau '아, 그래요?'."
transcript_ko: |
  여자: 민수 씨, 다음 주 신입 사원 교육 준비는 잘되고 있어요?
  남자: 네, 발표 자료는 어제 다 만들었어요. 그런데 교육실 프로젝터가 고장 났다고 하던데요.
  여자: 아, 그래요? 그럼 제가 지금 총무팀에 전화해서 수리를 부탁할게요.
  남자: 감사합니다. 그럼 저는 그동안 나눠 줄 자료를 인쇄해 놓을게요.
transcript_vi: |
  Nữ: Anh Min-su, việc chuẩn bị buổi đào tạo nhân viên mới tuần sau ổn chứ?
  Nam: Vâng, tài liệu thuyết trình tôi làm xong hết hôm qua rồi. Nhưng nghe nói máy chiếu phòng đào tạo bị hỏng.
  Nữ: À, vậy à? Thế để tôi gọi ngay cho phòng hành chính nhờ sửa.
  Nam: Cảm ơn chị. Vậy trong lúc đó tôi sẽ in sẵn tài liệu để phát.
stem: "다음 대화를 잘 듣고 여자가 이어서 할 행동으로 가장 알맞은 것을 고르십시오."
choices:
  - label: "①"
    text: 총무팀에 전화를 건다.
    correct: true
  - label: "②"
    text: 발표 자료를 만든다.
    trap: time_shift
    note_vi: "Tài liệu thuyết trình đã được nam làm xong hôm qua (어제 다 만들었어요). Đây là việc đã xong, và cũng không phải việc của nữ."
  - label: "③"
    text: 교육 자료를 인쇄한다.
    trap: speaker_swap
    note_vi: "In tài liệu là việc nam nói sẽ làm (저는 … 인쇄해 놓을게요), không phải nữ."
  - label: "④"
    text: 프로젝터를 수리한다.
    trap: keyword_echo
    note_vi: "Nữ không tự sửa máy chiếu mà gọi phòng hành chính để nhờ sửa (수리를 부탁할게요)."
explanation_vi: |
  **Đáp án ①.** Căn cứ: "제가 지금 총무팀에 전화해서 수리를 부탁할게요" (để tôi gọi ngay cho phòng hành chính nhờ sửa). '지금' cho biết đây là việc nữ làm ngay sau hội thoại.
  **Mẹo dạng:** gạch nhanh "ai – làm gì – khi nào". Đáp án là việc **của người được hỏi** và **chưa làm**. Đuôi -(으)ㄹ게요 là tín hiệu mạnh.
  **Đáng chú ý:**
  - 총무팀 (總務 – tổng vụ) – phòng hành chính (팀 = team)
  - 고장 나다 (故障 – cố chướng) – bị hỏng
  - -아/어 놓다 – làm sẵn, làm trước để dùng sau
```

#### C1 · Viết — W52

```yaml
id: w52-0001
type_code: W52
subskill: expository_completion
difficulty: 4
tags: [topic:health, genre:expository, grammar:-(으)ㄹ-수-있다, grammar:-는-것이-좋다]
source: original
authored_by: topik-content-designer
created_at: 2026-10-19
reviewed_by: null
register: written_plain
stem: "다음 글의 ㉠과 ㉡에 알맞은 말을 각각 한 문장으로 쓰십시오."
passage: |
  낮잠을 짧게 자면 오후의 집중력을 높이는 데 도움이 된다. 그러나 30분 이상 자면 오히려 ( ㉠ ). 깊은 잠에 빠졌다가 깨어나면 머리가 무겁고 몸이 더 나른해지기 때문이다. 또한 저녁 가까운 시간에 낮잠을 자면 밤에 잠들기가 어려워진다. 따라서 낮잠을 잘 때는 ( ㉡ ).
blanks:
  - label: "㉠"
    accepted_answers:
      - 더 피곤해질 수 있다
      - 피로감이 더 커질 수 있다
      - 집중력이 떨어질 수 있다
      - 더 피곤함을 느끼게 된다
      - 더 피곤해진다
    partial_answers:
      - 좋지 않다              # đúng hướng nhưng mơ hồ, thiếu nội dung cụ thể (mệt hơn / giảm tập trung)
      - 더 피곤해질 수 있어요  # đúng ý, sai văn phong (-요)
    rejected_answers:
      - { text: "집중력이 높아진다", reason_vi: "Ngược nghĩa với 오히려 và với câu giải thích phía sau." }
    required_elements_vi:
      - "Kết quả tiêu cực ngược với lợi ích đã nêu (mệt hơn / giảm tập trung)."
      - "Câu hoàn chỉnh, đuôi -ㄴ다/-다. Nên có -(으)ㄹ 수 있다 hoặc -게 된다."
  - label: "㉡"
    accepted_answers:
      - 30분 이내로 짧게 자고 너무 늦은 시간에는 자지 않는 것이 좋다
      - 30분을 넘기지 않고 이른 오후에 자는 것이 좋다
      - 짧게 자고 저녁 가까운 시간에는 낮잠을 피해야 한다
    partial_answers:
      - 30분 이내로 자는 것이 좋다   # chỉ đủ một trong hai yếu tố
    required_elements_vi:
      - "Đủ cả hai lời khuyên: (a) ngủ ngắn, dưới 30 phút; (b) không ngủ quá muộn, gần tối."
      - "Kết bằng -는 것이 좋다 / -아야 한다 (sau 따라서 cần lời khuyên)."
scoring_notes_vi: |
  Mỗi chỗ trống chấm riêng. Điểm tối đa khi đúng nội dung + đúng văn phong -ㄴ다 + một câu hoàn chỉnh.
  Điểm một phần khi đúng ý nhưng sai văn phong/ngữ pháp nhỏ, hoặc (㉡) thiếu một trong hai yếu tố.
  0 điểm khi ngược nghĩa hoặc lạc ý.
common_mistakes_vi:
  - "Dùng -아요/-습니다 trong đoạn văn 문어체."
  - "㉡ chỉ nhắc 'ngủ ngắn' mà bỏ ý 'không ngủ muộn' ở câu ngay trước 따라서."
  - "Viết hai câu hoặc chỉ viết cụm danh từ."
explanation_vi: |
  **Phân tích đề:** đoạn giải thích 문어체 về giấc ngủ trưa, có 2 chỗ trống, mỗi chỗ viết một câu -ㄴ다.
  **Dàn ý:** ㉠ = hậu quả ngược với lợi ích ở câu 1; ㉡ = lời khuyên tổng hợp hai vấn đề đã nêu.
  **Lưu ý:** ㉠: "그러나 … 오히려" báo hiệu kết quả **ngược** với lợi ích ở câu 1. Câu sau "-기 때문이다" giải thích lý do (đầu nặng, người uể oải), nên ㉠ là "mệt hơn / giảm tập trung". ㉡: "따라서" tổng hợp **hai** vấn đề đã nêu (ngủ quá 30 phút; ngủ gần tối) thành lời khuyên, nên cần nhắc cả hai.
  **Đáng chú ý:**
  - 집중력 (集中力 – tập trung lực) – sức tập trung
  - 피로감 (疲勞感 – bì lao cảm) – cảm giác mệt mỏi
  - 나른하다 – uể oải, rã rời
```

#### C2 · Viết — W53

```yaml
id: w53-0001
type_code: W53
subskill: data_description
difficulty: 4
tags: [topic:consumer, topic:environment, genre:chart-trend]
source: original
authored_by: topik-content-designer
created_at: 2026-10-19
reviewed_by: null
stem: "다음은 '20대의 중고 거래 이용 현황'에 대한 자료이다. 이 내용을 200~300자의 글로 설명하십시오. 단, 글의 제목을 쓰지 마십시오."
task: |
  조사 기관: ○○연구소 / 조사 대상: 각 연도 20대 500명
  [중고 거래 이용 경험] 2015년 18% → 2020년 41% → 2025년 67%
  [이용 이유] 저렴한 가격 52%, 환경 보호 27%, 희귀한 물건 구매 21%
  [전망] 중고 거래 플랫폼 다양화 → 이용자 계속 증가 예상
data_is_fictional: true
image_desc: "Trái: biểu đồ đường 3 điểm (2015: 18%, 2020: 41%, 2025: 67%). Phải: biểu đồ tròn lý do sử dụng. Dưới: ô chữ 'Triển vọng'. Mọi nhãn bằng tiếng Hàn."
image_url: null
chart_data:
  - chart_type: line
    title: 중고 거래 이용 경험
    caption: "○○연구소, 각 연도 20대 500명 대상"
    unit: "%"
    series: [{ name: 20대, points: [{x: 2015, y: 18}, {x: 2020, y: 41}, {x: 2025, y: 67}] }]
  - chart_type: pie
    title: 이용 이유
    unit: "%"
    series: [{ name: 이유, points: [{x: 저렴한 가격, y: 52}, {x: 환경 보호, y: 27}, {x: 희귀한 물건 구매, y: 21}] }]
required_points:
  - { id: p1, ko: "이용 경험 비율의 변화(2015→2020→2025)", vi: "Xu hướng tỉ lệ đã dùng, đủ 3 mốc" }
  - { id: p2, ko: "이용 이유와 비율", vi: "3 lý do theo thứ tự kèm %" }
  - { id: p3, ko: "전망", vi: "Triển vọng: nền tảng đa dạng hơn nên người dùng tiếp tục tăng" }
char_limit: { min: 200, max: 300 }
model_answers:
  - level: 4
    char_count: 240        # đếm theo câu: 42 + 73 + 81 + 41 + 3 khoảng trắng giữa câu; 원고지 ≈ ceil(241/20) = 13 dòng = 260 ô
    covers: [p1, p2, p3]
    text: |
      ○○연구소에서 20대 500명을 대상으로 중고 거래 이용 경험을 조사하였다. 그 결과 중고 거래를 이용해 본 적이 있다는 응답은 2015년 18%에서 2020년 41%, 2025년 67%로 꾸준히 증가하였다. 중고 거래를 이용하는 이유로는 '저렴한 가격'이 52%로 가장 많았고, '환경 보호'가 27%, '희귀한 물건 구매'가 21%로 그 뒤를 이었다. 앞으로도 중고 거래 앱이 다양해지면서 이용자는 계속 늘어날 것으로 보인다.
    rubric_notes_vi:
      task_fulfillment: "Đủ 3 ý, số liệu chính xác. Ghi đúng nhãn 'lý do sử dụng', không biến thành nguyên nhân tăng trưởng. Không thêm ý kiến cá nhân."
      organization: "Trình tự giới thiệu → xu hướng → lý do → triển vọng. Có 그 결과, 앞으로도 làm liên kết."
      language_use: "Đúng -ㄴ다. Biểu hiện chuẩn cấp 4 (-에서 -로 증가하였다, 가장 많았고, 그 뒤를 이었다) nhưng chưa đa dạng."
  - level: 5
    char_count: 272        # đếm theo câu: 42 + 91 + 86 + 50 + 3 khoảng trắng giữa câu; 원고지 ≈ ceil(273/20) = 14 dòng = 280 ô
    covers: [p1, p2, p3]
    text: |
      ○○연구소에서 20대 500명을 대상으로 중고 거래 이용 실태를 조사하였다. 조사 결과에 따르면 중고 거래 이용 경험이 있다는 응답은 2015년 18%에 불과하였으나 2020년 41%로 두 배 이상 늘었고, 2025년에는 67%에 달하였다. 한편 중고 거래를 이용하는 이유로는 '저렴한 가격'(52%)이 가장 많이 꼽혔으며, '환경 보호'(27%)와 '희귀한 물건 구매'(21%)가 뒤를 이었다. 앞으로 중고 거래 플랫폼이 다양해짐에 따라 이러한 증가세는 당분간 이어질 것으로 전망된다.
    rubric_notes_vi:
      task_fulfillment: "Đủ 3 ý, có diễn giải mức tăng (두 배 이상) dựa đúng trên số liệu. Lý do sử dụng được trình bày đúng là lý do sử dụng."
      organization: "Liên kết chặt (조사 결과에 따르면, 한편 để chuyển khối dữ liệu, -에 따라). Câu phức cân đối."
      language_use: "Biểu hiện đa dạng cấp 5: -에 불과하였으나, -에 달하였다, 꼽히다, 증가세, 전망되다."
scoring_notes_vi: |
  Mức cao: đủ p1–p3 với số liệu đúng; có biểu hiện so sánh, xu hướng; một đoạn liền mạch; đúng -ㄴ다.
  Bị hạ mạnh: thiếu một khối dữ liệu; sai số; thêm ý kiến cá nhân; dùng -요/-습니다; dưới 200 ký tự; viết tiêu đề.
common_mistakes_vi:
  - "Thêm cảm nghĩ: '나는 중고 거래가 좋다고 생각한다' (W53 không hỏi ý kiến)."
  - "Bỏ mốc 2020 hoặc bỏ phần 전망."
  - "Dịch thẳng tiếng Việt: '중고 거래를 사용하는 사람' thay vì '중고 거래 이용자'."
  - "Chép nguyên dòng '플랫폼 다양화 → 이용자 계속 증가 예상' mà không viết thành câu."
  - "Biến 'lý do sử dụng' thành 'nguyên nhân tăng': '이용자가 증가한 원인으로는…' là suy diễn vượt dữ liệu."
explanation_vi: |
  **Phân tích đề:** mô tả dữ liệu khảo sát trong một đoạn 200–300 ký tự, 3 khối dữ liệu = 3 ý bắt buộc (p1 xu hướng, p2 lý do sử dụng, p3 triển vọng). Không viết tiêu đề, không nêu ý kiến.
  **Dàn ý:** (1) giới thiệu khảo sát → (2) xu hướng 3 mốc (p1) → (3) lý do sử dụng theo thứ tự lớn → nhỏ (p2) → (4) triển vọng (p3).
  **Lưu ý:** mũi tên ở dòng xu hướng chỉ trình tự thời gian (-에서 -(으)로 증가하였다). Mũi tên ở dòng 전망 là nhân quả, chuyển thành -(으)ㅁ에 따라, -(으)면서. Khối "이용 이유" là lý do người ta dùng dịch vụ, không phải nguyên nhân khiến tỉ lệ tăng. Viết "중고 거래를 이용하는 이유로는…".
  **Đáng chú ý:**
  - 중고 (中古 – trung cổ) – đồ cũ, đã qua sử dụng; trùng "trung cổ" ở nghĩa thời kỳ lịch sử (ít dùng), khác ở nghĩa thông dụng "đồ cũ"
  - 실태 (實態 – thực thái) – tình hình thực tế
  - 불과하다 (不過 – bất quá) – chỉ là, không hơn
  - 증가세 (增加勢 – tăng gia thế) – đà tăng
  - 전망 (展望 – triển vọng) – triển vọng, dự báo
```

#### C2 · Viết — W54 (khung, rút gọn)

> File thật phải có 2 bài mẫu **đầy đủ** 600–700 ký tự (giới hạn mềm ≤ 680 ký tự và ≤ 700 ô 원고지 ước tính). Ở đây chỉ minh hoạ các trường khác W53. Khối dưới **là YAML hợp lệ** nhưng giá trị là placeholder, **không đạt validate**. Script test không được dùng khối này làm dữ liệu mẫu.

```yaml
# KHỐI MINH HOẠ — placeholder, không dùng làm dữ liệu
id: w54-0001
type_code: W54
subskill: argumentative_essay
difficulty: 5
tags: [topic:culture, topic:society, genre:argumentative]
stem: "다음을 주제로 하여 자신의 생각을 600~700자로 글을 쓰십시오. 단, 문제를 그대로 옮겨 쓰지 마십시오."
task: |
  최근 혼자 여가 활동을 즐기는 사람이 늘고 있다. 이러한 변화에 대해 아래의 내용을 중심으로 자신의 생각을 쓰라.
  · 혼자 하는 여가 활동이 늘어나는 이유는 무엇인가?
  · 혼자 하는 여가 활동의 장점과 단점은 무엇인가?
  · 여가 시간을 의미 있게 보내기 위해 필요한 것은 무엇인가?
required_points:
  - { id: p1, ko: "증가 이유", vi: "Lý do tăng" }
  - { id: p2, ko: "장점과 단점", vi: "Cả ưu và nhược điểm" }
  - { id: p3, ko: "의미 있게 보내기 위한 조건", vi: "Điều cần thiết để dùng thời gian rảnh có ý nghĩa" }
char_limit: { min: 600, max: 700 }
model_answers:
  - level: 5
    char_count: 0          # placeholder: số thật đếm theo 5.7, 610–680
    covers: [p1, p2, p3]
    text: "<4 đoạn, mỗi đoạn 1 dòng>"
    rubric_notes_vi: { task_fulfillment: "<…>", organization: "<…>", language_use: "<…>" }
  - level: 6
    char_count: 0          # placeholder
    covers: [p1, p2, p3]
    text: "<…>"
    rubric_notes_vi: { task_fulfillment: "<…>", organization: "<…>", language_use: "<…>" }
# + source, authored_by, reviewed_by: null, scoring_notes_vi, common_mistakes_vi, explanation_vi như W53
```

---

## 6. Quy tắc tags

- Định dạng `tiền_tố:giá_trị`, chữ thường. Giá trị tiếng Anh nhiều từ thì nối bằng `-` (`topic:daily-life`). Giá trị tiếng Hàn thay khoảng trắng bằng `-` (`connector:그-결과`).
- Mỗi câu có **ít nhất 1 `topic:` và đúng 1 `genre:`**, tối đa 8 tag (vượt thì validator cảnh báo).
- `topic:`, `genre:`, `setting:` là **danh sách đóng**. Giá trị ngoài danh sách thì validator báo lỗi. Muốn thêm giá trị phải sửa tài liệu này qua PR. `grammar:`, `connector:`, `idiom:`, `vocab:` là giá trị tự do theo quy tắc định dạng.
- Không lặp thông tin đã có ở trường riêng (`type_code`, `subskill`, `difficulty`, `trap`).

| Tiền tố | Ý nghĩa | Ví dụ |
|---|---|---|
| `topic:` | Chủ đề nội dung | `topic:environment` |
| `genre:` | Thể loại ngữ liệu | `genre:news`, `genre:lecture` |
| `setting:` | Bối cảnh giao tiếp (chủ yếu Nghe). Tuỳ chọn, tối đa 1 | `setting:office`, `setting:phone` |
| `grammar:` | Ngữ pháp then chốt. Giá trị khớp `grammar_points.pattern` của lexicographer | `grammar:-느라고`, `grammar:-(으)ㄹ-뿐만-아니라` |
| `connector:` | Từ nối hoặc phó từ then chốt | `connector:게다가`, `connector:반면` |
| `idiom:` | Quán ngữ, thành ngữ | `idiom:발목을-잡다` |
| `vocab:` | Từ khoá then chốt (dùng tiết chế, cho SRS) | `vocab:능률` |

**`genre:` cho phép** (danh sách đóng):

| Nhóm | Giá trị |
|---|---|
| Nghe | `conversation` (hội thoại), `phone-call`, `announcement` (안내 방송), `news`, `interview` (L16, L20, L25, L29), `debate` (토론), `lecture` (강연), `documentary`, `speech` (연설, nghi lễ), `edu-program` (교양 프로그램: MC + chuyên gia, L37–L38), `expert-talk` (대담, L39–L40, L47–L48) |
| Đọc | `sentence` (câu đơn R01–R04), `advertisement` (R05–R06), `campaign` (quảng cáo công ích R07), `notice` (thông báo, hướng dẫn, poster), `news-article`, `headline`, `expository`, `argumentative`, `essay` (수필), `fiction`, `review` |
| Viết / biểu đồ | `email`, `message`, `chart-trend`, `chart-compare` |

Ở v0.2 đã bỏ `talk-show` (mơ hồ với 토크쇼 giải trí; dùng `edu-program` hoặc `expert-talk`) và `chart` (dùng `chart-trend` hoặc `chart-compare`).

**`setting:` cho phép** (danh sách đóng):
`office`, `phone`, `store`, `restaurant`, `cafe`, `library`, `school`, `university`, `hospital`, `pharmacy`, `bank`, `post-office`, `public-office`, `station`, `airport`, `hotel`, `home`, `street`, `gym`, `museum`, `studio`, `lecture-hall`, `ceremony`, `online`.
Cách ánh xạ một số bối cảnh: tiệm giặt hoặc cửa hàng dịch vụ → `store`; trung tâm thể thao → `gym`; bảo tàng, phòng triển lãm, nhà văn hoá → `museum`.

**`topic:` cho phép** (danh sách đóng; thêm giá trị mới phải sửa tài liệu này):
`daily-life`, `shopping`, `consumer`, `food`, `travel`, `transportation`, `housing`, `workplace`, `career`, `education`, `university`, `health`, `medicine`, `sports`, `leisure`, `culture`, `tradition`, `art`, `literature`, `media`, `technology`, `internet`, `science`, `nature`, `animals`, `environment`, `energy`, `economy`, `business`, `society`, `population`, `aging`, `welfare`, `family`, `psychology`, `language`, `history`, `philosophy`, `ethics`, `law`, `city`, `architecture`, `public-service`.

---

## 7. Checklist kiểm duyệt & định dạng báo cáo

Dùng cho **topik-content-reviewer**. Ghi mã tiêu chí (ví dụ `[B2]`) ở cột "vấn đề" của báo cáo.

### 7.1 Checklist

**A · Đáp án**
- A1. Đúng 1 đáp án đúng. Reviewer đã thử bảo vệ từng phương án nhiễu và không bảo vệ được.
- A2. Đáp án đúng có căn cứ rõ trong văn bản/transcript, không cần kiến thức ngoài.
- A3. Che văn bản đi thì không đoán được đáp án.

**B · Phương án nhiễu**
- B1. Mỗi phương án sai vì một lý do cụ thể, gắn `trap` hợp lý.
- B2. Không sai lộ liễu, không đánh đố vô lý. Ít nhất 2 kiểu bẫy khác nhau, trừ R13–R15, R19, R39–R41 (ngoại lệ ở mục 2.2). Với các dạng này, kiểm tra `note_vi` có nêu quan hệ logic hoặc mối nối cụ thể không. Không lọc được đáp án chỉ nhờ sắc thái (tích cực/tiêu cực).
- B3. Bốn phương án song song về hình thức và độ dài. Đáp án không nổi bật về hình thức.

**C · Tiếng Hàn**
- C1. Tự nhiên, không 번역투. Đúng chính tả và 띄어쓰기.
- C2. Đúng văn phong của dạng: hội thoại, tin tức, bài giảng, văn học, 문어체. Kính ngữ nhất quán.
- C3. Từ vựng và ngữ pháp phù hợp `difficulty`.

**D · Dạng & độ khó**
- D1. Khớp `type_code`: đúng thể loại, đúng kiểu câu hỏi, đúng lệnh đề.
- D2. Độ dài nằm trong khoảng ở mục 4 (lệch không quá 30%).
- D3. `difficulty` hợp lý (lệch bảng mục 3 quá ±1 thì phải có lý do).

**E · Lời giải**
- E1. `explanation_vi` có trích căn cứ khớp nguyên văn, dịch đúng.
- E2. Mỗi phương án sai có `note_vi` nói rõ sai ở đâu.
- E3. Có mẹo dạng. Tiếng Việt rõ ràng, không emoji. Mục "Đáng chú ý" theo mẫu ở mục 4.2: có Hán tự và âm Hán Việt cho từ Hán Hàn. Chữ đa âm ghi theo âm quen dùng của từ, có chú thích khi cần. Cảnh báo bạn giả phân biệt hoàn toàn / một phần (bạn giả một phần phải nêu cả nghĩa trùng). Cảnh báo chính tả/dùng từ dẫn được mục từ 표준국어대사전 và chỉ dùng khi một cách thật sự sai. Viết: tối đa 8 mục, không lặp `expression_bank`, theo khung Phân tích đề → Dàn ý → Lưu ý → Đáng chú ý.

**F · Bản quyền**
- F1. Không giống đề NIIED, sách luyện thi, Migii hay nguồn khác (cả tình huống đặc trưng lẫn câu chữ). Nghi ngờ thì đánh **BLOCKER**.
- F2. Số liệu giả định có `data_is_fictional: true`. Không gán cho cơ quan, người, thương hiệu có thật.

**G · Metadata**
- G1. Đủ trường bắt buộc. `id`, đường dẫn, `type_code` khớp nhau.
- G2. `subskill` nằm trong tập cho phép. `tags` đúng mục 6: đúng 1 `genre:`, giá trị `topic:`/`genre:`/`setting:` nằm trong danh sách đóng. `trap` đúng định nghĩa: `speaker_swap` (người có mặt), `concession_point` (quan điểm nhượng bộ hoặc được trích dẫn).
- G3. Câu cặp: `group_key`, `pair_with` đúng. Ngữ liệu chung giống hệt file kia (nếu file kia đã có).
- G4. `reviewed_by: null`, `source: original`.

**H · Riêng Nghe**
- H1. Transcript chứa đủ thông tin cho đáp án và khớp câu hỏi. Câu hỏi về 남자/여자 đúng người.
- H2. Đọc thành tiếng tự nhiên trong thời lượng hợp lý. Không có ký hiệu TTS khó đọc, không có từ mơ hồ khi nghe. `pronunciation_vi` theo 표준 발음법. Biến thể khẩu ngữ có ghi "không chuẩn".
- H3. `transcript_vi` khớp từng dòng. `speakers` khớp nhãn. Có `tts_notes`. Xưng hô tiếng Việt khớp `age_range` và vai, nhất quán giữa transcript_vi, note_vi và explanation_vi.
- H4. L01–L03: `image_desc` đủ chi tiết để phân biệt 4 tranh/biểu đồ. Các tranh **chỉ khác nhau ở yếu tố có trong audio**.

**W · Riêng Viết**
- W1. `char_count` của mỗi bài mẫu đúng khi đếm lại (mục 5.7), nằm trong `char_limit` và trong giới hạn mềm (W53 ≤ 290 ký tự và ≤ 300 ô; W54 ≤ 680 ký tự và ≤ 700 ô 원고지 ước tính).
- W2. Bài mẫu W53–W54 **không** có -요/-습니다/-ㅂ니다. Văn phong -ㄴ다 nhất quán. W53 không có ý kiến cá nhân, không có tiêu đề. W53 không viết dự báo, nguyên nhân hay kết luận nằm ngoài dữ liệu. Không đổi nghĩa nhãn dữ liệu (ví dụ "lý do sử dụng" thành "nguyên nhân tăng").
- W3. Bài mẫu bao quát đủ `required_points`. Số liệu W53 khớp `chart_data`.
- W4. Có 2 cấp bài mẫu đúng quy tắc. Khác biệt cấp thể hiện rõ. `rubric_notes_vi` đủ 3 tiêu chí.
- W5. W51–W52: có ít nhất 3 `accepted_answers` mỗi chỗ trống, đều đúng. `partial_answers` và `required_elements_vi` hợp lý. Đáp án là một câu, đúng `register`.

**L · Cấp lô** (ghi ở phần "Nhận xét cấp lô" của báo cáo, không gắn vào từng id)
- L1. Phân bố nhãn đúng gần đều, không quá 3 câu liền nhau cùng nhãn, không có chu kỳ lặp nhãn (mục 4.1).
  - **Bắt buộc** với đề lắp ráp (Full, Mini, Hard, IBT) và với mọi lô được **phát cho người học theo đúng thứ tự trong lô**.
  - Với lô soạn theo `type_code` rồi phát theo thẻ nhóm dạng: chỉ là **khuyến nghị**. Reviewer **không cần** ghi lại nhận xét về chu kỳ ở mỗi lô loại này, chỉ ghi khi phân bố lệch rõ (một nhãn trên 40% hoặc dưới 10%).
- L2. Các câu cùng `group_key` có ngữ liệu chung giống hệt nhau.

### 7.2 Mức kết luận

| Mức | Định nghĩa | Hệ quả |
|---|---|---|
| **PASS** | Không có lỗi ảnh hưởng tới người học hoặc tới dữ liệu. Có thể kèm gợi ý không bắt buộc | Reviewer đề xuất người dùng điền `reviewed_by` |
| **FIX** | Có lỗi sửa được tại chỗ mà không đổi bản chất câu: thiếu hoặc sai `note_vi`, 띄어쓰기, một phương án nhiễu hơi lộ, độ khó lệch, tag hoặc subskill sai, `char_count` sai, bài mẫu dính -습니다, dịch transcript lệch | Agent soạn sửa, reviewer duyệt lại các mục FIX |
| **BLOCKER** | Câu không dùng được nếu chỉ sửa nhỏ: hai đáp án đúng hoặc không có đáp án đúng; sai dạng; transcript không trả lời được câu hỏi; nội dung sai sự thật hoặc nhạy cảm; **nghi sao chép** | Soạn lại hoặc loại bỏ. Riêng nghi sao chép thì báo người dùng quyết định |

### 7.3 Định dạng báo cáo

File: `content/_reviews/<YYYY-MM-DD>-<chủ-đề>.md`

```markdown
# Duyệt <chủ đề> — <YYYY-MM-DD>

Phạm vi: content/topik-ii/practice/R39/ (r39-0001 … r39-0010)
Theo: docs/content-spec.md v<phiên bản hiện hành, ví dụ 0.3>
Tổng: 10 câu — PASS 6 · FIX 3 · BLOCKER 1

| id | kết luận | vấn đề | đề xuất sửa |
|---|---|---|---|
| r39-0001 | PASS | — | (gợi ý) thêm tag connector:그-결과 |
| r39-0002 | FIX | [B2] ③ sai lộ (lạc chủ đề); [C1] "에 있어서" là 번역투 | Đổi ③ thành vị trí trước câu nêu nguyên nhân; viết lại thành "-에서" |
| r39-0003 | BLOCKER | [A1] Câu <보기> chèn vào ㉡ hay ㉢ đều hợp lý | Thêm chỉ từ "이러한" vào <보기> và sửa câu sau ㉢; soạn lại |

## Nhận xét cấp lô
- L1: <phân bố nhãn; chu kỳ, chỉ khi thuộc phạm vi bắt buộc của L1>
- L2: <bộ câu dùng chung ngữ liệu>
- <nhận xét chung khác: văn phong, Hán Việt, xu hướng lỗi của lô>

## Xác nhận nhanh (metadata / định dạng, theo §8.2)
- <id>: <thay đổi> — xác nhận / phản đối

## Đề xuất điền `reviewed_by`
- <danh sách id PASS>. Việc điền là của người dùng.
```

- Mỗi id một dòng. Nhiều vấn đề trong một ô thì ngăn cách bằng `;`.
- "Đề xuất sửa" phải đủ cụ thể để agent soạn làm theo ngay.
- Reviewer **không** sửa file nội dung và **không** điền `reviewed_by`.

---

## 8. Bản quyền, nguồn & quy trình

### 8.1 Bản quyền & nguồn

- **Mọi nội dung là tự biên soạn** (`source: original`). Chỉ được tham khảo **dạng thức** (cấu trúc, kiểu câu hỏi, độ dài, lệnh đề chuẩn), không được dùng **nội dung** (văn bản, tình huống, phương án, số liệu).
- **Không** sao chép, dịch, phỏng theo hay "thay vài chữ" từ:
  - đề thi gốc NIIED (kể cả đề đã công bố trên `topik.go.kr`);
  - sách luyện thi;
  - Migii hoặc nền tảng khác.
- Tình huống quá đặc trưng của một đề đã biết cũng tính là sao chép.
- Văn học (R23, R42): không trích tác phẩm có thật.
- Số liệu biểu đồ (L03, R10, W53) là **số liệu giả định**, ghi `data_is_fictional: true`, cơ quan ghi `○○연구소`. Giao diện cần hiển thị chú thích "Số liệu giả định dùng cho luyện tập".
- Kiến thức trong bài thông tin phải đúng. Nếu có phần chưa chắc, ghi vào `notes_internal` để reviewer kiểm tra.
- Từ điển, audio, ảnh từ nguồn ngoài: kiểm tra giấy phép trước khi dùng (thuộc vùng của lexicographer/backend). File câu hỏi không nhúng tài nguyên của bên thứ ba.
- Khi cần dẫn nguồn chính thức (format đề, lịch thi), chỉ **liên kết** tới `topik.go.kr`.

### 8.2 Quy trình

```
topik-content-designer soạn (reviewed_by: null)
        │
        ▼
script validate (backend, mục 5.9) ── lỗi ──▶ designer sửa
        │ OK
        ▼
topik-content-reviewer duyệt → content/_reviews/<ngày>-<chủ-đề>.md
        │                         │
        │ PASS                    └── FIX / BLOCKER ──▶ designer sửa ──▶ reviewer duyệt lại
        ▼
NGƯỜI DÙNG điền reviewed_by (+ reviewed_at)
        │
        ▼
merge PR ──▶ backend import (chỉ câu có reviewed_by ≠ null)
```

- **Chỉ người dùng điền `reviewed_by`/`reviewed_at`.** Agent soạn không bao giờ tự duyệt. Agent soạn và reviewer **không điền** `reviewed_by` trong bất kỳ trường hợp nào, kể cả sau khi đã sửa theo báo cáo. Nếu file cấu hình agent nào trong `.claude/agents/` ghi khác thì tài liệu này được ưu tiên. Việc sửa file cấu hình agent do người dùng thực hiện.
- Cuối mỗi lượt, agent soạn liệt kê file đã tạo hoặc sửa để reviewer duyệt.

**Khi nào phải duyệt lại một câu đã PASS hoặc đã có `reviewed_by`:**

| Loại thay đổi | Trường | Xử lý |
|---|---|---|
| **Chỉ metadata** | `tags`, `trap`, `subskill`, `difficulty`, `notes_internal`, `created_at`, `authored_by`, `image_url`, `audio_url` | **Không** đặt lại `reviewed_by`. Agent soạn ghi lại thay đổi trong `notes_internal`. Reviewer xác nhận nhanh trong báo cáo kế tiếp (một dòng, không duyệt lại toàn bộ câu). Nếu reviewer phản đối thì xử lý như FIX |
| **Chỉ định dạng** | Trong các trường văn bản: chỉ đổi khoảng trắng (thừa, kép, đầu/cuối dòng), dòng trống hoặc cách ngăn dòng/đoạn theo quy ước §5.2, **không đổi bất kỳ chữ hay dấu câu nào**. Ví dụ: bỏ dòng trống trong `passage`, tách đơn thoại thành nhiều dòng cùng nhãn (tách `transcript_vi` đúng chỗ tương ứng) | **Không** đặt lại `reviewed_by`. Điều kiện: validator xác nhận văn bản **giống hệt** bản cũ sau khi chuẩn hoá khoảng trắng và ngắt dòng (gộp mọi chuỗi khoảng trắng và `\n` thành 1 khoảng trắng rồi so sánh; với transcript, bỏ nhãn người nói đầu dòng trước khi so, và chuỗi nhãn theo thứ tự lời nói không được đổi). Agent soạn ghi "chỉ định dạng" vào `notes_internal`. Reviewer xác nhận nhanh như nhóm metadata. Nếu validator không xác nhận được thì xử lý như nhóm Nội dung |
| **Nội dung** | `passage`, `transcript_ko/vi`, `insert_sentence`, `task`, `stem`, `choices[].text`, `choices[].correct`, nhãn phương án, `note_vi`, `explanation_vi`, `speakers`, `tts_notes`, `image_desc`, `chart_data`, mọi trường Viết (`blanks`, `required_points`, `model_answers`, `scoring_notes_vi`…) | **Đặt lại `reviewed_by: null`** (và `reviewed_at: null`), rồi gửi duyệt lại toàn bộ câu. Thay đổi ngữ liệu chung thì đặt lại cho **mọi** câu cùng `group_key` |

Sửa chính tả thuần tuý (đổi chữ) trong `note_vi`/`explanation_vi` vẫn tính là thay đổi nội dung, vì ảnh hưởng tới người học. Chỉ thay đổi khoảng trắng hoặc ngắt dòng mới thuộc nhóm Định dạng.

---

## Phụ lục A · Danh sách điểm cần đối chiếu

Đối chiếu với `topik.go.kr` (thông báo, đề công bố mới nhất). Xác nhận hoặc sửa xong thì cập nhật bảng ở mục 3/4 và ghi ngày đối chiếu.

| # | Điểm cần đối chiếu | Ảnh hưởng |
|---|---|---|
| A1 | Mốc khung đề hiện hành (từ kỳ 35, năm 2014) và thay đổi sau đó, nếu có | Toàn bộ taxonomy |
| A2 | Thể loại của L14, L15, L16 (thông báo / tin tức / phỏng vấn) và L20 (phỏng vấn) | Quy tắc L13–L20 |
| A3 | Số lần phát audio: L01–L20 một lần, L21–L50 hai lần? | Cấu hình `sections` |
| A4 | Các lệnh đề đang dựa vào trí nhớ: lệnh chung L01–L03 "다음을 듣고 알맞은 그림 또는 그래프를 고르십시오."; lệnh "trùng khớp" trong cặp Nghe ("같은 것" hay "맞는 것"); L27 "남자가 말하는 의도로…"; L29 "남자가 누구인지…"; lệnh nhóm R09–R12 "다음 글 또는 그래프의 내용과 같은 것…"; R23/R42 "'<인물>'의 심정"; R43 "위 글의 내용으로 알 수 있는 것…"; bảng `stem` cặp Đọc ở mục 4.5 | `stem` chuẩn |
| A5 | Cách hỏi L23, L35 (무엇을 하고 있는지) và L44 (lý do / chi tiết) | Subskill L23, L35, L44 |
| A6 | Giới tính người nói được hỏi ở L37 và các cặp L45–L50; thứ tự câu hỏi trong các cặp L45–L50 | `stem` từng cặp |
| A7 | Thể loại L43–L44 (phim tài liệu) | Quy tắc L43–L44 |
| A8 | Phân bổ R05–R08 (quảng cáo sản phẩm / công ích / hướng dẫn) | Quy tắc R05–R08 |
| A9 | R20 hỏi 주제 hay 중심 생각; R22 hỏi trùng khớp hay 중심 생각 | Subskill R20, R22 |
| A10 | Thể loại R41 (giới thiệu/phê bình sách, phim) | Quy tắc R39–R41 |
| A11 | Thứ tự câu hỏi R44/R45. Dạng câu hỏi R46: thái độ tác giả, hay câu chèn `<보기>` như một số kỳ trước? **Phải chốt trước khi soạn r46-0001**, vì ảnh hưởng tới passage chung với r47-0001 | Subskill R44–R46, ngữ liệu r46-47-0001 |
| A12 | Cách chấm điểm từng phần W51–W52; chia điểm theo 3 tiêu chí ở W53–W54; xử lý phần vượt giới hạn ký tự; **số ô và số ô mỗi dòng của khung 원고지 câu 53 và 54 trên phiếu trả lời PBT** (công thức ở §5.7 đang giả định 20 ô/dòng, khung 300/700 ô) | `scoring_notes_vi`, `lib/writing`, giới hạn mềm §4.6 |
| A13 | Các kiểu đề W53 gần đây (xu hướng, so sánh, quá trình, ưu nhược điểm) | Quy tắc W53 |
| A14 | Dạng câu, số câu, thời gian của TOPIK IBT và mã hoá các dạng chỉ có ở IBT | `question_types` của IBT |
| A15 | Hệ số tốc độ TTS theo engine được chọn | `tts_notes` |

---

## Phụ lục B · Lịch sử thay đổi

### v0.3.1 · 2026-10-23

- §5.1: thêm tiểu mục **"Định dạng file đề thi"** (đường dẫn, bảng trường, ví dụ, ràng buộc, lệnh nhóm), chép từ khối tài liệu ở đầu `lib/exam/source.ts` và chuyển sang Markdown. Thay câu "định dạng file đề do backend-engineer chốt cùng script import". Ví dụ không còn ghi `duration_sec` như giá trị mặc định: trường này chỉ là ghi đè tuỳ chọn, bỏ trống thì lấy thời gian của blueprint. Không đổi quy tắc soạn câu hỏi nào, không file nội dung nào phải sửa.
- §5.1 ↔ code: comment đầu `lib/exam/source.ts` đã bỏ ví dụ `duration_sec: 900` cho khớp spec (main session sửa theo báo cáo duyệt `content/_reviews/2026-10-23-mini-doc-01.md`).
- §5.10 ví dụ A (R19): sửa `stem` thành `(   )에 들어갈 알맞은 말을 고르십시오.` cho khớp bảng `stem` ở §4.5 (vẫn chờ đối chiếu A4). Ví dụ chỉ để minh hoạ, không ảnh hưởng file nội dung. r19-0001 đã dùng đúng `stem` theo §4.5.

### v0.3 · 2026-10-20

Cập nhật theo hai lượt duyệt lại spec v0.2: mục "Duyệt lại — 2026-10-20 (spec v0.2)" trong `content/_reviews/2026-10-19-mau-viet-va-spec.md` (6 FIX mới), mục "Duyệt cuối — 2026-10-20 (spec v0.2)" trong `2026-10-19-mau-doc.md`, và góp ý của reviewer Nghe.

**Đã áp dụng**
- §4.1:
  - Tiêu đề đổi thành "Quy tắc chung". Phần **Tiếng Hàn** (맞춤법, 띄어쓰기, 제43항…) và **Lỗi AI** áp dụng cho mọi dạng, kể cả Viết. Phần Cấu trúc và Phương án nhiễu chỉ áp dụng cho trắc nghiệm.
  - Quy tắc phân bố nhãn và chu kỳ: **bắt buộc với đề lắp ráp** (script lắp đề chặn); với lô soạn chỉ là khuyến nghị (validator cảnh báo).
- §4.2:
  - Thêm khung `explanation_vi` riêng cho Viết: Phân tích đề → Dàn ý → Lưu ý → Đáng chú ý. Khung "Đáp án ②" chỉ dùng cho trắc nghiệm.
  - "Đáng chú ý" của Viết tối đa 8 mục, bắt buộc gạch đầu dòng, không lặp `expression_bank`. Trắc nghiệm vẫn 1–3 mục, được viết trên một dòng ngăn bằng " · " hoặc thành danh sách. Giữ cả hai cách để các file mẫu đang dùng " · " (ví dụ lô Đọc) không phải sửa lời giải (sửa lời giải sẽ kéo theo duyệt lại).
  - Phân biệt **bạn giả hoàn toàn / bạn giả một phần**, có mẫu ghi riêng. Bạn giả một phần phải nêu cả nghĩa trùng. Cách ghi khớp trường `false_friend` của `words`.
  - **Cảnh báo chính tả/dùng từ** phải dẫn được mục từ 표준국어대사전 và chỉ dùng khi một cách thật sự sai. Hai cách đều đúng thì viết thành so sánh sắc thái.
  - **Chữ Hán đa âm** (好, 樂, 惡, 着, 率, 行, 數…): ghi âm quen dùng theo từ, chú thích khi âm theo nghĩa khác (ví dụ 동호회 同好會). Âm Hán Việt lưu theo từ trong `words.han_viet`, không suy ra từ `hanja_syllables`.
- §3.2 ghi chú R46: nếu chốt R46 là câu chèn câu thì đổi subskill sang `insert_sentence`, áp ngoại lệ trap và thêm `stem` (gợi ý PASS của reviewer).
- §4.5 và §5.2: đề lắp ráp **luôn ẩn `stem` của câu đơn** và chỉ in lệnh nhóm từ cấu hình, không so khớp chuỗi. Nhờ vậy các lệnh biến thể của R09–R12 đứng riêng không bị in hai lần.
- §4.6: miễn quy tắc "hai bài mẫu không lặp câu" cho câu giới thiệu khảo sát theo khuôn của W53. Vì vậy câu 1 của hai cấp ở w53-0001 giữ nguyên, `char_count` 240/272 **không đổi**.
- §5.10:
  - r19-0001 và l09-0001: "Đáng chú ý" theo mẫu, thêm Hán tự 能率, 總務, 故障.
  - w52-0001 và w53-0001: `explanation_vi` theo khung Viết, "Đáng chú ý" có Hán tự. w53 có thêm ví dụ bạn giả một phần (중고 / trung cổ).
  - Không đổi `text` của bài mẫu nào.
- §7.1:
  - E3 bổ sung các quy tắc mới của §4.2.
  - L1 ghi rõ phạm vi: bắt buộc với đề lắp ráp và lô phát theo thứ tự; với lô soạn theo `type_code` thì reviewer không cần ghi lại chu kỳ ở mỗi lô.
- §7.3: mẫu báo cáo có thêm phần "Nhận xét cấp lô", "Xác nhận nhanh (metadata / định dạng)" và "Đề xuất điền `reviewed_by`". Dòng "Theo:" ghi phiên bản hiện hành.
- §8.2: thêm nhóm **"Chỉ định dạng"**: chỉ đổi khoảng trắng hoặc ngắt dòng, không đổi chữ nào. Validator xác nhận văn bản giống hệt sau khi chuẩn hoá, reviewer xác nhận nhanh, không đặt lại `reviewed_by`.
- Phụ lục A12: thêm việc đối chiếu số ô và số ô mỗi dòng của khung 원고지 câu 53/54 trên phiếu PBT (gợi ý PASS của reviewer).

**Không áp dụng (có lý do)**
- Viết lại câu 1 cấp 5 của w53-0001: không cần, vì đã chọn phương án miễn trừ câu giới thiệu khảo sát theo khuôn.
- Tinh chỉnh công thức 원고지 (không làm tròn dòng cuối của đoạn cuối, gợi ý PASS): **chưa áp dụng**. Giữ công thức làm tròn để có biên an toàn, chờ A12 đối chiếu khung thật. Nếu áp dụng thì phải sửa đồng thời giới hạn mềm.
- Cảnh báo khoảng trắng kép trong các trường một dòng (gợi ý PASS): **chưa áp dụng**, để backend cân nhắc khi viết validator. Không ảnh hưởng tới quy ước soạn.
- Các gợi ý không bắt buộc ở từng file (w53-0002, w54-0002, r07, r10, r47…): thuộc nội dung file, không thuộc spec.

**File nội dung bị ảnh hưởng bởi v0.3**
- Không có file nào **bắt buộc** sửa. Cách ghi " · " của trắc nghiệm vẫn hợp lệ.
- w53-0002 và w54-0002: `explanation_vi` nên theo khung Viết mới. Nếu hiện chưa theo khung thì sửa ở lần chỉnh nội dung tiếp theo (là thay đổi nội dung, phải duyệt lại). "Đáng chú ý" của w54-0002 đang có 2 mục trùng `expression_bank`, cần bỏ theo quy tắc mới (reviewer đã gợi ý).
- Các cảnh báo bạn giả một phần (r07 예방, r47 분해하다) và cảnh báo 계발/개발 (r10) nên viết lại theo mẫu mới. r10 là FIX sẵn có của reviewer.

### v0.2 · 2026-10-20

Cập nhật theo ba báo cáo duyệt: `content/_reviews/2026-10-19-mau-viet-va-spec.md` (phần B), `2026-10-19-mau-doc.md` và `2026-10-19-mau-nghe.md` (phần "Góp ý cho spec").

**Đã áp dụng**
- §2.2:
  - Miễn quy tắc ≥2 kiểu bẫy cho `fill_blank_connector`, `sentence_order`, `insert_sentence`. Bù lại, `note_vi` phải nêu quan hệ logic hoặc mối nối cụ thể.
  - Thêm trap **`concession_point`** cho ý nhượng bộ và quan điểm được trích dẫn rồi phản bác.
  - Thu hẹp `speaker_swap` (chỉ cho người có mặt) và `true_not_main` (chỉ cho ý của chính tác giả).
- §3: L46 độ khó 5–6, nhãn 6 cần ít nhất 2 nhiễu bám vào chi tiết có thật. Ghi chú R20/R22/R44–R46 có thể đổi giữa các kỳ, và R46 có thể là câu chèn câu.
- §4 (đầu mục): độ dài transcript không tính nhãn người nói.
- §4.1:
  - Cấm chu kỳ lặp nhãn đúng. Script lắp đề nên xáo thứ tự câu.
  - Đơn vị sau chữ số được viết liền hoặc cách (맞춤법 제43항), nhưng phải thống nhất.
- §4.2: chuẩn hoá mục "Đáng chú ý" (Hán tự – âm Hán Việt – nghĩa, cảnh báo bạn giả).
- §4.3:
  - Miễn quy tắc "không dồn căn cứ ở câu cuối" cho L04–L08.
  - Đơn thoại được viết nhiều dòng cùng nhãn.
  - Chuẩn phát âm là 표준 발음법.
  - Xưng hô `transcript_vi` theo `age_range`, nhất quán với lời giải.
- §4.4: lệnh chung L01–L03 "그림 또는 그래프". Stem L27 "남자가 말하는 의도로…", L29 "남자가 누구인지…". Tranh L01–L02 chỉ khác ở yếu tố có trong audio. Bài giảng có phân loại phải gọi tên đủ từng loại.
- §4.5:
  - Lệnh R09–R12. R10 không lặp tiêu đề biểu đồ.
  - Quy tắc câu mở đầu và mối nối sai cho R13–R15.
  - Lệnh R23/R42 dùng `'<인물>'`, lệnh R43, bảng `stem` các cặp Đọc.
  - `concession_point` cho R35–R38.
- §4.6:
  - W53 chỉ viết triển vọng khi dữ liệu có khối 전망. Không đổi nghĩa nhãn dữ liệu. Phân biệt mũi tên thời gian với mũi tên nhân quả.
  - W54: được dùng lại từ khoá, không cần tiêu đề, thêm lỗi vượt 700 ký tự và lạm dụng `-는 것 같다`.
  - Giới hạn mềm cho bài mẫu (W53 ≤ 290 ký tự/300 ô, W54 ≤ 680/700). Hai bài mẫu không được lặp câu.
- §5.2:
  - Đúng 1 `genre:`. Quy tắc `stem` cho câu đơn và câu trong bộ.
  - Quy ước ngăn đoạn: mỗi dòng một đơn vị, không dòng trống, không thụt đầu dòng.
  - Ghi rõ chỉ người dùng điền `reviewed_by`.
- §5.3:
  - `passage` tuỳ chọn với R10.
  - **`chart_data` luôn là list**, có thêm `caption`. Định nghĩa `unit`/`y`, pie cộng 100 (±1), cấu trúc `table`.
- §5.4: `age_range` ∈ `teen`, `20s`, `30s-40s`, `50s`, `60s+`.
- §5.7: quy tắc khoảng trắng (validator báo lỗi), công thức ước tính ô 원고지.
- §5.9: thêm lỗi 13–15 (tag, khoảng trắng, trap) và các cảnh báo mới.
- §5.10:
  - L09: dùng stem đầy đủ.
  - w52-0001: sửa đáp án ㉡ thứ 3, thêm "더 피곤해진다" vào `accepted_answers`, thay "피곤하다" ở `partial_answers` bằng "좋지 않다".
  - w53-0001: bỏ suy diễn "nguyên nhân tăng" và sửa nghĩa mũi tên. **`char_count` đếm lại: cấp 4 = 240** (42 + 73 + 81 + 41 + 3), **cấp 5 = 272** (42 + 91 + 86 + 50 + 3; thêm `한편`). Thêm "각 연도" và `caption`.
  - w54-0001: ghi rõ là khối placeholder, đổi thành YAML hợp lệ.
- §6:
  - Thêm genre `sentence`, `campaign`, `edu-program`, `expert-talk`. Bỏ `talk-show`, `chart`.
  - Thêm danh sách đóng `setting:` (tuỳ chọn, tối đa 1).
  - `topic:`/`genre:`/`setting:` đều là danh sách đóng.
- §7.1: cập nhật B2, E3, G2, H2–H4, W1–W2. Thêm nhóm L (cấp lô).
- §8.2: chỉ người dùng điền `reviewed_by`. Bảng phân biệt thay đổi metadata (không cần duyệt lại) với thay đổi nội dung (đặt lại `reviewed_by: null`).
- Phụ lục A: mở rộng A4 (các lệnh đề dựa vào trí nhớ) và A11 (R46).

**Không áp dụng hoặc áp dụng khác đề xuất (có lý do)**
- Mở rộng `speaker_swap` sang "quan điểm được trích dẫn" (góp ý Nghe số 6): **không áp dụng**. Thay vào đó tách thành `concession_point`, gộp với góp ý Đọc số 4. Như vậy một mã dùng chung cho cả Nghe và Đọc, thống kê điểm yếu không bị chia đôi.
- Tên genre `educational-program` / `dialogue-talk` (góp ý Nghe số 2): dùng `edu-program` / `expert-talk` như đề xuất ở báo cáo Viết–spec (B2-7). Hai tên này ngắn hơn và nghĩa rõ hơn.
- `setting:` là giá trị tự do (một phương án trong góp ý Nghe số 3): **không áp dụng**. Chọn danh sách đóng để thống kê không phân mảnh. `laundry` và `sports-center` ánh xạ sang `store` và `gym`. `museum` được thêm vào danh sách.
- Kéo dài ví dụ R19 lên khoảng 250 ký tự (gợi ý không bắt buộc): **không áp dụng**. Đây là ví dụ minh hoạ schema, độ dài khoảng 200 ký tự vẫn trong biên 30%.
- Sửa `.claude/agents/topik-content-reviewer.md` và `topik-content-designer.md` (mục B2-11): **không sửa**, vì nằm ngoài vùng file của content-designer. Spec ghi rõ chỉ người dùng điền `reviewed_by` và spec được ưu tiên. Việc sửa file agent là của người dùng.
- Thay đổi chỉ ở metadata (góp ý Đọc số 6): áp dụng, mở rộng thêm `subskill` và `difficulty` vào nhóm metadata. Kèm điều kiện reviewer xác nhận nhanh trong báo cáo kế tiếp.

**Các file nội dung hiện có cần cập nhật theo v0.2** (đều là thay đổi metadata hoặc định dạng, trừ những dòng ghi khác):
- `age_range: 50s+` không còn hợp lệ: l01-0001, l26-0001, l38-0001 → đổi thành `50s` hoặc `60s+` theo vai. Thay đổi này có thể kéo theo việc soát lại xưng hô trong `transcript_vi` (là nội dung, cần duyệt lại nếu sửa).
- `genre:talk-show` → `genre:edu-program`: l38-0001.
- `setting:laundry` → `setting:store` (l01-0001); `setting:sports-center` → `setting:gym` (l11-0001).
- `genre:advertisement` → `genre:campaign`: r07-0001 (quảng cáo công ích).
- r10-0001:
  - `chart_data` chuyển sang list một phần tử;
  - chuyển dòng nguồn/đối tượng từ `passage` sang `chart_data[0].caption`;
  - bỏ `passage` (vì đang lặp tiêu đề).
  Bỏ `passage` là thay đổi nội dung hiển thị, nên đặt lại `reviewed_by` nếu đã điền.
- w53-0002: kiểm tra `chart_data` đã là list, `unit`/`y` đúng định nghĩa mới, có thể thêm `caption`.
- w54-0002: bài cấp 6 đã được rút từ 670 xuống **660 ký tự**, ước tính khoảng 700 ô 원고지, nay **đạt** giới hạn mềm (≤ 680 ký tự và ≤ 700 ô). Vì đây là sửa nội dung nên phải duyệt lại.
- `trap` nên đổi sang `concession_point`: r35-0001 ②, l46-0001 ④. Kiểm tra thêm các phương án `true_not_main`/`speaker_swap` khác (ví dụ l31-0001) xem có phải quan điểm nhượng bộ hoặc được trích dẫn không.
- `genre:sentence` của r01-0001, r03-0001 nay đã hợp lệ. Không cần sửa file.
- Tất cả file Nghe: được phép (không bắt buộc) tách đơn thoại dài thành nhiều dòng cùng nhãn. Nếu tách thì `transcript_vi` phải tách theo, và đây là thay đổi nội dung.
- Tất cả file: chạy validator mới để bắt lỗi khoảng trắng (mục 5.7) và lỗi tag (mục 5.9, lỗi 13).

**Chỉnh sửa bổ sung trong v0.2 (sau khi chạy validator theo v0.2)**
- §5.9 lỗi 14: chỉ áp dụng cho các trường theo quy ước ngăn đoạn (`passage`, `transcript_ko`, `transcript_vi`, `task`, `model_answers[].text`). Các trường markdown như `explanation_vi`, `scoring_notes_vi` được phép có dòng trống.
- Giới hạn mềm ô 원고지 của W54 nới từ ≤ 690 lên **≤ 700 ô** (vừa khung), sửa đồng bộ ở §4.6, §5.7, §5.9, §7.1 W1, ví dụ w54 ở §5.10 và Phụ lục B. Lý do: công thức đã làm tròn lên theo từng đoạn, nên bài 4 đoạn khoảng 640 ký tự đã ước ra khoảng 700 ô. Nếu giữ ≤ 690 thì gần như mọi bài 4 đoạn đều bị cảnh báo dù vẫn vừa khung. Giới hạn ký tự ≤ 680 của W54 và giới hạn của W53 (≤ 290 ký tự, ≤ 300 ô) giữ nguyên.

### v0.1 · 2026-10-19
Bản đầu tiên: quy ước mã dạng, taxonomy L01–W54, danh mục subskill và trap, quy tắc biên soạn, schema YAML, tags, checklist, bản quyền và quy trình.
