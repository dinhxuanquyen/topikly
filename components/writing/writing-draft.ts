/**
 * Nháp bài Viết của chế độ khách, lưu bằng localStorage (đủ nhỏ: vài KB mỗi đề).
 *
 * Nguyên tắc như guest-store.ts: MỌI hàm không ném lỗi và không treo. Khi localStorage không có
 * hoặc bị chặn (SSR, chế độ riêng tư, đầy bộ nhớ) thì ghi trả về `false`, đọc trả về `null`;
 * giao diện vẫn chạy, chỉ không lưu được. Hàm async để sau này đổi sang IndexedDB mà không phải
 * sửa nơi gọi.
 */

export interface WritingDraft {
  /** W53–W54: nội dung bài viết. */
  essay: string;
  /** W51–W52: câu trả lời theo nhãn chỗ trống ("㉠", "㉡"). */
  blanks: Record<string, string>;
  /** W53–W54: id các ý bắt buộc người học đã tự đánh dấu "bài mình có". */
  checked: string[];
  savedAt: number;
}

export const EMPTY_DRAFT: WritingDraft = { essay: "", blanks: {}, checked: [], savedAt: 0 };

const PREFIX = "topikly:writing-draft:v1";
/** Chặn dữ liệu quá lớn (bài Viết dài nhất ~700 ký tự). */
const MAX_FIELD_CHARS = 5000;

export function draftKey(program: string, promptId: string): string {
  return `${PREFIX}:${program}:${promptId}`;
}

/** Nháp có rỗng không (không có chữ nào, không có ý nào được đánh dấu). */
export function isDraftEmpty(draft: Pick<WritingDraft, "essay" | "blanks" | "checked">): boolean {
  return (
    draft.essay.trim() === "" &&
    Object.values(draft.blanks).every((v) => v.trim() === "") &&
    draft.checked.length === 0
  );
}

/** Kiểm tra và chuẩn hoá dữ liệu đọc từ localStorage (có thể bị sửa tay hoặc hỏng). */
export function parseDraft(raw: unknown): WritingDraft | null {
  if (typeof raw !== "object" || raw === null) return null;
  const value = raw as Record<string, unknown>;
  const essay = typeof value.essay === "string" ? value.essay.slice(0, MAX_FIELD_CHARS) : "";
  const blanks: Record<string, string> = {};
  if (typeof value.blanks === "object" && value.blanks !== null) {
    for (const [label, text] of Object.entries(value.blanks as Record<string, unknown>)) {
      if (typeof text === "string") blanks[label] = text.slice(0, MAX_FIELD_CHARS);
    }
  }
  const checked = Array.isArray(value.checked)
    ? value.checked.filter((id): id is string => typeof id === "string")
    : [];
  const savedAt = typeof value.savedAt === "number" ? value.savedAt : 0;
  return { essay, blanks, checked, savedAt };
}

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null; // truy cập localStorage cũng có thể ném lỗi khi bị chặn
  }
}

export async function loadDraft(program: string, promptId: string): Promise<WritingDraft | null> {
  try {
    const store = storage();
    if (!store) return null;
    const text = store.getItem(draftKey(program, promptId));
    if (!text) return null;
    const draft = parseDraft(JSON.parse(text));
    return draft && !isDraftEmpty(draft) ? draft : null;
  } catch {
    return null;
  }
}

/** Ghi nháp; nháp rỗng thì xoá khoá. true = thao tác thành công. */
export async function saveDraft(
  program: string,
  promptId: string,
  draft: Omit<WritingDraft, "savedAt">,
): Promise<boolean> {
  try {
    const store = storage();
    if (!store) return false;
    if (isDraftEmpty(draft)) {
      store.removeItem(draftKey(program, promptId));
      return true;
    }
    store.setItem(draftKey(program, promptId), JSON.stringify({ ...draft, savedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export async function clearDraft(program: string, promptId: string): Promise<boolean> {
  try {
    const store = storage();
    if (!store) return false;
    store.removeItem(draftKey(program, promptId));
    return true;
  } catch {
    return false;
  }
}
