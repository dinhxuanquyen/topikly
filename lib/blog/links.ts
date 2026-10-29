/**
 * Dựng TẬP ĐƯỜNG DẪN TRANG CÓ THẬT để validator blog kiểm `related[].href` và liên kết nội bộ
 * trong thân bài (docs/blog-spec.md mục 3). CHỈ DÙNG TRÊN SERVER / SCRIPT (đọc fs qua các nguồn
 * practice, exam, lexicon). Dùng ở scripts/lib/validate-content-cli.ts, không dùng khi phục vụ trang.
 *
 * Mẫu trang (khớp cây app/):
 *  - trụ cố định: "/", "/blog", "/blog/chuyen-muc/<mã>", "/nang-cap", "/tai-khoan"
 *  - mỗi chương trình `p`: /p, /p/lo-trinh, /p/lo-trinh/test-trinh-do, /p/luyen-tap,
 *    /p/luyen-tap/{nghe,doc,viet}, /p/de-thi, /p/de-thi/{full,mini,hard,ibt},
 *    /p/ly-thuyet, /p/ly-thuyet/{ngu-phap,tu-vung,nguon}, /p/ly-thuyet/tu-vung/han-tu
 *  - động: /p/luyen-tap/<kỹ năng>/<TYPE> (dạng đang có câu), /p/de-thi/<kind>/<id> (kể cả đề nháp),
 *    /p/ly-thuyet/ngu-phap/<slug>, /p/ly-thuyet/ngu-phap/nhom/<slug>, /p/ly-thuyet/tu-vung/<id>,
 *    /p/ly-thuyet/tu-vung/han-tu/<chữ Hán> (chữ có ít nhất một từ chứa nó), /blog/<slug>
 */
import { listPrograms } from "../db/programs";
import { listExams } from "../exam/source";
import {
  listCompareGroups,
  listGrammar,
  listHanja,
  listVocab,
  type LexiconSourceOptions,
} from "../lexicon/source";
import { listPracticeTypes } from "../practice/source";
import { listWritingTypes } from "../practice/writing-source";
import { BLOG_CATEGORY_CODES } from "./types";

export interface BlogLinkIndexOptions {
  /** Slug các bài blog (tên file). */
  blogSlugs: readonly string[];
  /** Thư mục content gốc. Mặc định: `<cwd>/content`. */
  contentRoot?: string;
}

/** Slug URL của kỹ năng (khớp components/config/taxonomy.ts). */
const SKILL_URL = { listening: "nghe", reading: "doc", writing: "viet" } as const;
const EXAM_KIND_URLS = ["full", "mini", "hard", "ibt"] as const;

export function buildBlogLinkIndex(options: BlogLinkIndexOptions): Set<string> {
  const index = new Set<string>(["/", "/blog", "/nang-cap", "/tai-khoan"]);
  for (const code of BLOG_CATEGORY_CODES) index.add(`/blog/chuyen-muc/${code}`);
  for (const slug of options.blogSlugs) index.add(`/blog/${slug}`);

  const source: LexiconSourceOptions & { includeDrafts: boolean } = {
    includeDrafts: true,
    ...(options.contentRoot ? { contentRoot: options.contentRoot } : {}),
  };

  // Các nguồn in console.warn cho file lỗi; lỗi đó đã được báo ở phần kiểm tra chính.
  const warn = console.warn;
  console.warn = () => {};
  try {
    for (const program of listPrograms()) {
      const p = `/${program.code}`;
      index.add(p);
      for (const rest of [
        "lo-trinh",
        "lo-trinh/test-trinh-do",
        "luyen-tap",
        "de-thi",
        "ly-thuyet",
      ]) {
        index.add(`${p}/${rest}`);
      }
      for (const slug of Object.values(SKILL_URL)) index.add(`${p}/luyen-tap/${slug}`);
      for (const kind of EXAM_KIND_URLS) index.add(`${p}/de-thi/${kind}`);
      for (const rest of ["ngu-phap", "tu-vung", "nguon", "tu-vung/han-tu"]) {
        index.add(`${p}/ly-thuyet/${rest}`);
      }

      for (const type of listPracticeTypes(program.code, undefined, source)) {
        const slug = SKILL_URL[type.skill as keyof typeof SKILL_URL];
        if (slug) index.add(`${p}/luyen-tap/${slug}/${type.type_code}`);
      }
      for (const type of listWritingTypes(program.code, source)) {
        index.add(`${p}/luyen-tap/${SKILL_URL.writing}/${type.type_code}`);
      }
      for (const kind of EXAM_KIND_URLS) {
        for (const exam of listExams(program.code, kind, source)) {
          index.add(`${p}/de-thi/${kind}/${exam.id}`);
        }
      }
      for (const point of listGrammar(program.code, {}, source)) {
        index.add(`${p}/ly-thuyet/ngu-phap/${point.slug}`);
      }
      for (const group of listCompareGroups(program.code, source)) {
        index.add(`${p}/ly-thuyet/ngu-phap/nhom/${group.slug}`);
      }
      for (const word of listVocab(program.code, {}, source)) {
        index.add(`${p}/ly-thuyet/tu-vung/${word.id}`);
      }
      for (const entry of listHanja(program.code, source)) {
        index.add(`${p}/ly-thuyet/tu-vung/han-tu/${entry.hanja}`);
      }
    }
  } finally {
    console.warn = warn;
  }
  return index;
}
