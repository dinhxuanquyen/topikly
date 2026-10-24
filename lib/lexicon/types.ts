/**
 * Hợp đồng dữ liệu của trụ Lý thuyết: Từ vựng (Hán-Hàn, âm Hán-Việt, bạn giả) và Ngữ pháp
 * (điểm ngữ pháp, nhóm so sánh). Nguồn dữ liệu: docs/vocab-grammar-spec.md.
 *
 * File này AN TOÀN CHO CLIENT: chỉ chứa kiểu và hằng số thuần, không import fs/node/zod.
 * Frontend import kiểu từ đây; logic server nằm ở source.ts, truy vấn có cache ở queries.ts.
 *
 * Mọi kiểu ở đây là bản CÔNG KHAI: đã bỏ `notes_internal`, `reviewed_by`, `reviewed_at`,
 * `verification_vi`, `level_basis`, `refs`, `source`, `authored_by`, `created_at`. Thay vào đó
 * có cờ `reviewed` để giao diện đánh dấu nội dung chưa được người dùng duyệt.
 *
 * Nhãn tiếng Việt (từ loại, chức năng ngữ pháp, chủ đề) lấy từ cấu hình chương trình
 * (lib/db/programs, `lexicon`) và đã được server gắn sẵn vào dữ liệu (`pos_name_vi`,
 * `function_name_vi`, `topics[].name_vi`). UI không tự dịch mã.
 */

/** Một mã kèm tên tiếng Việt, ví dụ { code: "society", name_vi: "Xã hội" }. */
export interface LabelRef {
  code: string;
  name_vi: string;
}

// ------------------------------------------------------------------ từ vựng

export type FalseFriendKind = "full" | "partial";

/** Bạn giả Hán-Việt. `full`: không có nghĩa nào trùng; `partial`: trùng một số nghĩa. */
export interface FalseFriend {
  kind: FalseFriendKind;
  /** Nghĩa của từ Hán-Việt tương ứng (`han_viet`) trong tiếng Việt hiện đại. */
  vi_meaning: string;
  /** Trùng ở nghĩa nào, khác ở nghĩa nào, cách nói đúng trong tiếng Việt. */
  note_vi: string;
}

export interface Collocation {
  ko: string;
  vi: string;
}

/** Một chữ Hán trong từ, kèm thông tin lấy từ bảng âm tiết Hán-Hàn dùng chung. */
export interface WordSyllable {
  /** Âm Hàn một âm tiết. */
  ko: string;
  /** Đúng một chữ Hán. */
  hanja: string;
  /** Âm Hán-Việt của chữ này TRONG TỪ NÀY. */
  hv: string;
  /** Nghĩa gốc của chữ Hán (từ bảng âm tiết). Thiếu nếu bảng chưa có dòng này. */
  meaning_vi?: string;
}

/** Một dòng của bảng âm tiết Hán-Hàn: (âm Hàn, chữ Hán) -> âm Hán-Việt mặc định. */
export interface HanjaSyllable {
  ko: string;
  hanja: string;
  /** Âm Hán-Việt phổ biến nhất của chữ. */
  hv: string;
  /** Các âm Việt khác của chữ (có nguồn). Thường rỗng. */
  alt_hv: string[];
  meaning_vi: string;
}

/** Thông tin đủ để liệt kê một từ trong danh sách (không có ví dụ, collocation, bạn giả đầy đủ). */
export interface VocabWordSummary {
  /** Ví dụ "v-00001". Khoá ổn định, dùng làm tham số URL. */
  id: string;
  hangul: string;
  /** Phần Hán của từ; null nếu thuần Hàn. */
  hanja: string | null;
  /** Âm Hán-Việt theo từ; null nếu thuần Hàn. */
  han_viet: string | null;
  meaning_vi: string;
  /** Mã từ loại, ví dụ "noun". Tên hiển thị ở `pos_name_vi`. */
  pos: string;
  pos_name_vi: string;
  /** Cấp 1–6 (cấp ngoài khoảng chương trình vẫn có thể xuất hiện, vd. từ nền cấp 2). */
  level: number;
  topics: LabelRef[];
  /** null = không phải bạn giả. Chi tiết ở `VocabWord.false_friend`. */
  false_friend_kind: FalseFriendKind | null;
  /** false nếu mục chưa được người dùng duyệt (reviewed_by hiệu lực là null). */
  reviewed: boolean;
}

export interface VocabWord extends VocabWordSummary {
  program: string;
  /** Rỗng với từ thuần Hàn. Đúng thứ tự trong từ. */
  syllables: WordSyllable[];
  example_ko: string;
  example_vi: string;
  false_friend: FalseFriend | null;
  collocations: Collocation[];
  /** Ghi chú cho người học: đồng âm khác nghĩa, mẹo nhớ… */
  note_vi?: string;
}

/** Một từ trong "gia đình từ" của một chữ Hán, kèm âm của chữ Hán đó trong từ ấy. */
export interface FamilyMember extends VocabWordSummary {
  /** Âm Hàn của chữ Hán đang xét trong từ này (khác nhau với biến thể 두음법칙: 유/류). */
  ko: string;
  /** Âm Hán-Việt của chữ Hán đang xét trong từ này. */
  hv: string;
}

/**
 * "Gia đình từ" của MỘT chữ Hán trong một từ: mọi từ khác chứa cùng chữ Hán.
 * Dùng cho "cây hình vị" ở trang chi tiết từ.
 */
export interface SyllableFamily {
  /** Chữ Hán đang xét (đúng thứ tự trong từ, bỏ chữ lặp). */
  syllable: WordSyllable;
  /** Các âm Hán-Việt khác của chữ (từ bảng âm tiết). */
  alt_hv: string[];
  /** Các từ KHÁC (không gồm từ đang xem) cũng chứa chữ Hán này; sắp theo cấp rồi hangul. */
  words: FamilyMember[];
}

export interface VocabWordDetail {
  word: VocabWord;
  /** Mỗi chữ Hán của từ một mục; rỗng với từ thuần Hàn. */
  families: SyllableFamily[];
}

/** Một chữ Hán trong bảng âm tiết, kèm số từ chứa nó (để liệt kê trang "Hán tự"). */
export interface HanjaEntry {
  hanja: string;
  /** Mọi cách đọc Hàn của chữ (vd. 流: 유, 류). */
  readings: HanjaSyllable[];
  word_count: number;
}

/** Trang riêng của một chữ Hán: các cách đọc và mọi từ chứa nó. */
export interface HanjaFamily {
  hanja: string;
  readings: HanjaSyllable[];
  words: FamilyMember[];
}

export interface VocabFilter {
  level?: number;
  /** Mã chủ đề, ví dụ "society". */
  topic?: string;
  /** Mã từ loại, ví dụ "verb". */
  pos?: string;
  /** true = chỉ bạn giả; false = loại bạn giả. */
  falseFriend?: boolean;
}

export interface FacetCount {
  code: string;
  name_vi: string;
  count: number;
}

export interface LevelFacet {
  level: number;
  /** Ví dụ "3급" (từ ngưỡng cấp của chương trình) hoặc "Cấp 2" nếu chương trình không có nhãn. */
  label: string;
  count: number;
}

/** Bộ lọc khả dụng kèm số lượng, tính theo toàn bộ nội dung đang hiển thị. */
export interface VocabFacets {
  total: number;
  levels: LevelFacet[];
  topics: FacetCount[];
  pos: FacetCount[];
  false_friend_count: number;
}

// ------------------------------------------------------------------ ngữ pháp

/** Tham chiếu gọn tới một điểm ngữ pháp (liên kết, cột bảng so sánh). */
export interface GrammarPointRef {
  id: string;
  slug: string;
  pattern: string;
}

export interface GrammarPointSummary extends GrammarPointRef {
  /** Biến thể ghi khác, dùng để tìm kiếm. */
  variants: string[];
  meaning_vi: string;
  level: number;
  /** Mã chức năng, ví dụ "cause". Tên hiển thị ở `function_name_vi`. */
  function: string;
  function_name_vi: string;
  /** Slug nhóm so sánh; null nếu không thuộc nhóm. */
  compare_group: string | null;
  reviewed: boolean;
}

export type GrammarHost = "V" | "A" | "N" | "V/A";

export interface GrammarForm {
  host: GrammarHost;
  attach: string;
  note_vi?: string;
}

export type GrammarRegister = "spoken" | "written" | "both";
export type GrammarPolarity = "any" | "negative" | "positive";

export interface GrammarConstraints {
  register: GrammarRegister;
  /** Sắc thái kết quả ở vế sau. */
  polarity?: GrammarPolarity;
  subject_vi?: string;
  tense_vi?: string;
  main_clause_vi?: string;
  other_vi?: string;
}

export interface GrammarExample {
  ko: string;
  vi: string;
  note_vi?: string;
}

/** Câu SAI người học hay viết. Giao diện tự thêm dấu hiệu sai; `ko` không chứa `*`. */
export interface GrammarNonExample {
  ko: string;
  fix_ko?: string;
  note_vi: string;
}

export interface GrammarPoint extends GrammarPointSummary {
  program: string;
  form: GrammarForm[];
  constraints: GrammarConstraints;
  examples: GrammarExample[];
  non_examples: GrammarNonExample[];
  /** Lỗi của người Việt (dịch từng chữ, nhầm hiểu…). */
  common_mistakes_vi: string[];
  /** Điểm liên quan ngoài nhóm (chỉ gồm điểm có thật). */
  related: GrammarPointRef[];
  /** Nhóm so sánh chứa điểm này; null nếu không thuộc nhóm. */
  group: { slug: string; title_vi: string } | null;
  /** Giải thích ngắn bằng tiếng Việt (markdown). */
  body_md: string;
}

export interface GrammarFilter {
  level?: number;
  /** Mã chức năng, ví dụ "cause". */
  function?: string;
  /** Slug nhóm so sánh. */
  group?: string;
}

export interface GrammarFacets {
  total: number;
  levels: LevelFacet[];
  functions: FacetCount[];
}

/** Tiêu chí cố định của một hàng bảng so sánh (vocab-grammar-spec §6). */
export type CompareCriterionKey =
  "meaning" | "pos" | "subject" | "tense" | "main_clause" | "nuance" | "register" | "other";

export interface CompareRow {
  criterion_key: CompareCriterionKey;
  /** Nhãn hiển thị của hàng. */
  criterion: string;
  /** Đúng bằng số cột, cùng thứ tự `CompareGroup.members`. */
  cells: string[];
}

export interface ContrastItem {
  /** id điểm ngữ pháp (thuộc `members`). */
  member: string;
  /** pattern của `member`, để hiển thị mà không cần tra. */
  pattern: string;
  ko: string;
  /** Nghĩa dự định của câu. */
  vi: string;
  /** false = câu sai; khi đó `note_vi` bắt đầu bằng "Sai:" (hầu hết nội dung). */
  ok: boolean;
  note_vi: string;
}

export interface ContrastExample {
  situation_vi: string;
  items: ContrastItem[];
}

export interface CompareGroupSummary {
  slug: string;
  title_vi: string;
  function: string;
  function_name_vi: string;
  level: number;
  member_count: number;
  reviewed: boolean;
}

export interface CompareGroupMember extends GrammarPointRef {
  meaning_vi: string;
  level: number;
}

export interface CompareGroup extends CompareGroupSummary {
  program: string;
  /** Điểm chung và điểm khác (markdown). */
  summary_vi: string;
  /** Đúng thứ tự cột của bảng. */
  members: CompareGroupMember[];
  compare_table: {
    /** pattern các thành viên, cùng thứ tự `members`. */
    columns: string[];
    rows: CompareRow[];
  };
  contrast_examples: ContrastExample[];
  decision_tips_vi: string[];
  topik_traps_vi: string[];
}

// ------------------------------------------------------------------ tìm kiếm (API)

/** Kết quả của GET /api/lexicon/search. */
export interface LexiconSearchResponse {
  q: string;
  vocab: VocabWordSummary[];
  grammar: GrammarPointSummary[];
}

export type LexiconErrorCode = "invalid_query" | "program_not_found";

export interface LexiconErrorBody {
  error: { code: LexiconErrorCode; message: string };
}
