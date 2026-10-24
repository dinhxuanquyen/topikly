"use cache";

/**
 * Truy vấn CÓ CACHE cho server component — trụ Lý thuyết (từ vựng, ngữ pháp).
 * Lý do dùng "use cache" và `cacheLife("max")`: xem ./../practice/queries.ts.
 *
 * Frontend gọi các hàm này từ page/layout. KHÔNG gọi ./source trực tiếp từ page.
 * Mọi hàm trả kiểu công khai (./types.ts). Kết quả "không có" là `null` hoặc mảng rỗng, vì cache
 * không lưu `undefined` ổn định; page nên gọi `notFound()` khi nhận `null`.
 */
import { cacheLife } from "next/cache";
import {
  getCompareGroup as sourceGetCompareGroup,
  getGrammarFacets as sourceGetGrammarFacets,
  getGrammarPoint as sourceGetGrammarPoint,
  getHanjaFamily as sourceGetHanjaFamily,
  getVocabFacets as sourceGetVocabFacets,
  getVocabWordDetail as sourceGetVocabWordDetail,
  listCompareGroups,
  listGrammar,
  listHanja,
  listVocab,
} from "./source";
import type {
  CompareGroup,
  CompareGroupSummary,
  GrammarFacets,
  GrammarFilter,
  GrammarPoint,
  GrammarPointSummary,
  HanjaEntry,
  HanjaFamily,
  VocabFacets,
  VocabFilter,
  VocabWordDetail,
  VocabWordSummary,
} from "./types";

// ------------------------------------------------------------------ từ vựng

/** Bộ lọc khả dụng (cấp, chủ đề, từ loại) kèm số lượng. `null` nếu chương trình không tồn tại. */
export async function getVocabFacets(program: string): Promise<VocabFacets | null> {
  cacheLife("max");
  return sourceGetVocabFacets(program) ?? null;
}

/** Từ theo cấp / chủ đề / từ loại / bạn giả, sắp theo cấp rồi hangul. Bỏ trống `filter` = tất cả. */
export async function getVocabList(
  program: string,
  filter: VocabFilter = {},
): Promise<VocabWordSummary[]> {
  cacheLife("max");
  return listVocab(program, filter);
}

/** Một từ theo id + gia đình từ theo từng chữ Hán. `null` nếu không có. */
export async function getVocabWord(program: string, id: string): Promise<VocabWordDetail | null> {
  cacheLife("max");
  return sourceGetVocabWordDetail(program, id) ?? null;
}

/** Mọi chữ Hán có trong từ vựng (trang "Hán tự"). */
export async function getHanjaList(program: string): Promise<HanjaEntry[]> {
  cacheLife("max");
  return listHanja(program);
}

/** Một chữ Hán: các cách đọc + mọi từ chứa nó. `null` nếu chưa có từ nào chứa chữ này. */
export async function getHanjaFamily(program: string, hanja: string): Promise<HanjaFamily | null> {
  cacheLife("max");
  return sourceGetHanjaFamily(program, hanja) ?? null;
}

// ------------------------------------------------------------------ ngữ pháp

export async function getGrammarFacets(program: string): Promise<GrammarFacets | null> {
  cacheLife("max");
  return sourceGetGrammarFacets(program) ?? null;
}

/** Điểm ngữ pháp theo cấp / chức năng / nhóm, sắp theo cấp rồi id. */
export async function getGrammarList(
  program: string,
  filter: GrammarFilter = {},
): Promise<GrammarPointSummary[]> {
  cacheLife("max");
  return listGrammar(program, filter);
}

/** Một điểm ngữ pháp theo slug. `null` nếu không có. */
export async function getGrammarPoint(program: string, slug: string): Promise<GrammarPoint | null> {
  cacheLife("max");
  return sourceGetGrammarPoint(program, slug) ?? null;
}

/** Các nhóm so sánh (tóm tắt), sắp theo cấp rồi slug. */
export async function getCompareGroups(program: string): Promise<CompareGroupSummary[]> {
  cacheLife("max");
  return listCompareGroups(program);
}

/** Một nhóm so sánh theo slug. `null` nếu không có. */
export async function getCompareGroup(program: string, slug: string): Promise<CompareGroup | null> {
  cacheLife("max");
  return sourceGetCompareGroup(program, slug) ?? null;
}
