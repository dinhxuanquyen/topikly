import { parse as parseYaml } from "yaml";
import type { ContentFileInput, ValidationIssue } from "./content-validation";
import type { ProgramConfig } from "./programs";

/**
 * Kiểm tra từ vựng & ngữ pháp trong content/<program>/{vocab,grammar}/ theo vocab-grammar-spec §8.
 * Logic thuần (không đọc đĩa). `validateContent` gọi hàm này cho các file vocab/ và grammar/.
 *
 * Đường dẫn:
 *   <program>/vocab/_hanja-syllables.yaml        bảng âm tiết Hán-Hàn dùng chung
 *   <program>/vocab/<topic>[-NN].yaml            lô từ vựng
 *   <program>/grammar/<id>-<slug>.yaml           một điểm ngữ pháp
 *   <program>/grammar/groups/<slug>.yaml         nhóm so sánh
 *
 * Lỗi (chặn import): §8 mục "Lỗi" 1–12. Chưa làm:
 *  - luật 13 (từ `retired` bị xoá khỏi file so với bản đã merge): cần so với git, giống cờ
 *    --format-only-against; chưa có;
 *  - cảnh báo "tag grammar: của câu hỏi không khớp pattern nào" và "examples[].ko không chứa hình
 *    thức của pattern": chưa làm vì ngân hàng ngữ pháp mới 10 điểm nên gần như mọi tag đều báo;
 *  - cảnh báo "lô có phân bố level hoặc pos lệch nhiều": spec chưa định ngưỡng.
 */

// ------------------------------------------------------------------ hằng số theo spec

export const HANJA_TABLE_FILE = "_hanja-syllables.yaml";
export const VOCAB_ID_REGEX = /^v-[0-9]{5}$/;
export const GRAMMAR_ID_REGEX = /^g-[0-9]{4}$/;
export const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const BATCH_FILE_REGEX = /^[a-z0-9-]+(-[0-9]{2})?\.yaml$/;
const GRAMMAR_FILE_REGEX = /^(g-[0-9]{4})-([a-z0-9]+(?:-[a-z0-9]+)*)\.ya?ml$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const LEVEL_BASIS = ["curriculum_2017", "krdict_band", "editor"] as const;
const FALSE_FRIEND_KINDS = ["full", "partial"] as const;
const VOCAB_STATUS = ["active", "retired"] as const;
const HOSTS = ["V", "A", "N", "V/A"] as const;
const REGISTERS = ["spoken", "written", "both"] as const;
const POLARITIES = ["any", "negative", "positive"] as const;
/** Mục 6: 7 khoá bắt buộc của bảng so sánh (mỗi khoá một lần) + `other` (được lặp). */
export const REQUIRED_CRITERION_KEYS = [
  "meaning",
  "pos",
  "subject",
  "tense",
  "main_clause",
  "nuance",
  "register",
] as const;
const CRITERION_KEYS = [...REQUIRED_CRITERION_KEYS, "other"] as const;
/** Phần thuần Hàn được phép nối sau các âm tiết Hán (mục 3.3). */
const NATIVE_SUFFIXES = ["하다", "되다", "시키다", "스럽다", "롭다", "히", "이"];
const MAX_BATCH_WORDS = 80;
const MAX_EXAMPLE_CHARS = 60;
/** Quy tắc ký tự của `pattern` (mục 5.1): Hangul, jamo tương thích, - ( ) / dấu cách và N V A. */
const PATTERN_CHARS = /^[가-힣ㄱ-ㅎㅏ-ㅣ\-()/ NVA]+$/u;
const COMPOSED_JAMO = /[ᄀ-ᇿ]/u;

/** Tag `grammar:` ứng với một pattern (mục 5.1): dấu cách đổi thành `-`. */
export function grammarTagOf(pattern: string): string {
  return `grammar:${pattern.replace(/ /g, "-")}`;
}

// ------------------------------------------------------------------ tiện ích kiểm kiểu

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isNonBlank = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const hasHangul = (s: string) => /[가-힣ㄱ-ㅣ]/u.test(s);

/** Chữ Hán: khối CJK Unified Ideographs và Extension A (mục 8, luật 7). */
function isCjkChar(ch: string): boolean {
  const cp = ch.codePointAt(0);
  if (cp === undefined) return false;
  return (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3400 && cp <= 0x4dbf);
}

const isHangulSyllable = (ch: string) => /^[가-힣]$/u.test(ch);

const sub = (base: string, key: string | number) =>
  typeof key === "number" ? `${base}[${key}]` : base ? `${base}.${key}` : key;

class Reporter {
  constructor(
    private readonly issues: ValidationIssue[],
    readonly file: string,
  ) {}
  err(path: string, message: string, code?: string) {
    this.issues.push({
      severity: "error",
      file: this.file,
      path,
      message,
      ...(code ? { code } : {}),
    });
  }
  warn(path: string, message: string, code?: string) {
    this.issues.push({
      severity: "warning",
      file: this.file,
      path,
      message,
      ...(code ? { code } : {}),
    });
  }
}

/** Đọc chuỗi bắt buộc, không rỗng. */
function reqStr(o: Obj, key: string, base: string, r: Reporter): string | undefined {
  const v = o[key];
  if (v === undefined) {
    r.err(sub(base, key), "thiếu trường bắt buộc");
    return undefined;
  }
  if (!isNonBlank(v)) {
    r.err(sub(base, key), "phải là chuỗi văn bản, không được để trống");
    return undefined;
  }
  return v;
}

/** Chuỗi tuỳ chọn: nếu có phải là chuỗi. */
function optStr(o: Obj, key: string, base: string, r: Reporter): string | undefined {
  const v = o[key];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "string") {
    r.err(sub(base, key), "phải là chuỗi văn bản");
    return undefined;
  }
  return v;
}

function reqEnum<const T extends readonly string[]>(
  o: Obj,
  key: string,
  base: string,
  values: T,
  r: Reporter,
): T[number] | undefined {
  const v = o[key];
  if (v === undefined) {
    r.err(sub(base, key), "thiếu trường bắt buộc");
    return undefined;
  }
  if (typeof v !== "string" || !values.includes(v)) {
    r.err(sub(base, key), `giá trị không hợp lệ, cho phép: ${values.join(", ")}`);
    return undefined;
  }
  return v;
}

function reqLevel(o: Obj, base: string, r: Reporter): number | undefined {
  const v = o.level;
  if (v === undefined) {
    r.err(sub(base, "level"), "thiếu trường bắt buộc");
    return undefined;
  }
  if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > 6) {
    r.err(sub(base, "level"), "phải là số nguyên từ 1 đến 6");
    return undefined;
  }
  return v;
}

function reqList(o: Obj, key: string, base: string, r: Reporter): unknown[] | undefined {
  const v = o[key];
  if (v === undefined) {
    r.err(sub(base, key), "thiếu trường bắt buộc");
    return undefined;
  }
  if (!Array.isArray(v)) {
    r.err(sub(base, key), "phải là danh sách");
    return undefined;
  }
  return v;
}

function strList(v: unknown, path: string, r: Reporter): string[] | undefined {
  if (!Array.isArray(v)) {
    r.err(path, "phải là danh sách chuỗi");
    return undefined;
  }
  const out: string[] = [];
  v.forEach((item, i) => {
    if (!isNonBlank(item)) r.err(sub(path, i), "phải là chuỗi văn bản, không được để trống");
    else out.push(item);
  });
  return out;
}

/** reviewed_by luôn phải có khoá; giá trị null (chưa duyệt) hoặc chuỗi (§3.1). */
function checkReviewedKey(o: Obj, base: string, r: Reporter, required: boolean) {
  if (!("reviewed_by" in o)) {
    if (required)
      r.err(sub(base, "reviewed_by"), "thiếu trường bắt buộc (dùng null khi chưa duyệt)");
    return;
  }
  const v = o.reviewed_by;
  if (v !== null && !isNonBlank(v)) r.err(sub(base, "reviewed_by"), "phải là chuỗi hoặc null");
  const at = o.reviewed_at;
  if (at !== undefined && at !== null && (typeof at !== "string" || !DATE_REGEX.test(at))) {
    // YAML có thể parse ngày thành Date; yaml@2 (core schema) giữ chuỗi nên chỉ chuỗi hợp lệ.
    r.err(sub(base, "reviewed_at"), "phải là ngày dạng YYYY-MM-DD hoặc null");
  }
}

/** Giá trị hiệu lực của reviewed_by: khoá riêng của mục thắng giá trị của gốc file. */
export function effectiveReviewedBy(item: Obj, root: Obj): string | null {
  const v = "reviewed_by" in item ? item.reviewed_by : root.reviewed_by;
  return isNonBlank(v) ? v : null;
}

/** Giá trị hiệu lực của `source`. */
export function effectiveSource(item: Obj, root: Obj): unknown {
  return "source" in item ? item.source : root.source;
}

/** Duyệt mọi chuỗi trong doc, báo chuỗi không NFC (luật 3). */
function checkNfc(value: unknown, path: string, r: Reporter) {
  if (typeof value === "string") {
    if (value !== value.normalize("NFC")) {
      r.err(path, "chuỗi không ở dạng chuẩn hoá NFC (Hangul phải NFC)");
    }
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => checkNfc(v, sub(path, i), r));
  } else if (isObj(value)) {
    for (const [k, v] of Object.entries(value)) checkNfc(v, sub(path, k), r);
  }
}

/** BOM, tab, CRLF (luật 3). */
function checkFileHygiene(text: string, r: Reporter) {
  if (text.charCodeAt(0) === 0xfeff) r.err("", "file có BOM (phải là UTF-8 không BOM)");
  if (/\r/.test(text)) r.err("", "file có ký tự xuống dòng CRLF/CR (phải là LF)");
  if (/\t/.test(text)) r.err("", "file có ký tự tab (thụt đầu dòng bằng dấu cách)");
}

function parseDoc(input: ContentFileInput, r: Reporter): unknown {
  checkFileHygiene(input.text, r);
  let doc: unknown;
  try {
    doc = parseYaml(input.text);
  } catch (err) {
    const msg = err instanceof Error ? err.message.split("\n")[0] : String(err);
    r.err("", `lỗi cú pháp YAML: ${msg}`);
    return undefined;
  }
  if (doc === null || doc === undefined) {
    r.err("", "file rỗng");
    return undefined;
  }
  if (!isObj(doc)) {
    r.err("", "gốc file phải là một đối tượng YAML (map), không phải danh sách");
    return undefined;
  }
  checkNfc(doc, "", r);
  return doc;
}

/** Metadata chung của gốc file: source, authored_by, created_at, reviewed_by. */
function checkProvenance(o: Obj, r: Reporter) {
  const source = o.source;
  if (source === undefined) r.err("source", "thiếu trường bắt buộc");
  else if (source !== "original") r.err("source", 'chỉ được là "original" (nội dung tự viết)');
  reqStr(o, "authored_by", "", r);
  const created = o.created_at;
  if (created === undefined) r.err("created_at", "thiếu trường bắt buộc");
  else if (typeof created !== "string" || !DATE_REGEX.test(created)) {
    r.err("created_at", "phải là ngày dạng YYYY-MM-DD");
  }
  checkReviewedKey(o, "", r, true);
}

// ------------------------------------------------------------------ bảng âm tiết

interface TableRow {
  ko: string;
  hanja: string;
  hv: string;
  alt_hv: string[];
}

function checkHanjaTable(doc: Obj, r: Reporter): Map<string, TableRow> {
  const table = new Map<string, TableRow>();
  checkProvenance(doc, r);
  const rows = reqList(doc, "syllables", "", r);
  if (!rows) return table;
  rows.forEach((row, i) => {
    const p = sub("syllables", i);
    if (!isObj(row)) return r.err(p, "mỗi dòng phải là một đối tượng");
    const ko = reqStr(row, "ko", p, r);
    const hanja = reqStr(row, "hanja", p, r);
    const hv = reqStr(row, "hv", p, r);
    reqStr(row, "meaning_vi", p, r);
    const alt = row.alt_hv === undefined ? [] : strList(row.alt_hv, sub(p, "alt_hv"), r);
    if (ko !== undefined && !isHangulSyllable(ko)) {
      r.err(sub(p, "ko"), "phải là đúng một âm tiết Hangul");
    }
    if (hanja !== undefined) {
      if (Array.from(hanja).length !== 1 || !isCjkChar(hanja)) {
        r.err(
          sub(p, "hanja"),
          "phải là đúng một chữ Hán (khối CJK Unified Ideographs, kể cả Extension A)",
        );
      }
    }
    if (ko && hanja && hv) {
      const key = `${ko}|${hanja}`;
      if (table.has(key)) r.err(p, `trùng khoá (${ko}, ${hanja}) với một dòng trước đó`);
      else table.set(key, { ko, hanja, hv, alt_hv: alt ?? [] });
    }
  });
  return table;
}

// ------------------------------------------------------------------ từ vựng

interface WordFacts {
  file: string;
  id: string;
  hangul: string;
  hanja: string | null;
  retired: boolean;
  exampleKo?: string;
}

interface VocabState {
  idFirst: Map<string, string>;
  pairFirst: Map<string, WordFacts>;
  exampleFirst: Map<string, string>;
}

function checkFalseFriend(ff: unknown, path: string, r: Reporter) {
  if (!isObj(ff)) return r.err(path, "phải là null hoặc đối tượng {kind, vi_meaning, note_vi}");
  reqEnum(ff, "kind", path, FALSE_FRIEND_KINDS, r);
  reqStr(ff, "vi_meaning", path, r);
  reqStr(ff, "note_vi", path, r);
}

function checkWord(
  w: unknown,
  i: number,
  root: Obj,
  r: Reporter,
  program: ProgramConfig,
  table: ReadonlyMap<string, TableRow>,
  state: VocabState,
  forImport: boolean,
): {
  unreviewed: boolean;
  editorBasis: boolean;
  hanjaWithoutRef: boolean;
  fewColloc: string | null;
} {
  const p = sub("words", i);
  const out = {
    unreviewed: false,
    editorBasis: false,
    hanjaWithoutRef: false,
    fewColloc: null as string | null,
  };
  if (!isObj(w)) {
    r.err(p, "mỗi từ phải là một đối tượng");
    return out;
  }

  const id = reqStr(w, "id", p, r);
  if (id !== undefined) {
    if (!VOCAB_ID_REGEX.test(id)) r.err(sub(p, "id"), "id phải có dạng v-NNNNN (5 chữ số)");
    const first = state.idFirst.get(id);
    if (first) r.err(sub(p, "id"), `id "${id}" trùng với ${first}`);
    else state.idFirst.set(id, r.file);
  }
  const label = id ?? `words[${i}]`;

  const hangul = reqStr(w, "hangul", p, r);
  if (hangul !== undefined) {
    if (!hasHangul(hangul)) r.err(sub(p, "hangul"), "phải chứa Hangul");
    if (hangul !== hangul.trim() || /\s{2,}/.test(hangul)) {
      r.err(sub(p, "hangul"), "không được có khoảng trắng đầu/cuối hoặc khoảng trắng kép");
    }
  }

  // hanja / han_viet / syllables (luật 4–7)
  let hanja: string | null | undefined;
  if (!("hanja" in w)) r.err(sub(p, "hanja"), "thiếu trường bắt buộc (dùng null nếu thuần Hàn)");
  else if (w.hanja === null) hanja = null;
  else if (isNonBlank(w.hanja)) hanja = w.hanja;
  else r.err(sub(p, "hanja"), "phải là chuỗi chữ Hán hoặc null");

  if (!("han_viet" in w))
    r.err(sub(p, "han_viet"), "thiếu trường bắt buộc (dùng null nếu không có hanja)");
  const hanViet = w.han_viet === null ? null : isNonBlank(w.han_viet) ? w.han_viet : undefined;
  if ("han_viet" in w && hanViet === undefined) {
    r.err(sub(p, "han_viet"), "phải là chuỗi hoặc null");
  }

  if (typeof hanja === "string") {
    for (const ch of Array.from(hanja)) {
      if (hasHangul(ch)) {
        r.err(sub(p, "hanja"), "chỉ ghi phần chữ Hán, không chứa Hangul (bỏ 하다/되다…)");
        break;
      }
      if (!isCjkChar(ch)) {
        r.err(
          sub(p, "hanja"),
          `ký tự "${ch}" nằm ngoài khối CJK Unified Ideographs (kể cả Extension A)`,
        );
        break;
      }
    }
    if (hanViet === null) r.err(sub(p, "han_viet"), "từ có hanja thì phải có han_viet");
    if (w.syllables === undefined) r.err(sub(p, "syllables"), "từ có hanja thì phải có syllables");
  } else if (hanja === null) {
    if (isNonBlank(w.han_viet))
      r.err(sub(p, "han_viet"), "từ không có hanja thì han_viet phải là null");
    if (w.syllables !== undefined && !(Array.isArray(w.syllables) && w.syllables.length === 0)) {
      r.err(sub(p, "syllables"), "từ không có hanja thì không có syllables");
    }
  }

  if (typeof hanja === "string" && w.syllables !== undefined) {
    if (!Array.isArray(w.syllables) || w.syllables.length === 0) {
      r.err(sub(p, "syllables"), "phải là danh sách không rỗng");
    } else {
      let koJoin = "";
      let hanjaJoin = "";
      const hvs: string[] = [];
      let wellFormed = true;
      w.syllables.forEach((s, j) => {
        const sp = sub(sub(p, "syllables"), j);
        if (!isObj(s)) {
          wellFormed = false;
          return r.err(sp, "mỗi âm tiết phải là {ko, hanja, hv}");
        }
        const ko = reqStr(s, "ko", sp, r);
        const hj = reqStr(s, "hanja", sp, r);
        const hv = reqStr(s, "hv", sp, r);
        if (!ko || !hj || !hv) {
          wellFormed = false;
          return;
        }
        if (Array.from(hj).length !== 1) {
          wellFormed = false;
          return r.err(sub(sp, "hanja"), "phải là đúng một chữ Hán");
        }
        koJoin += ko;
        hanjaJoin += hj;
        hvs.push(hv);
        const row = table.get(`${ko}|${hj}`);
        if (!row) {
          r.err(sp, `cặp (${ko}, ${hj}) chưa có trong ${HANJA_TABLE_FILE}`);
        } else if (hv !== row.hv && !row.alt_hv.includes(hv)) {
          r.err(
            sub(sp, "hv"),
            `âm "${hv}" không thuộc hv ("${row.hv}") hay alt_hv của (${ko}, ${hj}) trong bảng âm tiết`,
          );
        } else if (hv !== row.hv && !isNonBlank(w.note_vi) && !isNonBlank(w.notes_internal)) {
          r.warn(
            sp,
            `âm "${hv}" khác âm mặc định "${row.hv}" mà từ chưa có note_vi/notes_internal giải thích`,
          );
        }
      });
      if (wellFormed) {
        if (hanjaJoin !== hanja) {
          r.err(
            sub(p, "syllables"),
            `nối hanja của syllables ("${hanjaJoin}") khác hanja của từ ("${hanja}")`,
          );
        }
        if (typeof hanViet === "string" && hvs.join(" ") !== hanViet) {
          r.err(
            sub(p, "han_viet"),
            `han_viet ("${hanViet}") khác phần nối hv của syllables ("${hvs.join(" ")}")`,
          );
        }
        if (hangul !== undefined) {
          if (!hangul.startsWith(koJoin)) {
            r.err(
              sub(p, "hangul"),
              `hangul phải bắt đầu bằng phần nối ko của syllables ("${koJoin}")`,
            );
          } else {
            const rest = hangul.slice(koJoin.length);
            if (rest !== "" && !rest.startsWith(" ") && !NATIVE_SUFFIXES.includes(rest)) {
              r.warn(
                sub(p, "hangul"),
                `phần thuần Hàn "${rest}" sau các âm tiết Hán không thuộc ${NATIVE_SUFFIXES.join(", ")}`,
              );
            }
          }
        }
      }
    }
  }

  reqStr(w, "meaning_vi", p, r);
  const pos = reqStr(w, "pos", p, r);
  if (pos !== undefined && !program.lexicon.pos.some((x) => x.code === pos)) {
    r.err(
      sub(p, "pos"),
      `giá trị không hợp lệ, cho phép: ${program.lexicon.pos.map((x) => x.code).join(", ")}`,
    );
  }
  const level = reqLevel(w, p, r);
  if (
    level !== undefined &&
    (level < program.lexicon.level_range.min || level > program.lexicon.level_range.max)
  ) {
    r.warn(
      sub(p, "level"),
      `cấp ${level} nằm ngoài khoảng ${program.lexicon.level_range.min}–${program.lexicon.level_range.max} của chương trình (từ nền, chấp nhận nếu cố ý)`,
    );
  }
  const basis = reqEnum(w, "level_basis", p, LEVEL_BASIS, r);
  if (basis === "editor") out.editorBasis = true;

  if (w.topics !== undefined) {
    const topics = strList(w.topics, sub(p, "topics"), r);
    if (topics) {
      if (topics.length > 3) r.warn(sub(p, "topics"), "nên có 1–3 chủ đề");
      for (const t of topics) {
        if (!program.lexicon.topics.some((x) => x.code === t)) {
          r.warn(sub(p, "topics"), `chủ đề "${t}" ngoài danh sách đóng của content-spec §6`);
        }
      }
    }
  }

  const exampleKo = reqStr(w, "example_ko", p, r);
  reqStr(w, "example_vi", p, r);
  if (exampleKo !== undefined) {
    if (Array.from(exampleKo).length > MAX_EXAMPLE_CHARS) {
      r.warn(sub(p, "example_ko"), `ví dụ dài quá ${MAX_EXAMPLE_CHARS} ký tự`);
    }
    if (/[.?!]\s+\S/u.test(exampleKo)) r.warn(sub(p, "example_ko"), "ví dụ nên là MỘT câu");
    const prior = state.exampleFirst.get(exampleKo);
    if (prior) r.warn(sub(p, "example_ko"), `ví dụ trùng với ${prior}`);
    else state.exampleFirst.set(exampleKo, `${r.file} (${label})`);

    // Gợi ý kiểm tay (§8): ví dụ có chứa phần Hán / gốc từ không.
    if (hangul !== undefined && Array.isArray(w.syllables) && w.syllables.length > 0) {
      const koJoin = w.syllables
        .map((s) => (isObj(s) && typeof s.ko === "string" ? s.ko : ""))
        .join("");
      if (koJoin && !exampleKo.includes(koJoin)) {
        r.warn(sub(p, "example_ko"), `ví dụ không chứa phần Hán "${koJoin}" của từ (kiểm tay)`);
      }
    } else if (
      hangul !== undefined &&
      hanja === null &&
      hangul.endsWith("다") &&
      !hangul.includes(" ")
    ) {
      const stem = Array.from(hangul.slice(0, -1)).slice(0, -1).join("");
      if (stem && !exampleKo.includes(stem)) {
        r.warn(sub(p, "example_ko"), `ví dụ không chứa gốc từ "${stem}" (kiểm tay)`);
      }
    }
  }

  // false_friend: khoá bắt buộc (null hoặc object)
  if (!("false_friend" in w)) {
    r.err(
      sub(p, "false_friend"),
      "thiếu trường bắt buộc (ghi null rõ ràng nếu không phải bạn giả)",
    );
  } else if (w.false_friend !== null) {
    checkFalseFriend(w.false_friend, sub(p, "false_friend"), r);
  } else if (
    typeof w.note_vi === "string" &&
    /bạn giả/i.test(w.note_vi) &&
    !/không (phải|đánh dấu)[^.]{0,20}bạn giả/i.test(w.note_vi)
  ) {
    r.warn(sub(p, "false_friend"), 'note_vi nhắc "bạn giả" nhưng false_friend là null');
  }

  // collocations, note_vi, refs, status
  let collocCount = 0;
  if (w.collocations !== undefined) {
    if (!Array.isArray(w.collocations)) r.err(sub(p, "collocations"), "phải là danh sách {ko, vi}");
    else {
      collocCount = w.collocations.length;
      w.collocations.forEach((c, j) => {
        const cp = sub(sub(p, "collocations"), j);
        if (!isObj(c)) return r.err(cp, "phải là {ko, vi}");
        reqStr(c, "ko", cp, r);
        reqStr(c, "vi", cp, r);
      });
    }
  }
  if (collocCount < 2) out.fewColloc = label;
  optStr(w, "note_vi", p, r);
  optStr(w, "notes_internal", p, r);
  if (w.status !== undefined && !VOCAB_STATUS.includes(w.status as (typeof VOCAB_STATUS)[number])) {
    r.err(sub(p, "status"), `giá trị không hợp lệ, cho phép: ${VOCAB_STATUS.join(", ")}`);
  }
  if (w.refs !== undefined) {
    if (!Array.isArray(w.refs)) r.err(sub(p, "refs"), "phải là danh sách");
    else {
      w.refs.forEach((ref, j) => {
        const rp = sub(sub(p, "refs"), j);
        if (!isObj(ref)) return r.err(rp, "phải là {src, checked, …}");
        reqStr(ref, "src", rp, r);
        if (typeof ref.checked !== "boolean") r.err(sub(rp, "checked"), "phải là true hoặc false");
      });
    }
  }
  if (typeof hanja === "string") {
    const checked = Array.isArray(w.refs)
      ? w.refs.some(
          (ref) =>
            isObj(ref) &&
            ref.checked === true &&
            (!Array.isArray(ref.fields) || ref.fields.includes("hanja")),
        )
      : false;
    if (!checked) out.hanjaWithoutRef = true;
  }

  // Khoá riêng của từ ghi đè gốc lô
  if ("source" in w && w.source !== "original") r.err(sub(p, "source"), 'chỉ được là "original"');
  if ("reviewed_by" in w) checkReviewedKey(w, p, r, false);

  // luật 12: import khi chưa duyệt
  if (effectiveReviewedBy(w, root) === null) {
    out.unreviewed = true;
    if (forImport) {
      r.err(
        sub(p, "reviewed_by"),
        `${label}: reviewed_by hiệu lực là null, không được import`,
        "not-reviewed",
      );
    }
  }

  // cảnh báo trùng (hangul, hanja) giữa hai từ active
  if (hangul !== undefined && id !== undefined && hanja !== undefined) {
    const facts: WordFacts = { file: r.file, id, hangul, hanja, retired: w.status === "retired" };
    if (!facts.retired) {
      const key = `${hangul}|${hanja ?? ""}`;
      const prior = state.pairFirst.get(key);
      if (prior) {
        r.warn(
          p,
          `(${hangul}, ${hanja ?? "không hanja"}) trùng với ${prior.id} (${prior.file}); nghi nhập đôi`,
        );
      } else state.pairFirst.set(key, facts);
    }
  }
  return out;
}

function checkVocabBatch(
  doc: Obj,
  r: Reporter,
  program: ProgramConfig,
  programDir: string,
  fileName: string,
  table: ReadonlyMap<string, TableRow>,
  state: VocabState,
  forImport: boolean,
) {
  if (!BATCH_FILE_REGEX.test(fileName)) {
    r.err("", "tên file lô từ phải khớp ^[a-z0-9-]+(-[0-9]{2})?\\.yaml$");
  } else {
    const base = fileName.replace(/\.yaml$/, "");
    const topic = base.replace(/-[0-9]{2}$/, "");
    if (topic !== "general" && !program.lexicon.topics.some((t) => t.code === topic)) {
      r.err("", `tên lô "${topic}" phải là một giá trị topic: (content-spec §6) hoặc "general"`);
    }
    if (doc.batch !== undefined && doc.batch !== base) {
      r.err("batch", `batch ("${String(doc.batch)}") phải trùng tên file ("${base}")`);
    }
  }
  if (doc.batch === undefined) r.err("batch", "thiếu trường bắt buộc");
  if (doc.program !== undefined && doc.program !== programDir) {
    r.err("program", `phải trùng thư mục chương trình ("${programDir}")`);
  }
  checkProvenance(doc, r);
  reqStr(doc, "verification_vi", "", r);

  const words = reqList(doc, "words", "", r);
  if (!words) return;
  if (words.length > MAX_BATCH_WORDS) {
    r.warn("words", `lô có ${words.length} từ, nên ≤ ${MAX_BATCH_WORDS} (tách -02)`);
  }
  let unreviewed = 0;
  let editor = 0;
  let hanjaNoRef = 0;
  const fewColloc: string[] = [];
  words.forEach((w, i) => {
    const res = checkWord(w, i, doc, r, program, table, state, forImport);
    if (res.unreviewed) unreviewed += 1;
    if (res.editorBasis) editor += 1;
    if (res.hanjaWithoutRef) hanjaNoRef += 1;
    if (res.fewColloc) fewColloc.push(res.fewColloc);
  });
  if (unreviewed > 0 && !forImport) {
    r.warn("", `${unreviewed} từ chưa duyệt (reviewed_by hiệu lực là null)`, "not-reviewed");
  }
  if (editor > 0)
    r.warn(
      "words",
      `${editor} từ có level_basis: editor (cấp độ chưa đối chiếu danh sách chính thức)`,
    );
  if (hanjaNoRef > 0) {
    r.warn("words", `${hanjaNoRef} từ Hán-Hàn chưa có refs với checked: true cho trường hanja`);
  }
  if (fewColloc.length > 0) {
    r.warn(
      "words",
      `${fewColloc.length} từ có dưới 2 collocations (${fewColloc.slice(0, 5).join(", ")}${fewColloc.length > 5 ? "…" : ""})`,
    );
  }
}

// ------------------------------------------------------------------ ngữ pháp

interface GrammarFacts {
  file: string;
  id: string;
  slug: string;
  pattern?: string;
  level?: number;
  compareGroup: string | null;
}

interface GroupFacts {
  file: string;
  slug: string;
  members: string[];
  level?: number;
  columns: string[];
}

function checkGrammarPoint(
  doc: Obj,
  r: Reporter,
  program: ProgramConfig,
  fileName: string,
  forImport: boolean,
  state: { patternFirst: Map<string, string> },
): GrammarFacts | undefined {
  const m = GRAMMAR_FILE_REGEX.exec(fileName);
  if (!m) r.err("", "tên file phải có dạng g-NNNN-<slug>.yaml");

  const id = reqStr(doc, "id", "", r);
  const slug = reqStr(doc, "slug", "", r);
  if (id !== undefined && !GRAMMAR_ID_REGEX.test(id))
    r.err("id", "id phải có dạng g-NNNN (4 chữ số)");
  if (slug !== undefined && !SLUG_REGEX.test(slug))
    r.err("slug", "slug phải là chữ thường không dấu nối bằng -");
  if (m && id !== undefined && id !== m[1])
    r.err("id", `id ("${id}") phải trùng phần đầu tên file ("${m[1]}")`);
  if (m && slug !== undefined && slug !== m[2])
    r.err("slug", `slug ("${slug}") phải trùng phần sau tên file ("${m[2]}")`);

  const pattern = reqStr(doc, "pattern", "", r);
  if (pattern !== undefined) {
    if (pattern.includes("~")) r.err("pattern", "pattern không được chứa ~");
    if (COMPOSED_JAMO.test(pattern)) {
      r.err(
        "pattern",
        "dùng Hangul Compatibility Jamo (ㄴ ㄹ ㅂ), không dùng jamo ghép (U+1100–U+11FF)",
      );
    } else if (!PATTERN_CHARS.test(pattern)) {
      r.err(
        "pattern",
        "pattern chứa ký tự ngoài quy tắc §5.1 (Hangul, jamo tương thích, - ( ) / dấu cách, N V A)",
      );
    }
    if (pattern !== pattern.trim() || /\s{2,}/.test(pattern)) {
      r.err("pattern", "không được có khoảng trắng đầu/cuối hoặc khoảng trắng kép");
    }
    const first = state.patternFirst.get(pattern);
    if (first) r.err("pattern", `pattern "${pattern}" trùng với ${first}`);
    else state.patternFirst.set(pattern, r.file);
  }
  if (doc.variants !== undefined) {
    const variants = strList(doc.variants, "variants", r);
    for (const v of variants ?? []) {
      if (v.includes("~")) r.err("variants", `biến thể "${v}" không được chứa ~`);
      if (COMPOSED_JAMO.test(v))
        r.err("variants", `biến thể "${v}" dùng jamo ghép (U+1100–U+11FF)`);
    }
  }
  reqStr(doc, "meaning_vi", "", r);
  const level = reqLevel(doc, "", r);
  if (
    level !== undefined &&
    (level < program.lexicon.level_range.min || level > program.lexicon.level_range.max)
  ) {
    r.warn(
      "level",
      `cấp ${level} nằm ngoài khoảng ${program.lexicon.level_range.min}–${program.lexicon.level_range.max} của chương trình`,
    );
  }
  const basis = reqEnum(doc, "level_basis", "", LEVEL_BASIS, r);
  if (basis === "editor")
    r.warn("level_basis", "cấp độ chưa đối chiếu danh sách chính thức (level_basis: editor)");

  const fn = reqStr(doc, "function", "", r);
  if (fn !== undefined && !program.lexicon.grammar_functions.some((x) => x.code === fn)) {
    r.err(
      "function",
      `giá trị không hợp lệ, cho phép: ${program.lexicon.grammar_functions.map((x) => x.code).join(", ")}`,
    );
  }

  let compareGroup: string | null = null;
  if (!("compare_group" in doc))
    r.err("compare_group", "thiếu trường bắt buộc (dùng null nếu không thuộc nhóm)");
  else if (doc.compare_group === null) compareGroup = null;
  else if (isNonBlank(doc.compare_group)) {
    compareGroup = doc.compare_group;
    if (!SLUG_REGEX.test(compareGroup))
      r.err("compare_group", "slug nhóm phải là chữ thường không dấu nối bằng -");
  } else r.err("compare_group", "phải là slug nhóm hoặc null");

  // form
  const form = reqList(doc, "form", "", r);
  if (form) {
    if (form.length === 0) r.err("form", "cần ít nhất 1 cách kết hợp");
    form.forEach((f, i) => {
      const fp = sub("form", i);
      if (!isObj(f)) return r.err(fp, "phải là {host, attach, note_vi?}");
      const host = f.host;
      if (typeof host !== "string" || !HOSTS.includes(host as (typeof HOSTS)[number])) {
        r.err(
          sub(fp, "host"),
          `giá trị không hợp lệ, cho phép: ${HOSTS.join(", ")} (viết "N" có nháy)`,
        );
      }
      reqStr(f, "attach", fp, r);
      optStr(f, "note_vi", fp, r);
    });
  }

  // constraints
  const c = doc.constraints;
  if (c === undefined) r.err("constraints", "thiếu trường bắt buộc");
  else if (!isObj(c)) r.err("constraints", "phải là đối tượng");
  else {
    reqEnum(c, "register", "constraints", REGISTERS, r);
    if (c.polarity !== undefined) reqEnum(c, "polarity", "constraints", POLARITIES, r);
    for (const k of ["subject_vi", "tense_vi", "main_clause_vi", "other_vi"])
      optStr(c, k, "constraints", r);
    if (compareGroup !== null) {
      for (const k of ["subject_vi", "tense_vi", "main_clause_vi", "polarity"]) {
        if (c[k] === undefined) {
          r.err(
            sub("constraints", k),
            "điểm thuộc nhóm so sánh phải có đủ subject_vi, tense_vi, main_clause_vi, polarity",
          );
        }
      }
    }
  }

  // examples (luật 10: ≥ 3)
  const examples = reqList(doc, "examples", "", r);
  if (examples) {
    if (examples.length < 3) r.err("examples", `cần ít nhất 3 ví dụ (hiện có ${examples.length})`);
    examples.forEach((e, i) => {
      const ep = sub("examples", i);
      if (!isObj(e)) return r.err(ep, "phải là {ko, vi, note_vi?}");
      reqStr(e, "ko", ep, r);
      reqStr(e, "vi", ep, r);
      optStr(e, "note_vi", ep, r);
    });
  }
  if (doc.non_examples !== undefined) {
    if (!Array.isArray(doc.non_examples)) r.err("non_examples", "phải là danh sách");
    else {
      doc.non_examples.forEach((e, i) => {
        const ep = sub("non_examples", i);
        if (!isObj(e)) return r.err(ep, "phải là {ko, fix_ko?, note_vi}");
        const ko = reqStr(e, "ko", ep, r);
        optStr(e, "fix_ko", ep, r);
        const note = reqStr(e, "note_vi", ep, r);
        if (ko?.includes("*"))
          r.warn(sub(ep, "ko"), "ko không dùng ký tự * (giao diện tự thêm dấu hiệu sai)");
        if (note !== undefined && !/^(Sai|Không hợp văn phong)/u.test(note)) {
          r.warn(
            sub(ep, "note_vi"),
            'note_vi nên bắt đầu bằng "Sai" (hoặc "Không hợp văn phong" cho lỗi văn phong)',
          );
        }
      });
      if (compareGroup !== null && doc.non_examples.length < 2) {
        r.warn("non_examples", "điểm thuộc nhóm so sánh nên có ≥ 2 non_examples");
      }
    }
  } else if (compareGroup !== null) {
    r.warn("non_examples", "điểm thuộc nhóm so sánh nên có ≥ 2 non_examples");
  }

  const mistakes = reqList(doc, "common_mistakes_vi", "", r);
  if (mistakes) {
    if (mistakes.length < 1)
      r.err("common_mistakes_vi", "cần ít nhất 1 lỗi thường gặp của người Việt");
    strList(mistakes, "common_mistakes_vi", r);
  }
  if (doc.related !== undefined) {
    const related = strList(doc.related, "related", r);
    for (const rid of related ?? []) {
      if (!GRAMMAR_ID_REGEX.test(rid)) r.err("related", `"${rid}" phải có dạng g-NNNN`);
    }
  }
  reqStr(doc, "body_md", "", r);
  optStr(doc, "notes_internal", "", r);
  if (
    doc.status !== undefined &&
    !VOCAB_STATUS.includes(doc.status as (typeof VOCAB_STATUS)[number])
  ) {
    r.err("status", `giá trị không hợp lệ, cho phép: ${VOCAB_STATUS.join(", ")}`);
  }
  checkProvenance(doc, r);

  if (effectiveReviewedBy(doc, doc) === null) {
    if (forImport) r.err("reviewed_by", "reviewed_by là null, không được import", "not-reviewed");
    else r.warn("reviewed_by", "chưa duyệt (reviewed_by: null)", "not-reviewed");
  }

  if (id === undefined || slug === undefined) return undefined;
  return {
    file: r.file,
    id,
    slug,
    ...(pattern !== undefined ? { pattern } : {}),
    ...(level !== undefined ? { level } : {}),
    compareGroup,
  };
}

function checkCompareGroup(
  doc: Obj,
  r: Reporter,
  program: ProgramConfig,
  fileName: string,
  forImport: boolean,
): GroupFacts | undefined {
  const slug = reqStr(doc, "slug", "", r);
  if (slug !== undefined) {
    if (!SLUG_REGEX.test(slug)) r.err("slug", "slug phải là chữ thường không dấu nối bằng -");
    const base = fileName.replace(/\.ya?ml$/, "");
    if (slug !== base) r.err("slug", `slug ("${slug}") phải trùng tên file ("${base}")`);
  }
  reqStr(doc, "title_vi", "", r);
  const fn = reqStr(doc, "function", "", r);
  if (fn !== undefined && !program.lexicon.grammar_functions.some((x) => x.code === fn)) {
    r.err(
      "function",
      `giá trị không hợp lệ, cho phép: ${program.lexicon.grammar_functions.map((x) => x.code).join(", ")}`,
    );
  }
  const level = reqLevel(doc, "", r);
  reqStr(doc, "summary_vi", "", r);

  let members: string[] = [];
  const rawMembers = reqList(doc, "members", "", r);
  if (rawMembers) {
    members = strList(rawMembers, "members", r) ?? [];
    if (members.length < 2 || members.length > 5) {
      r.err("members", `nhóm phải có 2–5 thành viên (hiện có ${members.length})`);
    }
    if (new Set(members).size !== members.length) r.err("members", "có thành viên bị lặp");
  }

  let columns: string[] = [];
  const table = doc.compare_table;
  if (table === undefined) r.err("compare_table", "thiếu trường bắt buộc");
  else if (!isObj(table)) r.err("compare_table", "phải là {columns, rows}");
  else {
    columns = strList(table.columns, "compare_table.columns", r) ?? [];
    const rows = table.rows;
    if (!Array.isArray(rows)) r.err("compare_table.rows", "phải là danh sách");
    else {
      const seenKeys = new Map<string, number>();
      rows.forEach((row, i) => {
        const rp = sub("compare_table.rows", i);
        if (!isObj(row)) return r.err(rp, "phải là {criterion_key, criterion, cells}");
        const key = reqStr(row, "criterion_key", rp, r);
        reqStr(row, "criterion", rp, r);
        if (key !== undefined) {
          if (!(CRITERION_KEYS as readonly string[]).includes(key)) {
            r.err(
              sub(rp, "criterion_key"),
              `giá trị không hợp lệ, cho phép: ${CRITERION_KEYS.join(", ")}`,
            );
          } else seenKeys.set(key, (seenKeys.get(key) ?? 0) + 1);
        }
        const cells = row.cells;
        if (!Array.isArray(cells)) r.err(sub(rp, "cells"), "phải là danh sách");
        else {
          if (cells.length !== columns.length) {
            r.err(sub(rp, "cells"), `số ô (${cells.length}) phải bằng số cột (${columns.length})`);
          }
          cells.forEach((cell, j) => {
            if (!isNonBlank(cell))
              r.err(sub(sub(rp, "cells"), j), "phải là chuỗi văn bản, không được để trống");
          });
        }
      });
      for (const key of REQUIRED_CRITERION_KEYS) {
        const n = seenKeys.get(key) ?? 0;
        if (n === 0) r.err("compare_table.rows", `thiếu hàng criterion_key "${key}"`);
        else if (n > 1)
          r.err(
            "compare_table.rows",
            `criterion_key "${key}" xuất hiện ${n} lần (chỉ "other" được lặp)`,
          );
      }
    }
  }

  const examples = reqList(doc, "contrast_examples", "", r);
  if (examples) {
    if (examples.length < 2)
      r.err("contrast_examples", `cần ít nhất 2 tình huống (hiện có ${examples.length})`);
    examples.forEach((sit, i) => {
      const sp = sub("contrast_examples", i);
      if (!isObj(sit)) return r.err(sp, "phải là {situation_vi, items}");
      reqStr(sit, "situation_vi", sp, r);
      const items = reqList(sit, "items", sp, r);
      items?.forEach((it, j) => {
        const ip = sub(sub(sp, "items"), j);
        if (!isObj(it)) return r.err(ip, "phải là {member, ko, vi, ok, note_vi}");
        const member = reqStr(it, "member", ip, r);
        if (member !== undefined && !members.includes(member)) {
          r.err(sub(ip, "member"), `"${member}" không nằm trong members của nhóm`);
        }
        reqStr(it, "ko", ip, r);
        reqStr(it, "vi", ip, r);
        const note = reqStr(it, "note_vi", ip, r);
        if (typeof it.ok !== "boolean") r.err(sub(ip, "ok"), "phải là true hoặc false");
        else if (it.ok === false && note !== undefined && !note.startsWith("Sai:")) {
          // Spec §6/§8 quy định LỖI. Tạm hạ xuống CẢNH BÁO vì nội dung hiện có vi phạm
          // (phong-doan-dua-vao-quan-sat.yaml: "Sai như trên."), chờ hanviet-lexicographer sửa;
          // sửa xong thì đổi lại thành r.err.
          r.warn(
            sub(ip, "note_vi"),
            'câu ok: false thì note_vi phải bắt đầu bằng "Sai:" (spec §6: lỗi; tạm là cảnh báo vì nội dung hiện có chưa sửa)',
            "ok-false-prefix",
          );
        }
      });
    });
  }
  const tips = reqList(doc, "decision_tips_vi", "", r);
  if (tips) {
    if (tips.length < 1) r.err("decision_tips_vi", "cần ít nhất 1 mẹo chọn nhanh");
    strList(tips, "decision_tips_vi", r);
  }
  if (doc.topik_traps_vi !== undefined) strList(doc.topik_traps_vi, "topik_traps_vi", r);
  optStr(doc, "notes_internal", "", r);
  checkProvenance(doc, r);
  if (effectiveReviewedBy(doc, doc) === null) {
    if (forImport) r.err("reviewed_by", "reviewed_by là null, không được import", "not-reviewed");
    else r.warn("reviewed_by", "chưa duyệt (reviewed_by: null)", "not-reviewed");
  }

  if (slug === undefined) return undefined;
  return { file: r.file, slug, members, ...(level !== undefined ? { level } : {}), columns };
}

// ------------------------------------------------------------------ điểm vào

export interface LexiconValidationOptions {
  programs: readonly ProgramConfig[];
  /** Import vào CSDL: mục có reviewed_by hiệu lực là null là LỖI (luật 12). */
  forImport: boolean;
}

/** Phân loại file theo đường dẫn tương đối `<program>/{vocab,grammar}/…`. */
export function isLexiconPath(parts: readonly string[]): boolean {
  return parts.length >= 2 && (parts[1] === "vocab" || parts[1] === "grammar");
}

/**
 * Kiểm toàn bộ file vocab/ và grammar/ (đã có đường dẫn chuẩn hoá dấu "/"). Trả về các vấn đề;
 * số file đã kiểm = số file đầu vào .yaml.
 */
export function validateLexicon(
  files: readonly ContentFileInput[],
  options: LexiconValidationOptions,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const byProgram = new Map<string, ContentFileInput[]>();
  for (const f of files) {
    const dir = f.file.split("/")[0]!;
    byProgram.set(dir, [...(byProgram.get(dir) ?? []), f]);
  }

  for (const [dir, list] of byProgram) {
    const program = options.programs.find((p) => p.code === dir);
    if (!program) {
      for (const f of list) {
        issues.push({
          severity: "error",
          file: f.file,
          path: "",
          message: `thư mục chương trình "${dir}" chưa được cấu hình (có: ${options.programs.map((p) => p.code).join(", ")})`,
        });
      }
      continue;
    }
    validateProgramLexicon(program, dir, list, options.forImport, issues);
  }
  return issues;
}

function validateProgramLexicon(
  program: ProgramConfig,
  dir: string,
  files: readonly ContentFileInput[],
  forImport: boolean,
  issues: ValidationIssue[],
) {
  const sorted = [...files].sort((a, b) => a.file.localeCompare(b.file));
  const yaml = sorted.filter((f) => /\.ya?ml$/i.test(f.file));

  const vocabFiles = yaml.filter((f) => f.file.split("/")[1] === "vocab");
  const grammarFiles = yaml.filter((f) => f.file.split("/")[1] === "grammar");

  // 1. Bảng âm tiết (cần trước để kiểm từ)
  let table = new Map<string, TableRow>();
  const tableFile = vocabFiles.find((f) => f.file === `${dir}/vocab/${HANJA_TABLE_FILE}`);
  if (tableFile) {
    const r = new Reporter(issues, tableFile.file);
    const doc = parseDoc(tableFile, r);
    if (isObj(doc)) {
      table = checkHanjaTable(doc, r);
      if (effectiveReviewedBy(doc, doc) === null) {
        if (forImport)
          r.err("reviewed_by", "reviewed_by là null, không được import", "not-reviewed");
        else r.warn("reviewed_by", "chưa duyệt (reviewed_by: null)", "not-reviewed");
      }
    }
  }

  // 2. Lô từ vựng
  const vocabState: VocabState = {
    idFirst: new Map(),
    pairFirst: new Map(),
    exampleFirst: new Map(),
  };
  for (const f of vocabFiles) {
    if (f === tableFile) continue;
    const r = new Reporter(issues, f.file);
    const parts = f.file.split("/");
    const fileName = parts[parts.length - 1]!;
    if (parts.length !== 3) {
      r.err("", `đường dẫn phải có dạng ${dir}/vocab/<topic>.yaml`);
      continue;
    }
    if (fileName.startsWith("_")) {
      r.warn("", `file "${fileName}" bắt đầu bằng _ nhưng không phải ${HANJA_TABLE_FILE}; bỏ qua`);
      continue;
    }
    const doc = parseDoc(f, r);
    if (!isObj(doc)) continue;
    if (!tableFile)
      r.err("", `thiếu ${dir}/vocab/${HANJA_TABLE_FILE} để đối chiếu âm tiết Hán-Hàn`);
    checkVocabBatch(doc, r, program, dir, fileName, table, vocabState, forImport);
  }

  // 3. Ngữ pháp
  const points = new Map<string, GrammarFacts>();
  const slugFirst = new Map<string, string>();
  const patternState = { patternFirst: new Map<string, string>() };
  const groupFiles: ContentFileInput[] = [];
  for (const f of grammarFiles) {
    const parts = f.file.split("/");
    const fileName = parts[parts.length - 1]!;
    if (parts.length === 4 && parts[2] === "groups") {
      groupFiles.push(f);
      continue;
    }
    const r = new Reporter(issues, f.file);
    if (parts.length !== 3) {
      r.err(
        "",
        `đường dẫn phải có dạng ${dir}/grammar/<id>-<slug>.yaml hoặc ${dir}/grammar/groups/<slug>.yaml`,
      );
      continue;
    }
    const doc = parseDoc(f, r);
    if (!isObj(doc)) continue;
    const facts = checkGrammarPoint(doc, r, program, fileName, forImport, patternState);
    if (!facts) continue;
    const idPrior = points.get(facts.id);
    if (idPrior) r.err("id", `id "${facts.id}" trùng với ${idPrior.file}`);
    else points.set(facts.id, facts);
    const slugPrior = slugFirst.get(facts.slug);
    if (slugPrior) r.err("slug", `slug "${facts.slug}" trùng với ${slugPrior}`);
    else slugFirst.set(facts.slug, f.file);
    const related = Array.isArray(doc.related) ? doc.related : [];
    for (const rid of related) {
      if (
        typeof rid === "string" &&
        GRAMMAR_ID_REGEX.test(rid) &&
        !hasPointFile(rid, grammarFiles)
      ) {
        r.warn("related", `related trỏ tới "${rid}" chưa có file ngữ pháp`);
      }
    }
  }

  // 4. Nhóm so sánh
  const groups = new Map<string, GroupFacts>();
  for (const f of groupFiles) {
    const r = new Reporter(issues, f.file);
    const doc = parseDoc(f, r);
    if (!isObj(doc)) continue;
    const parts = f.file.split("/");
    const facts = checkCompareGroup(doc, r, program, parts[parts.length - 1]!, forImport);
    if (!facts) continue;
    const prior = groups.get(facts.slug);
    if (prior) r.err("slug", `slug nhóm "${facts.slug}" trùng với ${prior.file}`);
    else groups.set(facts.slug, facts);
  }

  // 5. Đối chiếu hai chiều điểm <-> nhóm (luật 10)
  for (const g of groups.values()) {
    const r = new Reporter(issues, g.file);
    for (const id of g.members) {
      const point = points.get(id);
      if (!point) r.err("members", `thành viên "${id}" không tồn tại`);
      else if (point.compareGroup !== g.slug) {
        r.err(
          "members",
          `thành viên "${id}" không khai compare_group: ${g.slug} (hiện là ${point.compareGroup ?? "null"})`,
        );
      }
    }
    const memberPatterns = g.members.map((id) => points.get(id)?.pattern);
    if (memberPatterns.every((p) => p !== undefined) && g.columns.length > 0) {
      if (JSON.stringify(memberPatterns) !== JSON.stringify(g.columns)) {
        r.err(
          "compare_table.columns",
          `columns phải khớp pattern các thành viên theo thứ tự members: ${memberPatterns.join(" / ")}`,
        );
      }
    }
    const levels = g.members
      .map((id) => points.get(id)?.level)
      .filter((l): l is number => l !== undefined);
    if (g.level !== undefined && levels.length > 0 && g.level !== Math.min(...levels)) {
      r.warn(
        "level",
        `level (${g.level}) nên bằng cấp thấp nhất của thành viên (${Math.min(...levels)})`,
      );
    }
  }
  for (const point of points.values()) {
    if (point.compareGroup === null) continue;
    const r = new Reporter(issues, point.file);
    const group = groups.get(point.compareGroup);
    if (!group) {
      r.err(
        "compare_group",
        `nhóm "${point.compareGroup}" không tồn tại (cần grammar/groups/${point.compareGroup}.yaml)`,
      );
    } else if (!group.members.includes(point.id)) {
      r.err("compare_group", `nhóm "${group.slug}" không liệt kê ${point.id} trong members`);
    }
  }
}

function hasPointFile(id: string, grammarFiles: readonly ContentFileInput[]): boolean {
  return grammarFiles.some((f) => f.file.split("/").pop()!.startsWith(`${id}-`));
}
