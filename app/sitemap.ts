import type { MetadataRoute } from "next";
import { blogCategoryPath, blogPostPath } from "@/components/blog/seo";
import { isProgramOpen, PROGRAMS } from "@/components/config/programs";
import { absoluteUrl, getSiteUrl } from "@/components/config/site";
import { EXAM_KINDS, SKILLS } from "@/components/config/taxonomy";
import { getBlogCategories, getBlogPosts } from "@/lib/blog/queries";
import { getExams } from "@/lib/exam/queries";
import {
  getCompareGroups,
  getGrammarList,
  getHanjaList,
  getVocabList,
} from "@/lib/lexicon/queries";
import { getPracticeTypes } from "@/lib/practice/queries";
import { getWritingTypes } from "@/lib/practice/writing-queries";

type Entry = MetadataRoute.Sitemap[number];

/** Trang trụ dùng chung toàn site. Trang cá nhân (tài khoản) không đưa vào. */
const GLOBAL_PATHS = ["/", "/blog", "/nang-cap"];

/** Trang trụ và trang tổng hợp trong một chương trình đang mở. */
const PROGRAM_PATHS = [
  "",
  "/ly-thuyet",
  "/ly-thuyet/ngu-phap",
  "/ly-thuyet/tu-vung",
  "/ly-thuyet/tu-vung/han-tu",
  "/ly-thuyet/nguon",
  "/lo-trinh",
  "/lo-trinh/test-trinh-do",
  "/luyen-tap",
  "/de-thi",
];

/**
 * Sơ đồ site: trang trụ, lý thuyết, luyện tập, đề thi đã xuất bản và bài blog đã xuất bản.
 * Bài nháp, chuyên mục rỗng và đề nháp không có trong sitemap. Địa chỉ gốc: NEXT_PUBLIC_SITE_URL.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const entries: Entry[] = [];
  const add = (path: string, lastModified?: string) => {
    entries.push({ url: absoluteUrl(path, siteUrl), ...(lastModified ? { lastModified } : {}) });
  };

  for (const path of GLOBAL_PATHS) add(path);

  // Chỉ bài đã xuất bản; chuyên mục chỉ vào sitemap khi có ít nhất một bài đã xuất bản.
  const published = (await getBlogPosts()).filter((post) => post.status === "published");
  for (const category of await getBlogCategories()) {
    if (published.some((post) => post.category.code === category.code)) {
      add(blogCategoryPath(category.code));
    }
  }
  for (const post of published) {
    add(blogPostPath(post.slug), post.updated_at ?? post.published_at ?? undefined);
  }

  for (const program of PROGRAMS.filter(isProgramOpen)) {
    const base = `/${program.slug}`;
    for (const path of PROGRAM_PATHS) add(`${base}${path}`);

    // Luyện tập: mỗi kỹ năng một trang, mỗi dạng đang có câu / đề một trang.
    for (const skill of SKILLS) add(`${base}/luyen-tap/${skill.slug}`);
    const [readingTypes, listeningTypes, writingTypes] = await Promise.all([
      getPracticeTypes(program.slug, "reading"),
      getPracticeTypes(program.slug, "listening"),
      getWritingTypes(program.slug),
    ]);
    const typeSlug = (code: string) => SKILLS.find((s) => s.typePrefix === code[0])?.slug;
    for (const type of [...readingTypes, ...listeningTypes, ...writingTypes]) {
      const skill = typeSlug(type.type_code);
      if (skill) add(`${base}/luyen-tap/${skill}/${type.type_code}`);
    }

    // Đề thi: chỉ đề đã xuất bản (đề nháp là "Đề mẫu") và loại đề có ít nhất một đề như vậy;
    // trang loại đề chưa có đề là trang "Sắp ra mắt" nên không đưa vào.
    const publishedExams = (await getExams(program.slug)).filter((e) => e.status === "published");
    for (const kind of EXAM_KINDS) {
      if (publishedExams.some((e) => e.kind === kind.slug)) add(`${base}/de-thi/${kind.slug}`);
    }
    for (const exam of publishedExams) add(`${base}/de-thi/${exam.kind}/${exam.id}`);

    // Lý thuyết: ngữ pháp, nhóm so sánh, từ vựng, chữ Hán.
    const [grammar, groups, vocab, hanja] = await Promise.all([
      getGrammarList(program.slug),
      getCompareGroups(program.slug),
      getVocabList(program.slug),
      getHanjaList(program.slug),
    ]);
    for (const point of grammar) add(`${base}/ly-thuyet/ngu-phap/${point.slug}`);
    for (const group of groups) add(`${base}/ly-thuyet/ngu-phap/nhom/${group.slug}`);
    for (const word of vocab) add(`${base}/ly-thuyet/tu-vung/${word.id}`);
    for (const entry of hanja) {
      add(`${base}/ly-thuyet/tu-vung/han-tu/${encodeURIComponent(entry.hanja)}`);
    }
  }

  return entries;
}
