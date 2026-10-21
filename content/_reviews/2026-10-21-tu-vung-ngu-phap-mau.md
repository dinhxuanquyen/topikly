# Duyệt từ vựng & ngữ pháp mẫu — 2026-10-21

Phạm vi:
- docs/vocab-grammar-spec.md v0.1 (mục "spec").
- content/topik-ii/vocab/{society,environment,economy,workplace,education,health,general}.yaml (v-00001 … v-00052) và vocab/_hanja-syllables.yaml (87 dòng).
- content/topik-ii/grammar/g-0001 … g-0010 và grammar/groups/{nguyen-nhan-ket-qua-xau,phong-doan-dua-vao-quan-sat,nhuong-bo-cho-du}.yaml.

Theo: docs/vocab-grammar-spec.md v0.1 (§3–§6, §9, §10). Đối chiếu thêm docs/content-spec.md v0.3 (§4.2, §6, §7.2, §8.2) và lib/db/schema/content.ts.
Người duyệt: topik-content-reviewer, độc lập với người soạn (hanviet-lexicographer).
Tổng: 67 mục (52 từ, 1 bảng âm tiết, 10 điểm ngữ pháp, 3 nhóm, 1 spec) — PASS 43 · FIX 24 · BLOCKER 0

Ghi chú:
- Kiểm tra máy đã chạy trước (parse YAML, NFC/LF, id không trùng, khớp hanja/han_viet/syllables, cặp (ko, hanja) có trong bảng). Báo cáo này chỉ xét chất lượng chuyên môn.
- Đã soát **từng** chữ Hán (dạng chữ chuẩn Hàn: 敎, 汚, 産, 獎, 爭, 增…) và từng âm Hán-Việt của 45 từ Hán-Hàn. Không có chữ sai hay âm sai, trừ trường hợp 資 (v-00009) và hai `alt_hv` trong bảng âm tiết.
- Với mỗi điểm ngữ pháp: đã kiểm từng ràng buộc, đọc từng ví dụ, và thử "bảo vệ" từng `non_examples` (tức xem câu có đúng trong một ngữ cảnh nào khác không). Câu nào bảo vệ được thì không phải câu sai thật và được ghi FIX.
- Bản quyền: đã tìm nguyên văn một số ví dụ đặc trưng trên web ("자원이 부족한 나라일수록 기술 개발이 중요하다", "그는 어려운 환경을 극복하고 의사가 되었다", "현관에 신발이 없는 걸 보니 …"). Không thấy trùng. Phần lớn ví dụ là câu sinh hoạt phổ biến, ngắn, không phải câu chữ riêng của từ điển hay sách nào. **Không có BLOCKER bản quyền.**
- Mã vấn đề:
  - [HV] chữ Hán / âm Hán-Việt
  - [FF] phân loại bạn giả
  - [LV] cấp độ
  - [EX] ví dụ / kết hợp từ
  - [NV] `note_vi` hiển thị cho người học
  - [GR] ràng buộc ngữ pháp
  - [NE] `non_examples` không sai thật
  - [GP] bảng nhóm
  - [META] metadata / refs
  - [SRC] nguồn & giấy phép

## Từ vựng

| id | kết luận | vấn đề | đề xuất sửa |
|---|---|---|---|
| v-00001, v-00003, v-00005, v-00007, v-00008, v-00010, v-00013, v-00014, v-00015, v-00016, v-00019, v-00021, v-00022, v-00023, v-00025, v-00026, v-00027, v-00028, v-00030, v-00031, v-00035, v-00036, v-00037, v-00039, v-00042, v-00043, v-00045, v-00046, v-00047, v-00048, v-00050, v-00051, v-00052 | PASS | — Hán tự, âm Hán-Việt, nghĩa, ví dụ và kết hợp từ đều đúng và tự nhiên. Các bạn giả `partial` (사고, 유행, 환경, 회의, 예방, 정보, 필요하다, 발표) và `full` (실수) phân loại đúng: mỗi mục `partial` đều nêu cả nghĩa trùng lẫn nghĩa khác. Trả lời câu người soạn nhờ kiểm: 汚 (không phải 污) và 敎 đúng dạng 표준국어대사전. 經濟 ← 經世濟民 là từ nguyên được chấp nhận rộng rãi, giữ được. 반드시 trang trọng hơn 꼭: đúng. 영양 đọc "dinh" theo âm thật của 營: đúng | (gợi ý) v-00001 사회, v-00019 회의, v-00035 실수, v-00036 필요하다, v-00045 점점, v-00013 경제: nhiều khả năng là 초급 trong krdict [cần đối chiếu], xem "Nhận xét cấp lô". (gợi ý) v-00048: thêm vào `note_vi` "Đừng nhầm với 반듯이 (ngay ngắn), cùng phát âm [반드시]." |
| v-00002 | PASS | — `null` hợp lý: "nhân khẩu" vẫn trùng nghĩa trong "nhân khẩu học", và `note_vi` đã giải thích khác biệt về phạm vi dùng. Tôi không đề nghị đánh dấu `partial` | — |
| v-00004 | PASS | — `partial` đúng. Đã nêu đồng âm 思考 | — |
| v-00006 | PASS | — | (gợi ý) [LV] 이웃 nhiều khả năng là 초급 [cần đối chiếu] |
| v-00009 | FIX | [HV][NV] `note_vi` viết "Chữ 資 trong từ này đọc 'tài'", tức dạy người học rằng 資 có âm "tài". Thực tế âm Hán-Việt của 資 là "tư" (資本 tư bản, 資格 tư cách). Từ điển Hán-Việt không ghi âm "tài" cho 資. Từ "tài nguyên" trong tiếng Việt nhiều khả năng ứng với 財源 (財 = tài) [cần đối chiếu Đào Duy Anh]. Như vậy đây là trường hợp "tiếng Việt dùng chữ khác cho cùng nghĩa", giống 장학금 / học bổng, chứ không phải chữ đa âm. Nếu giữ `alt_hv: [tài]` cho 資 thì cây hình vị sẽ dạy sai cho mọi từ khác có 資 | **Phương án khuyến nghị:** đổi `syllables[0].hv: tư`, `han_viet: tư nguyên`. Thay `note_vi` bằng: "Âm Hán-Việt là 'tư nguyên' (資 = tư, như 資本 tư bản). Tiếng Việt nói 'tài nguyên' cho cùng nghĩa, với chữ 財 (tài) khác chữ 資, nên hai âm gần nhau, dễ nhớ. Cũng đừng nhầm 자원 資源 với 자원 自願 (tự nguyện) trong 자원봉사." Bỏ `tài` khỏi `alt_hv` của 資 trong bảng âm tiết, và sửa ví dụ ở spec §4. **Nếu người dùng muốn giữ "tài nguyên"** (theo content-spec §4.2 "âm quen dùng") thì ít nhất phải bỏ câu "Chữ 資 trong từ này đọc 'tài'" và ghi rõ "tài" chỉ là cách nói quen của riêng từ này. Việc chọn phương án là của người dùng |
| v-00011 | FIX | [EX] Kết hợp từ "분리수거" không chứa 재활용, nên không phải collocation của từ này mà là từ liên quan | Thay bằng `{ ko: "재활용 쓰레기", vi: "rác tái chế" }`. Muốn giữ 분리수거 thì đưa vào `note_vi`: "Hay đi cùng 분리수거 (phân loại rác để thu gom)." |
| v-00012 | FIX | [LV] 쓰레기 là từ sơ cấp. Một bản sao dữ liệu krdict (hangulhanja.com) ghi mức "Elementary" (Vừa, chưa mở trang gốc). Chính người soạn cũng đã nghi cấp 2. Để cấp 3 sẽ làm lệch thống kê cấp độ | Đổi `level: 2`. Thêm `notes_internal`: "Hạ cấp 2 theo duyệt 2026-10-21; cần đối chiếu krdict trước khi đổi level_basis." |
| v-00017 | FIX | [EX] "수출" là từ trái nghĩa, không phải kết hợp từ; [EX] `example_vi` hơi lủng củng ("phụ thuộc vào nhập khẩu đối với phần lớn năng lượng") | Thay collocation thứ ba bằng `{ ko: "수입에 의존하다", vi: "phụ thuộc vào nhập khẩu" }`; 수출 đã có trong `note_vi`. Đổi `example_vi` thành "Phần lớn năng lượng của nước ta phải nhập khẩu." (gợi ý) Âm "du" trong `alt_hv` của 輸 [cần đối chiếu], vì Thiều Chửu chỉ ghi "thâu" |
| v-00018 | PASS | — `partial` đúng | (gợi ý) collocation "업무를 맡다": đổi `vi` thành "đảm nhận công việc" |
| v-00020 | FIX | [FF] Đánh dấu `full` trái với spec §3.5: "khứ lai" hầu như không dùng trong tiếng Việt hiện đại (chính `vi_meaning` cũng ghi "hầu như chỉ gặp trong văn chương"). Theo spec, đây là loại "tiếng Việt không dùng âm đó" giống 고장, 직장, 輸入, nên phải để `null`. Ý về 교역 (交易, trao đổi buôn bán giữa các nước) là đúng và có ích: người Việt nói "giao dịch" (交易) dễ dịch nhầm thành 교역 | `false_friend: null`. Thêm `note_vi`: "'Khứ lai' không dùng trong tiếng Việt hiện đại; nói 'giao dịch', 'làm ăn' (거래처 = đối tác làm ăn). Ngược lại, 'giao dịch' tiếng Việt viết bằng chữ 交易, nhưng 교역 trong tiếng Hàn chủ yếu là buôn bán giữa các nước; giao dịch thông thường vẫn là 거래." Cập nhật `verification_vi` của workplace.yaml và spec §11 (14 bạn giả: 3 full, 11 partial) |
| v-00024 | FIX | [NV] "tiếng Trung và tiếng Việt hiện đại thường viết 教" không đúng: tiếng Việt hiện đại không viết chữ Hán | Thay `note_vi` bằng: "Chữ 敎 là dạng dùng trong từ điển Hàn. Tiếng Trung và phần lớn từ điển Hán-Việt in dạng 教. Hai dạng là cùng một chữ." |
| v-00029 | PASS | — `partial` đúng: y khoa Việt Nam dùng "thủ thuật" cho can thiệp nhỏ, nên có trùng một phần. Trả lời câu người soạn hỏi: không cần đổi sang `full` | — |
| v-00032 | FIX | [META] `refs` ghi `checked: true`, trong khi `notes_internal` thừa nhận chỉ "xem qua kết quả tìm kiếm, chưa mở được trang mục từ". Điều này trái spec §9.2.4 ("Không ghi checked: true nếu chưa mở nguồn"). `verification_vi` của general.yaml cũng nói quá ("có đối chiếu thật"); [META] `notes_internal` ghi "lời giải r03 đã duyệt", nhưng 대처하다 thật ra nằm trong r35-0001. Nội dung từ (đối xử, `full`) đúng và khớp r35 | Đổi thành `refs: [{ src: krdict, entry: "대처하다", checked: false, fields: [hanja] }]`, hoặc mở trang mục từ thật rồi mới để `true`. Sửa `notes_internal`: "… Đã có trong lời giải r35-0001 đã duyệt (đối xử)." Sửa câu tương ứng trong `verification_vi` của general.yaml thành: "Chưa mở trang mục từ cho mục nào; 對處 của 대처하다 chỉ thấy qua kết quả tìm kiếm krdict bản tiếng Anh." |
| v-00033 | PASS | — `full` chấp nhận được: nghĩa thông dụng của "nhận định" (đánh giá, phán đoán) không trùng "thừa nhận / công nhận" | (gợi ý) Thêm vào `note_vi`: "Đồng âm khác chữ: 인정 人情 (nhân tình) = tình người (인정이 많다 = tốt bụng, giàu tình cảm)." |
| v-00034 | PASS | — `partial` đúng. 이윤 利潤 = lợi nhuận: đúng | — |
| v-00038 | FIX | [NV] "Tiếng Việt đảo thứ tự thành 'gia tăng'" bỏ sót việc "tăng gia" vẫn có trong tiếng Việt ("tăng gia sản xuất"). Ngoài ra, ghi chú đối nghĩa "감소하다 (減少 giảm thiểu)" có thể khiến người học hiểu 감소하다 = "giảm thiểu" (chủ động làm giảm đến mức thấp nhất), trong khi 감소하다 chỉ là "giảm đi" | Thay `note_vi` bằng: "Tiếng Việt hay nói 'gia tăng' (đảo thứ tự); 'tăng gia' chỉ còn trong vài cụm như 'tăng gia sản xuất'. Đối nghĩa: 감소하다 (減少 – giảm thiểu) = giảm đi, giảm xuống; khác 'giảm thiểu' tiếng Việt (chủ động làm giảm), nghĩa này tiếng Hàn dùng 줄이다 hoặc 최소화하다." |
| v-00040 | FIX | [NV] `note_vi` nói "khắc phục" tiếng Việt "hay dùng cho lỗi hoặc hậu quả", ngầm ý nghĩa khác 극복하다. Nhưng "khắc phục khó khăn" rất thông dụng và trùng hẳn 어려움을 극복하다. Bẫy thật nằm ở chiều Việt → Hàn: "khắc phục sự cố / lỗi / hậu quả" **không** dịch bằng 극복하다. Ghi chú hiện tại không cảnh báo điều này | Thay `note_vi` bằng: "'Khắc phục khó khăn' = 어려움을 극복하다, dùng giống tiếng Việt. Nhưng 'khắc phục sự cố, lỗi, hậu quả' thì tiếng Hàn không dùng 극복하다 mà dùng 해결하다, 바로잡다, 복구하다 (khôi phục). 극복하다 chỉ dùng cho khó khăn, nghịch cảnh, giới hạn, bệnh tật." (gợi ý) Cấp 4 giữ được |
| v-00041 | FIX | [NV] Thiếu cảnh báo quan trọng nhất cho người Việt: "cung cấp" (供給) có từ cùng gốc trong tiếng Hàn là 공급 (供給 – cung cấp), nhưng 공급 thiên về cung ứng hàng hoá, năng lượng (수요와 공급). "Cung cấp thông tin / dịch vụ" phải dùng 제공하다. Người học dịch theo âm Hán-Việt sẽ viết sai thành 정보를 공급하다 | Thay `note_vi` bằng: "Tiếng Việt nói 'cung cấp' (供給); tiếng Hàn cũng có 공급 (供給 – cung cấp) nhưng chủ yếu cho hàng hoá, điện, nước (전기를 공급하다, 수요와 공급). 'Cung cấp thông tin, dịch vụ, bữa ăn' dùng 제공하다. 'Đề cung' không dùng trong tiếng Việt." |
| v-00044 | PASS | — 特 + 히 đúng cách tách | (gợi ý) [EX] collocation "특히 -(으)ㄴ/는 점" có nghĩa `vi` không khớp. Thay bằng `{ ko: "특히 눈에 띄는 점은", vi: "điều đặc biệt đáng chú ý là" }` |
| v-00049 | PASS | — | (gợi ý) [EX] collocation "오히려 -다" quá chung. Thay bằng `{ ko: "오히려 잘됐다", vi: "hoá ra lại hay" }` |

## Bảng âm tiết

| id | kết luận | vấn đề | đề xuất sửa |
|---|---|---|---|
| _hanja-syllables | FIX | [HV] 供 `alt_hv: [cống]` sai: "cống" là âm của 貢. Âm thứ hai của 供 là "cúng" (供養 cúng dường); [HV] 資 `alt_hv: [tài]`, xem v-00009; [HV] 輸 `alt_hv: [du]` [cần đối chiếu] (Thiều Chửu chỉ ghi "thâu"). Còn lại 84 dòng đúng chữ, đúng âm, `meaning_vi` hợp lý. Đã kiểm đồng âm khác chữ (社/事, 手/收/輸, 經/境/競, 認/人, 情/定, 複/服, 提/濟, 症/增) đều tách dòng đúng | `{ ko: 공, hanja: 供, hv: cung, alt_hv: [cúng], … }`. Với 資: `alt_hv: []` nếu chọn phương án khuyến nghị ở v-00009. Với 輸: giữ `du` nếu đối chiếu được, nếu không thì `alt_hv: []` kèm `notes_internal` |

## Ngữ pháp

| id | kết luận | vấn đề | đề xuất sửa |
|---|---|---|---|
| g-0001 | FIX | [EX] Ví dụ 4 "제 건강은 신경 쓰지 못했습니다": 신경 쓰다 đi với -에, viết "건강은" nghe gượng; [GR] `common_mistakes_vi` 2 viết "아이가 울느라고", chia sai ngay trong câu minh hoạ (đúng là 우느라고, theo quy tắc rụng ㄹ mà chính file đã nêu); [GR] `common_mistakes_vi` 1 nói "chỉ dùng khi chính người nói đang bận": sai, chủ ngữ có thể là ngôi thứ ba (동생은 게임하느라고 숙제를 못 했다); [GR] `other_vi` "Chủ yếu dùng trong văn nói" mâu thuẫn `register: both`, trong khi -느라 rất hay gặp trong văn viết, báo chí. Phần còn lại đúng: không -았/었-/-겠-, cùng chủ ngữ, không mệnh lệnh/đề nghị, chỉ động từ. 3 `non_examples` sai thật | Ví dụ 4 → "아이들을 돌보느라고 제 건강에는 신경을 쓰지 못했습니다." `common_mistakes_vi[1]` → "Dùng khi hai vế khác chủ ngữ (비가 오느라고, 아이가 우느라고...). Khác chủ ngữ phải dùng -는 바람에 hoặc -아/어서." `common_mistakes_vi[0]` → "Dịch máy móc 'vì' thành -느라고 cho mọi nguyên nhân. -느라고 chỉ ứng với 'vì mải (làm)...': chủ ngữ (người nói hoặc người khác) đang bận làm việc A nên không làm được việc B." `other_vi` → "Chỉ đi với động từ chỉ hành động có chủ ý, tốn thời gian hoặc công sức. Không đi với tính từ và -이다. Dùng cả văn nói lẫn văn viết; dạng rút gọn -느라 rất hay gặp (준비하느라 바쁘다). Hay gặp trong lời cảm ơn, hỏi thăm: 오시느라 수고하셨습니다." |
| g-0002 | PASS | — Ràng buộc đúng hết: chỉ động từ, luôn -는 kể cả việc đã xảy ra, khác chủ ngữ được, kết quả xấu ngoài dự tính, không mệnh lệnh/đề nghị. 바람 là 의존 명사 nên viết cách: đúng. 3 `non_examples` sai thật. Trả lời câu người soạn hỏi: -았/었는 바람에 là dạng không chuẩn, không cần nêu cho người học cấp 4 | (gợi ý) `tense_vi`: thêm "Vế sau có thể là phỏng đoán về hệ quả (갑자기 일이 생기는 바람에 못 갈 것 같아요)", để người học không hiểu "thường quá khứ" thành "chỉ quá khứ" |
| g-0003 | FIX | [GR] `tense_vi` "Vế sau … không dùng -겠-" là nói quá: phỏng đoán về hệ quả vẫn tự nhiên (비가 많이 온 탓에 길이 많이 막히겠어요 / 막힐 것 같아요). Chỉ ý chí, mệnh lệnh, đề nghị là bị loại; [GR] thiếu ngoại lệ 있다/없다 + -는 (돈이 없는 탓에, 재미없는 탓에), nên `common_mistakes_vi[1]` "-는 탓에 chỉ dành cho động từ hiện tại" là sai. [LV] Giữ cấp 4 chấp nhận được: mẫu thuộc nhóm nhiễu quen thuộc của R01–R04. Một số danh sách xếp cấp 5, nên khi đối chiếu được (b) thì theo (b) | `tense_vi` → "Vế trước dùng -는 (động từ hiện tại, thường xuyên) hoặc -(으)ㄴ / -았/었던 (quá khứ); không gắn -겠- vào trước 탓. Vế sau thường ở quá khứ hoặc hiện tại; vẫn dùng được phỏng đoán về hệ quả (-(으)ㄹ 것이다, -(으)ㄹ 것 같다), nhưng không dùng ý chí, mệnh lệnh, đề nghị." `form[1].note_vi` (A) → "Ví dụ: 좁은 탓에, 비싼 탓에. Riêng 있다/없다 (kể cả 재미있다, 맛없다) dùng -는: 돈이 없는 탓에." `common_mistakes_vi[1]` → "Chia sai với tính từ: tính từ là -(으)ㄴ 탓에 (좁은 탓에), không phải -는 탓에. -는 chỉ dành cho động từ hiện tại và 있다/없다 (돈이 없는 탓에)." |
| g-0004 | FIX | [GR] **Sai kiến thức:** -(으)ㄹ 모양이다 là dạng chuẩn để đoán việc sắp xảy ra (하늘이 흐린 걸 보니 비가 올 모양이다). 표준국어대사전 (mục 모양, nghĩa suy đoán) ghi cấu trúc "-은/-는/-을 모양이다" [cần đối chiếu nguyên văn]. Vậy `common_mistakes_vi[3]` đang dạy người học rằng một dạng đúng là lỗi; `tense_vi` và `form` thiếu dạng -(으)ㄹ. Lo ngại trong `notes_internal` của người soạn là đúng; [NE] `non_examples[1]` "이 사과는 맛있는 모양이에요" đứng một mình thì không sai (đúng khi đoán qua phản ứng của người khác). Phần "khi chính người nói đang ăn" không có trong câu. Hai `non_examples` còn lại sai thật | `form[0].attach` → "V-는 모양이다 (hiện tại) · V-(으)ㄴ 모양이다 (quá khứ) · V-(으)ㄹ 모양이다 (sắp xảy ra)"; `form[0].note_vi` → "Ví dụ: 먹는 모양이다 (có vẻ đang ăn), 먹은 모양이다 (có vẻ đã ăn), 비가 올 모양이다 (có vẻ sắp mưa)." `tense_vi` → "Hiện tại: -는 (động từ) / -(으)ㄴ (tính từ). Quá khứ: -(으)ㄴ (động từ) hoặc -았/었던 (tính từ, danh từ). Việc sắp xảy ra: -(으)ㄹ 모양이다 (하늘이 흐린 걸 보니 비가 올 모양이다)." `common_mistakes_vi[3]` → "Nghĩ rằng 모양이다 không có dạng tương lai nên đổi sang mẫu khác. Có: -(으)ㄹ 모양이다 cho việc sắp xảy ra (비가 올 모양이다); nhưng trong báo cáo, dự báo trang trọng thì -(으)ㄹ 듯하다 hợp hơn." `non_examples[1]` → `ko: "제가 직접 먹어 보니까 이 사과는 맛있는 모양이에요."`, `fix_ko: "제가 직접 먹어 보니까 이 사과는 맛있네요."`, `note_vi: "Sai: người nói đã tự ăn và biết chắc vị táo nên không dùng suy đoán. -는 모양이다 chỉ dùng khi đoán qua dấu hiệu bên ngoài (사람들이 많이 사 가는 걸 보니 맛있는 모양이에요)."` |
| g-0005 | FIX | [GR] `tense_vi` "Khác -(으)ㄴ/는 모양이다 ở chỗ dùng được -(으)ㄹ" sai, cùng lỗi gốc với g-0004. `examples[0].note_vi` "-(으)ㄴ/는 모양이다 ít dùng ở trường hợp này" cũng cần sửa; [NE] `non_examples[1]` "저는 지금 배가 고픈 듯해요" không sai về ngữ pháp, chỉ hơi vòng vo. Người Hàn vẫn nói rào đón về cảm giác của mình (좀 피곤한 듯해요). Nên thay bằng một lỗi thật mà người Việt hay mắc khi viết: tách "듯 하다". Phần còn lại tốt: phát âm [드타다] đúng, có -(으)ㄹ 듯하다 và N일 듯하다, cách dùng để nêu ý kiến dè dặt rất có ích cho W54 | `tense_vi` → "Có đủ ba thì: -는 (hiện tại), -(으)ㄴ (quá khứ), -(으)ㄹ (tương lai hoặc phỏng đoán). -(으)ㄴ/는 모양이다 cũng có -(으)ㄹ 모양이다, nhưng -(으)ㄹ 듯하다 hợp văn viết, bản tin, dự báo hơn." `examples[0].note_vi` → "-(으)ㄹ 듯하다 dự đoán tương lai, hợp bản tin và dự báo. 비가 올 모양이에요 cũng đúng nhưng nghe như lời nói thường ngày." `non_examples[1]` → `ko: "내일은 비가 올 듯 하다."`, `fix_ko: "내일은 비가 올 듯하다."`, `note_vi: "Sai 띄어쓰기: 듯하다 là một từ (보조 형용사), viết liền. Chỉ viết cách khi 듯 đứng riêng (올 듯 말 듯) hoặc là 듯이 (비가 올 듯이 흐리다)."` `subject_vi` → "Ngôi nào cũng được. Có thể dùng để nói ý kiến cá nhân một cách dè dặt (제 생각에는 ~ 듯합니다). Với cảm giác trực tiếp của chính mình (배고프다, 아프다), nói thẳng tự nhiên hơn." |
| g-0006 | FIX | [GR] `subject_vi` không nêu cách dùng rất phổ biến ở ngôi thứ nhất: người nói vừa tự nhận ra điều về chính mình (제가 잘못 들었나 봐요, 내가 많이 피곤했나 봐). Người học sẽ tưởng các câu này sai, trong khi chúng hay xuất hiện ở phần Nghe; [NV] `common_mistakes_vi[3]` coi "xem ra" là dịch sai, trong khi "xem ra" lại là một cách dịch đúng (xem ra anh ấy bận lắm = 바쁜가 봐요). Phần còn lại đúng: cách chia V/있다·없다 -나, A -(으)ㄴ가, N인가, quá khứ -았/었나. `non_examples` 1–2 sai thật; `non_examples` 3 là lỗi văn phong và đã ghi đúng như vậy | `subject_vi` → "Chủ ngữ thường là ngôi thứ ba hoặc sự vật. Không dùng cho kế hoạch, ý định hay điều người nói đã biết rõ. Ngôi thứ nhất dùng được khi người nói vừa nhận ra điều về chính mình qua dấu hiệu (제가 잘못 들었나 봐요, 내가 많이 피곤했나 봐)." `common_mistakes_vi[3]` → "Hiểu 보다 theo nghĩa 'xem, nhìn' rồi dịch thành 'tôi thấy...' như thể người nói khẳng định. Ở đây 보다 là động từ phụ trợ chỉ suy đoán: dịch 'chắc là, hình như, xem ra'." (gợi ý) `tense_vi` thêm: "Việc sắp tới trong khẩu ngữ: -(으)ㄹ 건가 보다, -(으)려나 보다 (비가 오려나 봐요)." |
| g-0007 | FIX | [EX] Ví dụ 2 "아무리 바쁘더라도 아침은 꼭 챙겨 먹어요" đọc như câu trần thuật ("tôi luôn ăn sáng"), không phải lời khuyên như `vi` và `note_vi` ("Vế sau là mệnh lệnh/đề nghị") khẳng định. Phần còn lại đúng: giả định, không -겠-, -았/었더라도 phản thực quá khứ, vế sau tự do. 2 `non_examples` sai thật | Ví dụ 2 → `ko: "아무리 바쁘더라도 아침은 꼭 챙겨 드세요."` (giữ `vi` và `note_vi`) |
| g-0008 | FIX | [NE] `non_examples[1]` "피곤한데도 일찍 주무세요" là câu vô nghĩa ngay ở ý định ("dù mệt, hãy ngủ sớm"), và `fix_ko` đổi hẳn sang ý khác. Người học không thấy được lỗi đơn thuần nằm ở chỗ có mệnh lệnh ở vế sau; [EX] Ví dụ 1 "시험 문제가 하나도 생각나지 않았다" có nghĩa là "không nhớ ra đề thi", lệch với ý "học thuộc mà lúc thi quên hết"; [NV] `body_md` lấy "그런데" làm dấu hiệu, không hợp lý (그런데 là từ nối đầu câu, không đi kèm -는데도) | `non_examples[1]` → `ko: "바쁜데도 꼭 오세요."`, `fix_ko: "바쁘더라도 꼭 오세요."`, `note_vi: "Sai: vế sau là lời mời/mệnh lệnh nên không dùng -(으)ㄴ/는데도. Nhượng bộ mà vế sau là lời khuyên, lời mời thì dùng -더라도."` Ví dụ 1 → `ko: "밤새 공부했는데도 시험 때 외운 내용이 하나도 생각나지 않았다."`, `vi: "Học suốt đêm vậy mà lúc thi tôi chẳng nhớ ra chút gì đã học thuộc."` Trong `body_md`, thay "có 그런데, 분명히, 이미 hoặc sự việc đã xảy ra" bằng "có 분명히, 이미, 벌써, 이렇게/그렇게 + tính từ, hoặc sự việc đã xảy ra" |
| g-0009 | FIX | [GR] Thiếu ràng buộc chính mà người soạn đã nhờ bổ sung: vế sau của -(으)ㄹ까 봐 **không** là mệnh lệnh hoặc đề nghị (늦을까 봐 빨리 가세요 là sai). Đây là lỗi người Việt rất hay mắc vì "sợ… nên hãy…" nói được trong tiếng Việt; [NE] `non_examples[1]` (lo mưa mà không mang ô) chỉ sai về logic, không phải lỗi dùng mẫu; [GR] thiếu cảnh báo nhầm với -(으)ㄹ까 보다 ở cuối câu với nghĩa "đang tính làm" (주말에는 집에서 쉴까 봐요). Phần còn lại đúng: -았/었을까 봐, khác chủ ngữ được, chỉ điều không mong muốn | `main_clause_vi` → "Vế sau là hành động phòng ngừa (우산을 챙기다) hoặc cảm xúc lo ngại (걱정이다, 불안하다, 무섭다), thường ở quá khứ hoặc hiện tại. Không dùng mệnh lệnh, đề nghị (늦을까 봐 빨리 가세요 → 늦을지도 모르니까 빨리 가세요)." `non_examples[1]` → `ko: "늦을까 봐 빨리 출발하세요."`, `fix_ko: "늦을지도 모르니까 빨리 출발하세요."`, `note_vi: "Sai: vế sau của -(으)ㄹ까 봐 không là mệnh lệnh hay đề nghị. Muốn khuyên dựa trên một khả năng xấu, dùng -(으)ㄹ지도 모르니까."` Thêm vào `common_mistakes_vi`: "Nhầm với -(으)ㄹ까 보다 ở cuối câu, chủ ngữ ngôi thứ nhất: 주말에는 집에서 쉴까 봐요 = 'tôi đang tính nghỉ ở nhà', không phải 'sợ'. Nghĩa 'sợ' cần có vế sau hoặc 걱정이다." Xoá câu "Hạn chế về mệnh lệnh/đề nghị ở vế sau chưa nêu…" trong `notes_internal` |
| g-0010 | FIX | [NE] `non_examples[1]` "키가 크다 보면" không chắc là sai: 크다 còn là động từ "lớn lên" (아이가 크다 보면 알게 될 거야 là câu đúng), nên người học có thể bảo vệ được câu này. Cần một tính từ không có nghĩa động từ; [GR] `variants` có -다 보니, nhưng `other_vi` "Không đi với tính từ" không đúng với -다 보니 (회사가 멀다 보니 일찍 나가야 한다 là câu tự nhiên). Phần còn lại đúng | `non_examples[1]` → `ko: "날씨가 춥다 보면 감기에 걸리기 쉬워요."`, `fix_ko: "날씨가 추우면 감기에 걸리기 쉬워요."`, `note_vi: "Sai: 춥다 là tính từ, không phải hành động lặp lại hoặc kéo dài. Dùng -(으)면."` `other_vi` → "Chỉ đi với động từ chỉ việc lặp lại hoặc kéo dài (하다, 살다, 듣다, 걷다, 만나다); -다 보면 không đi với tính từ. Riêng -다 보니 đi được với tính từ khi nêu lý do là một trạng thái (회사가 멀다 보니 일찍 나가야 한다)." (gợi ý) `non_examples[2]` "하겠다 보면" là lỗi khó gặp; có thể thay bằng "운동을 했다 보면 건강해질 거예요." → "운동을 하다 보면 건강해질 거예요." |

## Nhóm so sánh

| id | kết luận | vấn đề | đề xuất sửa |
|---|---|---|---|
| nguyen-nhan-ket-qua-xau | FIX | [GP] Phải đồng bộ với g-0001 và g-0003: hàng "Văn nói / văn viết" ghi -느라고 "Chủ yếu văn nói"; hàng "Loại từ" thiếu 있다/없다 + -는 ở -탓에; hàng "Thì" của -탓에 ghi "không -겠-" mơ hồ (vế trước hay vế sau?); `decision_tips_vi[3]` nói "việc **người nói** đang mải làm" (chủ ngữ có thể là ngôi thứ ba). Đúng và tốt: 3 tình huống đối chiếu đều chuẩn, mọi câu `ok: false` sai thật và `note_vi` bắt đầu bằng "Sai:"; bảng khớp `members`; đủ 7 tiêu chí bắt buộc. Ở tình huống 1, cả -는 바람에 lẫn -탓에 đều `ok: true`: đúng, và đây là bẫy hai-đáp-án mà người soạn đề phải biết | Hàng "Văn nói / văn viết" ô 1 → "Cả hai; dạng -느라 hay gặp cả trong văn viết". Hàng "Loại từ đi kèm" ô 3 → "Động từ, tính từ, danh từ (N인 탓에 / N 탓에); 있다/없다 dùng -는". Hàng "Thì" ô 3 → "Vế trước -는 (hiện tại) hoặc -(으)ㄴ / -았/었던 (quá khứ); không gắn -겠- trước 탓". `decision_tips_vi[3]` → "Vế trước là việc chủ ngữ đang mải làm (준비하다, 기다리다, 돌보다...) và cùng chủ ngữ với vế sau thì chọn -느라고." Thêm vào `topik_traps_vi`: "Khi soạn R01–R02: không đặt cả -는 바람에 và -(으)ㄴ/는 탓에 làm phương án nếu vế trước là động từ chỉ sự cố, vì cả hai đều đúng (hai đáp án)." (gợi ý) Tình huống 2: "옆집이 시끄럽게 떠드는" → "옆집 사람들이 시끄럽게 떠드는" |
| phong-doan-dua-vao-quan-sat | FIX | [GP][GR] Lỗi gốc của g-0004 lan sang bảng: `summary_vi` lấy "có cả thì tương lai" làm điểm riêng của -듯하다; hàng "Thì" ô 1 ghi -모양이다 không có tương lai. Cả hai đều sai vì -(으)ㄹ 모양이다 có tồn tại; [GP] hàng "Chủ ngữ", `summary_vi` và `decision_tips_vi[3]` ("loại cả ba mẫu" khi nói về cảm giác của mình) bỏ sót cách dùng tự nhận ra ở ngôi thứ nhất (내가 피곤했나 봐); [GP] tình huống 2: `note_vi` của câu -모양이다 dựa trên lý do sai ("-는 모양이다 nói về điều đang diễn ra" thì đúng, nhưng ngầm ý mẫu này không có tương lai). Ngoài ra hai câu `ok: false` mở đầu bằng "Không tự nhiên:" và "Không hợp văn phong:", trái quy ước spec §6 (phải bắt đầu "Sai:"); [GP] hàng "Dạng kết thúc" viết "-ㄴ 모양입니다" và "-ㄴ 듯합니다", không theo quy ước pattern §5.1. Đúng và tốt: phân biệt văn phong (나 보다 thân mật, 듯하다 trang trọng) chính xác; tình huống 3 (kế hoạch của mình) đúng; bẫy "-(으)ㄹ까 봐 có hình thức gần -나 봐" là quan sát hay | `summary_vi` câu cuối → "-나 보다 là khẩu ngữ thân mật, -(으)ㄴ/는 모양이다 trung tính và mô tả, -(으)ㄴ/는 듯하다 trang trọng, hợp văn viết và dự báo (-(으)ㄹ 듯하다). Cả ba đều không dùng cho kế hoạch, ý định của chính người nói. Riêng khi người nói vừa nhận ra điều về chính mình qua dấu hiệu, -나 보다 và -(으)ㄴ/는 모양이다 vẫn dùng được (깜빡 잠든 걸 보니 내가 많이 피곤했나 봐)." Hàng "Loại từ" ô 1 → "V -는/-(으)ㄴ/-(으)ㄹ · A -(으)ㄴ · N인 (있다/없다: -는)". Hàng "Chủ ngữ" ô 1 và ô 3 → "Ngôi thứ ba, sự vật; ngôi thứ nhất chỉ khi vừa tự nhận ra qua dấu hiệu (제가 잘못 들었나 봐요)". Hàng "Thì" ô 1 → "Hiện tại, quá khứ và việc sắp xảy ra (-(으)ㄹ 모양이다)"; ô 3 → "Hiện tại và quá khứ (-았/었나 보다); việc sắp tới trong khẩu ngữ: -(으)ㄹ 건가 보다, -(으)려나 보다". Hàng "Dạng kết thúc" ô 1 → "-(으)ㄴ/는 모양이에요 / -(으)ㄴ/는 모양입니다"; ô 2 → "-(으)ㄴ/는 듯해요 / -(으)ㄴ/는 듯합니다". Tình huống 2, `note_vi` của g-0004 → "Sai: có 앞으로 (tương lai) mà dùng dạng hiện tại -는 모양이다. Dạng tương lai là -(으)ㄹ 모양이다, nhưng đây là suy đoán qua dấu hiệu bên ngoài nên vẫn kém hợp với kết luận phân tích trong báo cáo; -(으)ㄹ 듯하다 tự nhiên nhất." `note_vi` của g-0006 → "Sai: -나 보다 là khẩu ngữ, không hợp báo cáo; dạng -나 봐요 ở đây cũng là hiện tại, không diễn đạt dự đoán tương lai." `decision_tips_vi[3]` → "Câu nói về kế hoạch, ý định của chính người nói thì loại cả ba mẫu (riêng việc vừa tự nhận ra về mình qua dấu hiệu thì -나 보다 / -(으)ㄴ/는 모양이다 vẫn dùng được)." |
| nhuong-bo-cho-du | FIX | [GP] `topik_traps_vi[1]` viết "-(으)ㄴ/는데도 ≈ -(으)ㄴ/는데 + vế đối lập". Câu này mâu thuẫn với chính `common_mistakes_vi[2]` của g-0008 (đừng nhầm với -(으)ㄴ/는데) và sẽ dạy người học coi -는데 là phương án tương đương. Đúng và tốt: phân biệt giả định / sự thật chính xác; 3 tình huống đều đúng, có cặp ok/không ok trong cùng ngữ cảnh; mọi `note_vi` của `ok: false` mở đầu "Sai:" | `topik_traps_vi[1]` → "R03–R04: -더라도 hay được cho cặp với -아/어도, -(으)ㄹ지라도 làm đáp án; -(으)ㄴ/는데도 hay được cho cặp với -(으)ㅁ에도 (불구하고) hoặc -아/어도 (khi vế trước là sự thật)." (gợi ý) `decision_tips_vi[3]` "Cả hai đều không gắn -겠-" chỉ cần cho -더라도; có thể bỏ phần -는데도 vì người học không gặp lỗi này |

## Spec

| id | kết luận | vấn đề | đề xuất sửa |
|---|---|---|---|
| spec (docs/vocab-grammar-spec.md v0.1) | FIX | Spec đã nhất quán với content-spec v0.3: `reviewed_by` chỉ người dùng điền, NFC/LF, danh sách `topic:` (mọi `topics` trong 7 lô đều thuộc danh sách §6), tag `grammar:` (đổi dấu cách thành `-`; TAG_FORMAT `\S+` của validator nhận `/` và `()`). Ánh xạ §7 khớp lib/db/schema/content.ts. Số liệu §11 khớp dữ liệu (52 từ, 45 Hán-Hàn / 7 thuần Hàn, 15 bạn giả 4 full / 11 partial). Mục 9 mô tả đúng và thận trọng: đã tự kiểm lại trang krdict (CC BY-SA 2.0 KR, đa phương tiện có điều kiện riêng, không thấy 공공누리), trang danh sách 2003 (5.965 từ, 982/2.111/2.872, 공공누리 Type 1), và số liệu 10.635 từ / 336 điểm của (b) (qua kết quả tìm kiếm trích 『새국어생활』 2018, mức Vừa). Không tìm được bản 2020/2022 của (b): đúng với ghi chú của spec. Các điểm cần sửa: [SRC] (c3) 우리말샘 **có** trang chính thức (opendict.korean.go.kr/service/copyrightPolicy) ghi CC BY-SA 2.0 KR, nên "không có trang chính thức / Thấp" là sai; [SRC] (c2): 공공누리 Type 1 là của tài liệu 편찬 지침, không phải nội dung từ điển, nhưng cột "Giấy phép" đặt nó lên đầu dễ khiến người đọc hiểu nhầm; [SRC] §9.2.3 chưa nói tới quyền với **cơ sở dữ liệu / tác phẩm biên tập**: từng sự thật (cấp của một từ) không được bảo hộ, nhưng chép có hệ thống thứ tự và cấp cho hàng nghìn mục từ (b) hoặc krdict có thể đụng quyền của người làm CSDL (저작권법 제93조) [cần xác nhận pháp lý]; [HV] §4 lấy 資 tư/tài và 자원 → `hv: tài` làm ví dụ mẫu, xem v-00009; §4 thiếu quy tắc 두음법칙 (流 유/류, 利 이/리, 來 래/내 là các dòng riêng); [META] §7.3.1: `words_external_id_uq` và `grammar_points_external_id_uq` là unique toàn bảng, trong khi id được đánh "theo chương trình", nên chương trình thứ hai sẽ đụng `v-00001`; [META] §8 cảnh báo "example_ko không chứa hangul bỏ -다" sẽ báo nhầm hàng loạt (복잡하다 → 복잡해서, 마련하다 → 마련해, 어울리다 → 어울려요); [GP] §6 chưa có khoá cố định cho `criterion`, nên validator không kiểm được "đủ 7 tiêu chí" và giao diện không căn hàng giữa các nhóm được (nhóm 2 dùng "Chủ ngữ", nhóm 1 và 3 dùng "Chủ ngữ hai vế"); [META] §3.2 chưa định nghĩa "đã mở nguồn" cho `checked`, dẫn tới trường hợp v-00032; [META] §5.1: các tag đã có trong câu hỏi như `grammar:-아-놓다` (l11-0001) sẽ không khớp pattern chuẩn `-아/어 놓다` | (1) §9.1 (c3): cột Giấy phép → "CC BY-SA 2.0 KR (trang 저작권 정책 của 우리말샘); văn bản có 출전 phải xin phép tác giả gốc; đa phương tiện có điều kiện riêng"; Chắc chắn → "Cao (đọc trực tiếp opendict.korean.go.kr/service/copyrightPolicy)". Giữ quyết định "Không dùng" nhưng đổi lý do thành "nội dung do người dùng đóng góp, độ tin cậy không đồng đều; ShareAlike". (2) §9.1 (c2): cột Giấy phép → "Chưa xác định. (Tài liệu 편찬 지침 — không phải nội dung từ điển — ghi 공공누리 Type 1.)"; Chắc chắn → "Thấp". (3) §9.2.3 thêm: "Ngoài từng sự thật, danh sách có chọn lọc và xếp cấp là CSDL / tác phẩm biên tập. Không sao chép có hệ thống cấp độ của (b) hoặc krdict cho phần lớn từ vựng khi chưa rõ giấy phép; `level_basis` chỉ ghi kết quả đối chiếu từng mục [cần xác nhận pháp lý]." (4) §4: đổi ví dụ đa âm thành "處 xử/xứ; 要 yếu/yêu; 營 doanh/dinh; 切 thiết/thế", bỏ 資. Thêm gạch đầu dòng: "Biến thể 두음법칙 (流 유/류, 利 이/리, 來 래/내, 女 여/녀…) là các dòng riêng với cùng `hanja`, cùng `hv`." (5) §7.3.1: thêm "unique (`program_id`, `external_id`), hoặc giữ unique toàn cục và thêm tiền tố chương trình vào id khi có chương trình thứ hai" (áp dụng cả `questions`). (6) §8: thay cảnh báo bằng "`example_ko` không chứa phần Hán của từ (theo các `ko`), hoặc với từ thuần Hàn không chứa gốc từ bỏ âm tiết cuối (어울리-→어울)". (7) §6: thêm `criterion_key` ∈ {`meaning`, `pos`, `subject`, `tense`, `main_clause`, `nuance`, `register`, `other`} bên cạnh nhãn hiển thị `criterion`; validator kiểm đủ 7 khoá đầu. Ghi rõ validator kiểm `note_vi` của `ok: false` bắt đầu bằng "Sai:". (8) §3.2 `refs.checked`: thêm "true chỉ khi đã mở trang mục từ của nguồn; thấy qua kết quả tìm kiếm thì để false và ghi ở `notes_internal`". (9) §5.1: thêm "Validator so tag `grammar:` với cả `pattern` và `variants`; tag cũ không khớp (vd. `grammar:-아-놓다`) được cảnh báo để content-designer đổi theo pattern chuẩn." |

## Nhận xét cấp lô

- **Hán tự & âm Hán-Việt:** chất lượng cao. 45/45 từ Hán-Hàn đúng chữ và đúng dạng chữ chuẩn Hàn; các âm khớp lời giải đã duyệt (對處 đối xử, 豫防 dự phòng). Ngoại lệ duy nhất cần người dùng quyết định là 資源 (v-00009), cùng 2 `alt_hv` trong bảng âm tiết.
- **Bạn giả:** 15 mục đã đánh dấu. Có 14 mục phân loại đúng; 거래 (v-00020) nên chuyển về `null`. Sau khi sửa vẫn còn 14 bạn giả thật, trong đó nhiều mục rất đáng dạy (대처하다, 실수, 인정하다, 정보, 환경, 수술, 필요하다), vượt xa yêu cầu ≥5.
  - Xu hướng cần bổ sung là **bạn giả chiều Việt → Hàn**: người Việt dịch từ Hán-Việt quen thuộc sang từ Hàn cùng gốc và dùng sai ("khắc phục sự cố" → 극복, "cung cấp thông tin" → 공급, "giảm thiểu" → 감소). Spec §3.5 chỉ định nghĩa chiều Hàn → Việt. Xem góp ý số 1.
- **Cấp độ:**
  - Tất cả `level_basis: editor`, đúng là trung thực.
  - Phân bố 3/4 hợp lý cho TOPIK II, nhưng một số từ để cấp 3 nhiều khả năng là 초급 trong krdict (쓰레기 đã thấy mức "Elementary" qua bản sao dữ liệu; 이웃, 사회, 회의, 실수, 필요하다, 점점, 특히, 경제 [cần đối chiếu]). Nếu MVP muốn "1.500 từ cấp 3–4" thì các từ sơ cấp nên tách sang lô cấp 1–2 hoặc ghi rõ cấp thật, để thống kê không bị lệch.
- **Ví dụ & kết hợp từ:** tự nhiên, đúng 띄어쓰기 (đã kiểm các từ ghép 교통사고, 가정환경, 천연자원, 면접시험, 경쟁력, 재활용품…). Có 2 collocation thực ra là từ liên quan (분리수거, 수출).
- **Ngữ pháp:**
  - Khung giải thích tốt và đúng trọng tâm người Việt (mẹo "mải", "chẳng may", "tại"). Bảng nhóm 1 và 3 chính xác.
  - Lỗi tập trung ở ba chỗ:
    - (a) Một lỗi kiến thức lan qua 3 file: cho rằng -모양이다 không có dạng -(으)ㄹ.
    - (b) Các `non_examples` "sai nhờ ngữ cảnh ngầm" hoặc "sai về logic" chứ không sai về ngữ pháp (g-0004, g-0005, g-0008, g-0009, g-0010). Người học bảo vệ được những câu này, nên chúng không dùng được làm câu sai mẫu.
    - (c) Bỏ sót ràng buộc vế sau của -(으)ㄹ까 봐.
  - Nên quy định thêm: `non_examples` phải sai **ngay trên câu chữ**; nếu cần ngữ cảnh thì đưa ngữ cảnh vào `ko`.
- **Bản quyền:** không phát hiện sao chép. Các `meaning_vi` ngắn, tự viết, không có dấu hiệu dịch định nghĩa krdict. Khuyến nghị: trước khi soạn hàng loạt, không dùng nguyên câu ví dụ của krdict làm "khuôn" (vì ShareAlike), đúng như spec §9.2 đã ghi.

## Góp ý cho spec

1. **[§3.5] Bạn giả chiều Việt → Hàn.** Thêm hướng dẫn: khi từ Hán-Việt tiếng Việt có từ Hàn cùng gốc nhưng khác phạm vi dùng (cung cấp/공급, khắc phục/극복, giảm thiểu/감소, giao dịch/교역), ghi cảnh báo vào `note_vi` của từ Hàn đúng. Nếu cần lọc trên giao diện thì thêm trường tuỳ chọn `vi_to_ko_trap: [{vi, wrong_ko, note_vi}]`.
2. **[§5] `non_examples` phải sai ngay trên câu chữ.** Không dựa vào ngữ cảnh ngầm hay lỗi logic nội dung. Nếu cần ngữ cảnh thì viết luôn vào `ko` (ví dụ "제가 직접 먹어 보니까 …").
3. **[§6] Khoá tiêu chí `criterion_key`** và quy tắc "Sai:" cho `ok: false` (xem dòng spec).
4. **[§4] Quy tắc 두음법칙** và bỏ 資 khỏi ví dụ chữ đa âm (xem dòng spec, v-00009).
5. **[§9] Cập nhật 우리말샘, 표준국어대사전, và quyền CSDL** (xem dòng spec).
6. **[§3.1] Duyệt theo lô.** `reviewed_by` ở gốc lô áp cho mọi từ, nên khi người dùng điền cho một lô còn từ FIX, các từ đó phải mang `reviewed_by: null` riêng. Spec đã nói "giá trị riêng thắng" nhưng nên ghi thành quy trình: "Người dùng chỉ điền `reviewed_by` ở gốc lô khi mọi từ trong lô PASS; nếu không, điền ở từng từ."
7. **[§7.3, §8] id theo chương trình và cảnh báo ví dụ** (xem dòng spec).

## Đề xuất điền `reviewed_by`

Theo yêu cầu của người điều phối, báo cáo này **không** đề xuất điền `reviewed_by`. Danh sách PASS ở các bảng trên chỉ để người dùng tham khảo. Việc điền là của người dùng; reviewer và agent soạn không điền.

Lưu ý khi người dùng quyết định:
- Các lô `vocab/*.yaml` hiện để `reviewed_by` ở gốc lô. Lô nào còn từ FIX (environment, economy, workplace, education, general) thì không nên điền ở gốc cho tới khi đã sửa và duyệt lại, hoặc phải đặt `reviewed_by: null` riêng cho từ FIX.
- g-0001, g-0003, g-0004, g-0005, g-0006 thuộc nhóm so sánh: sửa điểm nào thì xem lại bảng nhóm tương ứng (spec §10).

> Các mục kết luận ở trên đã được thay bằng mục "Duyệt lại lượt 2 — 2026-10-21" bên dưới.

---

## Duyệt lại lượt 2 — 2026-10-21

Phạm vi: cả 21 file sau khi hanviet-lexicographer sửa 24 mục FIX, và docs/vocab-grammar-spec.md v0.2.
Kiểm tra máy (do điều phối chạy): 21 file parse YAML được, 52 từ khớp bảng 87 âm tiết, mọi `reviewed_by` vẫn `null`.

Cách duyệt:
- Đọc lại **toàn văn** mọi file có mục FIX. Gồm 5 lô từ: environment, economy, workplace, education, general.
- Đọc lại bảng âm tiết, 9 điểm ngữ pháp FIX, 3 file nhóm và các mục spec liên quan.
- Đọc lại g-0002 (PASS, có áp dụng gợi ý).
- Lô society và health không có mục FIX: soát nhanh nghĩa, bạn giả, `note_vi` và cấp, không có gì thay đổi hay hỏng.
- Ở mỗi `non_examples` mới, thử bảo vệ lại câu bằng một ngữ cảnh khác. Ở mỗi bảng nhóm, đối chiếu từng ô với ràng buộc của điểm tương ứng.
- Tóm tắt của người soạn chỉ dùng để biết chỗ cần soát, không dùng làm căn cứ.

Tổng sau lượt 2: 67 mục — **PASS 65 · FIX 2 · BLOCKER 0**

| id | kết luận lượt 2 | ghi chú |
|---|---|---|
| v-00009 | PASS | Đã theo phương án khuyến nghị: `han_viet: tư nguyên`, `hv: tư`. `note_vi` dùng đúng nguyên văn đề xuất, có nêu "tài nguyên" và chữ 財. `notes_internal` ghi rõ [cần đối chiếu] và cách quay lại nếu người dùng muốn giữ "tài nguyên". `verification_vi` của lô đã cập nhật. Việc chọn phương án vẫn là của người dùng (xem danh sách [cần xác nhận]) |
| v-00011 | PASS | Collocation 3 → "재활용 쓰레기"; 분리수거 chuyển vào `note_vi` đúng câu đề xuất |
| v-00012 | PASS | `level: 2`, có `notes_internal` đúng như đề xuất |
| v-00017 | PASS | Collocation "수입에 의존하다" và `example_vi` mới đều tự nhiên. Đã bỏ `du` khỏi 輸 và ghi lý do |
| v-00020 | PASS | `false_friend: null`, `note_vi` đúng nguyên văn đề xuất. `verification_vi` của workplace.yaml và spec §11 (14 bạn giả: 3 full, 11 partial) đã cập nhật. Đếm lại trên dữ liệu: full = 대처하다, 인정하다, 실수; partial = 사고, 유행, 환경, 업무, 회의, 수술, 예방, 정보, 이익, 필요하다, 발표. Khớp |
| v-00024 | PASS | `note_vi` đúng nguyên văn đề xuất |
| v-00032 | PASS | `checked: false`; `notes_internal` ghi r35-0001; `verification_vi` của general.yaml không còn nói quá. Đúng định nghĩa `checked` mới ở spec §3.2 |
| v-00038 | PASS | `note_vi` đúng nguyên văn đề xuất |
| v-00040 | PASS | `note_vi` đúng nguyên văn đề xuất; `notes_internal` cập nhật |
| v-00041 | PASS | `note_vi` đúng nguyên văn đề xuất, có cảnh báo 공급 / 제공 |
| _hanja-syllables | PASS | 供 `alt_hv: [cúng]`. 資 `alt_hv: []` và 輸 `alt_hv: []`, mỗi dòng có `notes_internal` nêu lý do, đúng spec §4 ("chữ có âm chưa chắc: ghi `notes_internal` ở dòng đó"). Vẫn 87 dòng; 3 dòng sửa không làm hỏng khớp `hv` của từ nào (자원 dùng `tư`, 수입 輸入 dùng `thâu`, 제공하다 dùng `cung`) |
| 42 từ PASS lượt 1 | PASS | Không bị hỏng. Các gợi ý đã được áp dụng đúng: v-00018 ("đảm nhận công việc"), v-00033 (đồng âm 人情), v-00044 ("특히 눈에 띄는 점은"), v-00048 (반듯이), v-00049 ("오히려 잘됐다"). Chấp nhận việc **không** đổi cấp của v-00001, v-00006, v-00013, v-00019, v-00035, v-00036, v-00045 (điểm khác đề xuất số 1): lượt 1 tôi chỉ ghi là gợi ý [cần đối chiếu], và `level_basis: editor` vẫn trung thực. Đưa vào danh sách [cần xác nhận] |
| g-0001 | PASS | Cả 4 chuỗi thay thế đã áp dụng đúng nguyên văn ("건강에는 신경을", "우느라고", "chủ ngữ (người nói hoặc người khác)", `other_vi` mới). `body_md` thêm ví dụ ngôi thứ ba (동생은 게임하느라고 숙제를 못 했다), đúng ngữ pháp. Phần còn lại không đổi |
| g-0002 | PASS | Đã áp dụng gợi ý cho `tense_vi` (phỏng đoán về hệ quả), đúng ngữ pháp. Không phát sinh lỗi |
| g-0003 | PASS | `tense_vi`, `form[1].note_vi`, `common_mistakes_vi[1]` đúng nguyên văn đề xuất. Ràng buộc nay khớp bảng nhóm |
| g-0004 | PASS | `form[0]`, `tense_vi`, `common_mistakes_vi[3]`, `non_examples[1]` đúng nguyên văn đề xuất. `body_md` thêm "việc sắp xảy ra -(으)ㄹ", khớp. Thử bảo vệ `non_examples[1]` mới: không được, vì "제가 직접 먹어 보니까" đã xác lập người nói biết chắc. Chấp nhận điểm khác đề xuất số 5 (chỉ thêm -(으)ㄹ ở dòng động từ): A-(으)ㄹ 모양이다 và N일 모양이다 rất ít dùng, không cần dạy ở cấp 4. Bảng nhóm cũng ghi "A -(으)ㄴ · N인", nhất quán. (gợi ý) `subject_vi` vẫn ghi "không dùng cho … cảm giác trực tiếp của chính người nói", còn ngoại lệ "tự nhận ra" nằm ở `other_vi`. Có thể nối thêm vào cuối `subject_vi`: "(trừ khi vừa tự nhận ra qua dấu hiệu, xem other_vi)" cho khớp bảng nhóm. Không bắt buộc |
| g-0005 | **FIX** | Các mục lượt 1 đã sửa đúng: `tense_vi`, `examples[0].note_vi`, `non_examples[1]` (lỗi 띄어쓰기 "올 듯 하다", thử bảo vệ không được), `subject_vi`. **Lỗi mới phát sinh:** `common_mistakes_vi[4]` (mục vừa thêm) có ký tự thừa "ㅇ": "Viết tách 'ㅇ 듯 하다' như hai từ riêng." Chuỗi này hiển thị cho người học | Thay `common_mistakes_vi[4]` bằng: "Viết tách '듯 하다' như hai từ riêng. 듯하다 là một từ, viết liền (올 듯하다)." |
| g-0006 | PASS | `subject_vi`, `common_mistakes_vi[3]` đúng nguyên văn đề xuất; `tense_vi` đã thêm -(으)ㄹ 건가 보다 / -(으)려나 보다, đúng. Về điểm khác đề xuất số 3 (giữ `non_examples[2]` là lỗi văn phong, `note_vi` mở đầu "Không hợp văn phong:"): chấp nhận về nguyên tắc, nhưng spec phải nhất quán (xem dòng spec). (gợi ý) Theo quy tắc mới ở spec §5 ("không bảo vệ được bằng ngữ cảnh khác"), câu "이번 사업의 성공 여부는 불투명한가 봅니다." vẫn có thể bảo vệ được trong lời nói trang trọng (họp, phát biểu). Nên đưa ngữ cảnh văn bản vào `ko`: `ko: "조사 결과에 따르면 이번 사업의 성공 여부는 불투명한가 봅니다."`, `fix_ko: "조사 결과에 따르면 이번 사업의 성공 여부는 불투명한 듯합니다."`, `note_vi: "Không hợp văn phong: câu trình bày kết quả khảo sát (조사 결과에 따르면) là văn bản trang trọng, còn -나 보다 là khẩu ngữ, suy đoán theo cảm nhận; dùng -(으)ㄴ/는 듯하다."` |
| g-0007 | PASS | Ví dụ 2 → "챙겨 드세요", khớp `vi` và `note_vi` |
| g-0008 | PASS | `non_examples[1]` "바쁜데도 꼭 오세요." sai thật (thử bảo vệ không được: -는데도 không đi với lời mời). Ví dụ 1 mới tự nhiên, `vi` sát nghĩa. `body_md` bỏ "그런데", dấu hiệu khớp ví dụ |
| g-0009 | PASS | `main_clause_vi`, `non_examples[1]` và 2 mục `common_mistakes_vi` mới (mệnh lệnh ở vế sau; nhầm với -(으)ㄹ까 보다 "đang tính") đều đúng. Thử bảo vệ "늦을까 봐 빨리 출발하세요": không được. Câu cũ trong `notes_internal` đã xoá |
| g-0010 | PASS | `non_examples[1]` "날씨가 춥다 보면…" sai thật (춥다 không có nghĩa động từ). `non_examples[2]` đã áp dụng gợi ý ("운동을 했다 보면"). `other_vi` đã tách -다 보면 / -다 보니, đúng |
| nguyen-nhan-ket-qua-xau | PASS | Mọi chuỗi đề xuất đã áp dụng, kể cả gợi ý "옆집 사람들이". Bảng nay khớp từng ràng buộc của g-0001..0003. `criterion_key` đủ 7 khoá bắt buộc, mỗi khoá một lần, cộng 3 hàng `other`. `topik_traps_vi[0]` đã thêm "(và -는 탓에 cũng có thể hợp lệ)", nhất quán với bẫy hai đáp án mới ở `topik_traps_vi[3]` |
| phong-doan-dua-vao-quan-sat | PASS | Mọi chuỗi đề xuất đã áp dụng đúng nguyên văn: `summary_vi`, hàng Loại từ, Chủ ngữ, Thì, Dạng kết thúc, 2 `note_vi` tình huống 2 (nay mở đầu "Sai:"), `decision_tips_vi[3]`. Đã đối chiếu từng ô với g-0004..0006: khớp. `criterion_key` đủ 7 khoá, 2 hàng `other` |
| nhuong-bo-cho-du | PASS | `topik_traps_vi[1]` đúng nguyên văn đề xuất. `decision_tips_vi[3]` đã áp dụng gợi ý ("-더라도 không gắn -겠- vào vế trước"). `criterion_key` đủ 7 khoá |
| spec (v0.2) | **FIX** | Đã xử lý đúng cả 9 điểm lượt 1: §9 (우리말샘, 표준국어대사전, quyền CSDL), §4 (bỏ 資, 두음법칙, chỉ ghi `alt_hv` khi có nguồn), §7.3 `external_id`, §8 cảnh báo `example_ko`, §6 `criterion_key` + "Sai:", §3.2 `checked`, §5.1 tag so với cả `variants`. Các góp ý (§3.1 quy trình điền theo lô, §3.5 chiều Việt → Hàn, §5 non_examples sai trên câu chữ) cũng đã vào spec. Chấp nhận điểm khác đề xuất số 2 (`vi_to_ko_trap` để tuỳ chọn [cần xác nhận]) và số 4 (§7.3 nêu hai phương án cho backend chọn): cả hai đúng tinh thần đề xuất lượt 1. **Còn một mâu thuẫn mới** do điểm khác đề xuất số 3: §8 (cảnh báo) cho phép `note_vi` của `non_examples` mở đầu "Không hợp văn phong", nhưng §5 (bảng trường `non_examples`) vẫn ghi cứng "`note_vi` bắt đầu bằng 'Sai:'". Validator viết theo §5 sẽ báo g-0006 sai, viết theo §8 thì không. (gợi ý) §11 ghi "52 từ cấp 3–4" trong khi v-00012 nay là cấp 2 | Ở §5, bảng trường, ô `non_examples`, thay câu cuối "`note_vi` bắt đầu bằng "Sai:"" bằng: "`note_vi` bắt đầu bằng "Sai:"; riêng lỗi văn phong (câu đúng ngữ pháp nhưng sai văn phong của ngữ cảnh đã nêu trong `ko`) thì bắt đầu bằng "Không hợp văn phong:"." (gợi ý) §11: "52 từ (`v-00001` … `v-00052`), 51 từ cấp 3–4 và 1 từ cấp 2 (쓰레기): …" |

### Nhận xét cấp lô (lượt 2)

- Người soạn áp dụng chuỗi thay thế rất sát: tôi đã so từng chuỗi của lượt 1 và không thấy chuỗi nào bị sửa lệch nghĩa. Các file đều có ghi chú sửa trong `notes_internal`.
- Lỗi duy nhất phát sinh khi sửa là ký tự gõ thừa "ㅇ" ở g-0005. Không có sửa đổi nào làm hỏng mục đã PASS.
- 5 điểm người soạn làm khác đề xuất: chấp nhận cả 5. Điểm số 3 cần đồng bộ spec §5 với §8 (FIX ở dòng spec); cũng nên đưa ngữ cảnh văn bản vào `ko` cho câu g-0006 (gợi ý).
- Sau khi sửa 2 mục FIX còn lại, lô đạt mọi tiêu chí §10 của spec. Theo spec §10 và content-spec §8.2: sửa `common_mistakes_vi` của g-0005 là thay đổi nội dung; còn sửa spec §5 không đụng file nội dung nào.

### Các điểm [cần xác nhận] để người dùng quyết

1. **Âm Hán-Việt của 資源 (v-00009):** "tư nguyên" (đã áp dụng; ghi chú nêu tương đương "tài nguyên" / 財) hay giữ "tài nguyên" như cách nói quen. Cần đối chiếu một từ điển Hán-Việt (Đào Duy Anh, Thiều Chửu) xem "tài nguyên" ứng với 財源 hay 資源.
2. **輸 có âm "du" hay không:** hiện đã bỏ khỏi `alt_hv`; chỉ thêm lại khi có nguồn.
3. **Cấp độ các từ có thể là 초급:** v-00001 사회, v-00006 이웃, v-00013 경제, v-00019 회의, v-00035 실수, v-00036 필요하다, v-00044 특히, v-00045 점점 (và v-00012 쓰레기 đã hạ cấp 2 dựa trên bản sao dữ liệu, chưa mở trang gốc). Cần đối chiếu krdict hoặc danh sách 급, rồi quyết giữ ở lô cấp 3–4 hay chuyển sang lô sơ cấp.
4. **-(으)ㄴ/는 탓에 cấp 4 hay 5**, và -(으)ㄴ/는 듯하다, -나 보다 (3 hay 4): chờ đối chiếu danh sách 문법 của 국제통용 한국어 표준 교육과정.
5. **Nguyên văn 표준국어대사전 mục 모양** (cấu trúc "-은/-는/-을 모양이다") để ghi `refs` cho g-0004.
6. **Spec §3.5 `vi_to_ko_trap`:** có cần trường riêng để giao diện lọc bạn giả chiều Việt → Hàn không, hay chỉ ghi trong `note_vi`.
7. **Spec §7.3 `external_id`:** chọn unique theo (`program_id`, `external_id`) hay tiền tố chương trình. Việc chọn là của backend-engineer, áp dụng cả cho `questions`.
8. **Spec §8 / g-0006:** có chấp nhận nhãn "Không hợp văn phong:" cho `non_examples` hay buộc mọi câu sai mở đầu "Sai:" (nếu chọn cách sau thì đổi `note_vi` g-0006 thành "Sai văn phong: …").
9. **Giấy phép (spec §9.5):**
   - điều khoản cổng 표준국어대사전 và Open API / "tải toàn bộ" của krdict;
   - giấy phép danh sách 급 của 국제통용 한국어 표준 교육과정;
   - ý kiến pháp lý về quyền CSDL (저작권법 제93조) khi đối chiếu cấp độ hàng loạt.
10. **Vị trí `_hanja-syllables.yaml`** khi có chương trình thứ hai, và quy ước tag `vocab:` cho từ đồng âm (`vocab:수입#v-00017`).

Theo yêu cầu, báo cáo không đề xuất điền `reviewed_by`. Việc điền là của người dùng; reviewer và agent soạn không điền.

> Kết luận của lượt 2 đã được thay bằng mục "Duyệt lại lượt 3 — 2026-10-21" bên dưới.

---

## Duyệt lại lượt 3 — 2026-10-21

Phạm vi: g-0004, g-0005, g-0006 và docs/vocab-grammar-spec.md §5, §8, §11. Đây là các chỗ người soạn sửa sau lượt 2 (2 FIX và 3 gợi ý).
Kiểm tra máy (do điều phối chạy): 21 file parse YAML được, 52 từ khớp 87 âm tiết.

Cách duyệt:
- Đọc lại các trường đã đổi và phần xung quanh để chắc không có thay đổi ngoài ý muốn.
- Thử bảo vệ lại `non_examples[2]` mới của g-0006 bằng ngữ cảnh khác.
- Đối chiếu §5 với §8 của spec.

| id | kết luận lượt 3 | ghi chú |
|---|---|---|
| g-0005 | PASS | `common_mistakes_vi[4]` nay là "Viết tách '듯 하다' như hai từ riêng. 듯하다 là một từ, viết liền (올 듯하다).", đúng chuỗi đề xuất, không còn ký tự thừa. Các trường khác không đổi so với lượt 2. (gợi ý, không bắt buộc) `note_vi` của `non_examples[1]` mở đầu "Sai 띄어쓰기:", còn §5 ghi "bắt đầu bằng 'Sai:'". Cảnh báo ở §8 chỉ kiểm tiền tố "Sai" nên không bị báo, và chuỗi này do chính tôi đề xuất ở lượt 1. Nếu validator kiểm nguyên "Sai:" thì đổi thành "Sai: lỗi 띄어쓰기. 듯하다 là một từ …" |
| g-0006 | PASS | `non_examples[2]` dùng đúng nguyên văn đề xuất (`ko`/`fix_ko` có "조사 결과에 따르면", `note_vi` mở đầu "Không hợp văn phong:"). Thử bảo vệ lại: ngữ cảnh "trình bày kết quả khảo sát" đã nằm ngay trong câu, nên -나 보다 (khẩu ngữ, suy đoán theo cảm nhận) không còn bảo vệ được. Khớp ngoại lệ mới ở spec §5 |
| g-0004 | PASS | `subject_vi` đã nối "…, trừ khi vừa tự nhận ra qua dấu hiệu (xem other_vi)." Nay khớp `other_vi` và hàng "Chủ ngữ" của bảng nhóm. Không trường nào khác đổi |
| spec | PASS | §5, ô `non_examples`: "`note_vi` bắt đầu bằng "Sai:"; riêng lỗi văn phong (câu đúng ngữ pháp nhưng sai văn phong của ngữ cảnh đã nêu trong `ko`) thì bắt đầu bằng "Không hợp văn phong:"." Nay nhất quán với cảnh báo §8. §11 ghi "52 từ …, 51 từ cấp 3–4 và 1 từ cấp 2 (쓰레기)", khớp dữ liệu. Hết mâu thuẫn |
| phong-doan-dua-vao-quan-sat | PASS (xác nhận nhanh) | Hai sửa đổi ở g-0004 (`subject_vi`) và g-0006 (`non_examples`) không làm đổi ô nào của bảng nhóm; bảng vẫn khớp các thành viên. Không cần duyệt lại toàn nhóm |

### Tổng kết cuối của cả lô (sau lượt 3)

**67 mục — PASS 67 · FIX 0 · BLOCKER 0**

| Nhóm mục | Số mục | Kết luận |
|---|---|---|
| Từ vựng v-00001 … v-00052 | 52 | PASS |
| Bảng âm tiết `_hanja-syllables.yaml` | 1 | PASS |
| Điểm ngữ pháp g-0001 … g-0010 | 10 | PASS |
| Nhóm so sánh (3 file) | 3 | PASS |
| docs/vocab-grammar-spec.md v0.2 | 1 | PASS |

- **Chất lượng chuyên môn:** lô đạt mọi tiêu chí §10 của spec.
  - Chữ Hán và âm Hán-Việt đúng.
  - Phân loại bạn giả đúng định nghĩa: 14 bạn giả, 3 full và 11 partial.
  - Ràng buộc ngữ pháp chính xác.
  - Mọi `non_examples` đều sai ngay trên câu chữ.
  - Bảng nhóm nhất quán với từng điểm.
- **Bản quyền:** không phát hiện sao chép.
- **Còn mở:** 10 điểm [cần xác nhận] ở lượt 2 vẫn chờ người dùng hoặc backend-engineer quyết. Không điểm nào chặn chất lượng nội dung hiện tại. Riêng điểm 1 (資源 "tư nguyên" / "tài nguyên") và điểm 3 (cấp độ các từ có thể là 초급) nên chốt trước khi import, vì đổi lại sẽ là thay đổi nội dung (đặt lại `reviewed_by`).
- **Gợi ý không bắt buộc:** `note_vi` "Sai 띄어쓰기:" ở g-0005 (xem bảng trên).

Theo yêu cầu, báo cáo không đề xuất điền `reviewed_by`. Việc điền là của người dùng; reviewer và agent soạn không điền.
