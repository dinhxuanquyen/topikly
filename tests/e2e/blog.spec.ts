import { expect, test, type Locator, type Page } from "@playwright/test";
import { BLOG_CATEGORIES } from "../../lib/blog/types";

/**
 * E2E Blog và Landing (docs/blog-spec.md mục 7): danh sách + bộ lọc chuyên mục (là link), trang chuyên
 * mục, trang bài (H1, ngày, thời gian đọc, nhãn Bản nháp / Chưa duyệt, mục lục neo kể cả id chữ Hàn,
 * bảng cuộn ngang trong khung, khung mẹo, link nội bộ / ngoài, "Luyện tiếp trên Topikly", "Nguồn tham
 * khảo", bài cùng chuyên mục), 404, SEO (canonical, og:type article, JSON-LD Article, noindex cho
 * bản nháp, sitemap.xml, robots.txt) và khối "Bắt đầu từ đâu" + "Bài viết mới" ở trang chủ.
 *
 * Nội dung bài KHÔNG hard-code (đội nội dung còn sửa): slug, tiêu đề, số bài, trạng thái đọc từ
 * /blog và từ chính trang bài. Chỉ gắn cứng cấu trúc ổn định (nhãn giao diện, 7 mã chuyên mục lấy
 * từ lib/blog/types.ts). Mỗi test dùng browser context mới.
 *
 * Ghi chú về địa chỉ gốc: canonical / sitemap dùng NEXT_PUBLIC_SITE_URL (mặc định http://localhost:3000
 * khi không đặt) nên test chỉ so phần ĐƯỜNG DẪN, không so origin với cổng E2E.
 */

const PROGRAM = "topik-ii";
const CATEGORY_CODES = BLOG_CATEGORIES.map((c) => c.code);
const CATEGORY_NAME = Object.fromEntries(BLOG_CATEGORIES.map((c) => [c.code, c.name_vi]));

const NOT_FOUND = (page: Page) =>
  page.getByRole("heading", { level: 1, name: "Không tìm thấy trang" });

interface PostCard {
  slug: string;
  title: string;
  href: string;
  draft: boolean;
  text: string;
}

// ------------------------------------------------------------------ tiện ích

/** Đọc danh sách bài từ /blog (slug, tiêu đề, nháp hay không). */
async function readIndex(page: Page): Promise<PostCard[]> {
  await page.goto("/blog");
  return readCards(page.getByRole("list", { name: "Danh sách bài viết" }));
}

async function readCards(list: Locator): Promise<PostCard[]> {
  const items = list.getByRole("listitem");
  const count = await items.count();
  const cards: PostCard[] = [];
  for (let i = 0; i < count; i += 1) {
    const item = items.nth(i);
    const link = item.getByRole("link").first();
    const href = (await link.getAttribute("href"))!;
    const text = await item.innerText();
    cards.push({
      slug: href.replace(/^\/blog\//, ""),
      title: (await item.getByRole("heading", { level: 3 }).innerText()).trim(),
      href,
      draft: text.includes("Bản nháp"),
      text,
    });
  }
  return cards;
}

async function expectNoHorizontalOverflow(page: Page, where: string) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth, `${where} tràn ngang (${scrollWidth} > ${innerWidth})`).toBeLessThanOrEqual(
    innerWidth,
  );
}

/**
 * Thứ tự tiêu đề: đúng một h1 và không nhảy cấp (h2 -> h4). Chỉ tính tiêu đề đang hiển thị: sau khi
 * chuyển trang phía client, Next giữ trang trước ở trạng thái ẩn (Activity) trong cùng <main>.
 */
async function expectHeadingOutline(page: Page, where: string) {
  const levels = await page.evaluate(() =>
    [...document.querySelectorAll("main h1, main h2, main h3, main h4, main h5, main h6")]
      .filter((h) => h.checkVisibility())
      .map((h) => Number(h.tagName[1])),
  );
  expect(
    levels.filter((l) => l === 1),
    `${where}: phải có đúng một h1`,
  ).toHaveLength(1);
  levels.forEach((level, index) => {
    if (index > 0) {
      expect(
        level - levels[index - 1]!,
        `${where}: tiêu đề nhảy cấp ${levels.join("")}`,
      ).toBeLessThanOrEqual(1);
    }
  });
}

/** Theo dõi lỗi chạy (hydration, exception) trong lúc duyệt. */
function collectRuntimeErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console.error: ${message.text()}`);
  });
  return errors;
}

async function metaContent(page: Page, selector: string) {
  const el = page.locator(selector).first();
  return (await el.count()) === 0 ? null : await el.getAttribute("content");
}

async function robotsMeta(page: Page): Promise<string> {
  return (await metaContent(page, 'meta[name="robots"]')) ?? "";
}

/** Mở trang bài và trả về dữ liệu đọc từ DOM (không biết trước nội dung). */
async function openPost(page: Page, slug: string) {
  const response = await page.goto(`/blog/${slug}`);
  expect(response?.status(), slug).toBe(200);
  await expect(page.getByRole("heading", { level: 1 }), slug).toBeVisible();
  return page.locator("article");
}

/** Địa chỉ nội bộ duy nhất (bỏ #neo), để kiểm tra mở được. */
function uniq<T>(items: T[]): T[] {
  return [...new Set(items)];
}

// ------------------------------------------------------------------ /blog và chuyên mục

test.describe("Blog — danh sách và chuyên mục", () => {
  test("/blog: H1, mỗi thẻ là một liên kết tới /blog/<slug> với thời gian đọc; nhãn Bản nháp; không tràn ngang", async ({
    page,
  }) => {
    const errors = collectRuntimeErrors(page);
    const cards = await readIndex(page);
    await expect(page.getByRole("heading", { level: 1, name: "Blog và tài liệu" })).toBeVisible();
    expect(cards.length, "phải có ít nhất một bài").toBeGreaterThan(0);

    for (const card of cards) {
      expect(card.href).toMatch(/^\/blog\/[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(card.slug).not.toBe("chuyen-muc");
      expect(card.text, card.slug).toMatch(/\d+ phút đọc/);
      expect(card.title, card.slug).not.toBe("");
    }
    // Slug không trùng; bài đã đăng (không nháp) đứng trước bài nháp.
    expect(uniq(cards.map((c) => c.slug))).toHaveLength(cards.length);
    const firstDraft = cards.findIndex((c) => c.draft);
    if (firstDraft !== -1) {
      expect(
        cards.slice(firstDraft).every((c) => c.draft),
        "bài nháp phải nằm sau cùng",
      ).toBe(true);
    }
    // Bản nháp luôn kèm nhãn chữ "Chưa duyệt" khi chưa có người duyệt: ít nhất một bài hiện cả hai nhãn.
    const draftCards = cards.filter((c) => c.draft);
    if (draftCards.length > 0) {
      expect(draftCards.some((c) => c.text.includes("Chưa duyệt"))).toBe(true);
    }

    await expectHeadingOutline(page, "/blog");
    await expectNoHorizontalOverflow(page, "/blog");
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("Bộ lọc chuyên mục là các liên kết: 'Tất cả' đang chọn, tổng số khớp, mỗi chip dẫn tới đúng URL", async ({
    page,
  }) => {
    const cards = await readIndex(page);
    const filter = page.getByRole("navigation", { name: "Lọc bài viết theo chuyên mục" });
    const all = filter.getByRole("link", { name: /^Tất cả/ });
    await expect(all).toHaveAttribute("href", "/blog");
    await expect(all).toHaveAttribute("aria-current", "page");
    await expect(all).toContainText(String(cards.length));

    const chips = filter.getByRole("link").filter({ hasNotText: /^Tất cả/ });
    const chipCount = await chips.count();
    expect(chipCount, "phải có chuyên mục có bài").toBeGreaterThan(0);
    let sum = 0;
    for (let i = 0; i < chipCount; i += 1) {
      const chip = chips.nth(i);
      const href = (await chip.getAttribute("href"))!;
      const code = href.replace("/blog/chuyen-muc/", "");
      expect(CATEGORY_CODES, `chip ${href}`).toContain(code);
      await expect(chip).not.toHaveAttribute("aria-current", "page");
      // Tên truy cập có số bài: "Viết, 2 bài".
      const name = (await chip.getAttribute("aria-label"))!;
      const match = name.match(new RegExp(`^${CATEGORY_NAME[code]!}, (\\d+) bài$`));
      expect(match, `aria-label chip: ${name}`).not.toBeNull();
      sum += Number(match![1]);
    }
    expect(sum, "tổng bài các chuyên mục bằng tổng 'Tất cả'").toBe(cards.length);
  });

  test("Bấm chuyên mục: URL /blog/chuyen-muc/<mã>, H1 là tên chuyên mục, chỉ bài thuộc mục, breadcrumb, quay lại 'Tất cả'", async ({
    page,
  }) => {
    await readIndex(page);
    const filter = page.getByRole("navigation", { name: "Lọc bài viết theo chuyên mục" });
    const chip = filter
      .getByRole("link")
      .filter({ hasNotText: /^Tất cả/ })
      .first();
    const href = (await chip.getAttribute("href"))!;
    const code = href.replace("/blog/chuyen-muc/", "") as keyof typeof CATEGORY_NAME;
    await chip.click();
    await expect(page).toHaveURL(new RegExp(`/blog/chuyen-muc/${code}$`));
    await expect(page.getByRole("heading", { level: 1, name: CATEGORY_NAME[code]! })).toBeVisible();
    await expect(
      filter.getByRole("link", { name: new RegExp(`^${CATEGORY_NAME[code]!}, \\d+ bài$`) }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      page
        .getByRole("navigation", { name: "Đường dẫn" })
        .getByRole("link", { name: "Blog và tài liệu" }),
    ).toHaveAttribute("href", "/blog");

    const cards = await readCards(page.getByRole("list", { name: "Danh sách bài viết" }));
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) expect(card.text, card.slug).toContain(CATEGORY_NAME[code]!);
    await expectHeadingOutline(page, href);

    await filter.getByRole("link", { name: /^Tất cả/ }).click();
    await expect(page).toHaveURL(/\/blog$/);
    await expect(page.getByRole("heading", { level: 1, name: "Blog và tài liệu" })).toBeVisible();
  });

  test("Cả 7 mã chuyên mục mở được; chuyên mục rỗng báo 'chưa có bài' + link về tất cả và noindex", async ({
    page,
  }) => {
    expect(CATEGORY_CODES).toHaveLength(7);
    for (const category of BLOG_CATEGORIES) {
      const url = `/blog/chuyen-muc/${category.code}`;
      const response = await page.goto(url);
      expect(response?.status(), url).toBe(200);
      await expect(
        page.getByRole("heading", { level: 1, name: category.name_vi }),
        url,
      ).toBeVisible();
      const listCount = await page.getByRole("list", { name: "Danh sách bài viết" }).count();
      if (listCount === 0) {
        await expect(page.getByText("Chưa có bài trong chuyên mục này."), url).toBeVisible();
        await expect(page.getByRole("link", { name: "Xem tất cả bài viết" }), url).toHaveAttribute(
          "href",
          "/blog",
        );
        expect(await robotsMeta(page), `${url}: chuyên mục rỗng phải noindex`).toContain("noindex");
      } else {
        expect(
          await robotsMeta(page),
          `${url}: chuyên mục có bài không được noindex`,
        ).not.toContain("noindex");
      }
      await expect(page.locator('link[rel="canonical"]'), url).toHaveAttribute(
        "href",
        new RegExp(`${url}$`),
      );
      await expectNoHorizontalOverflow(page, url);
    }
  });

  test("Mã chuyên mục lạ, /blog/chuyen-muc trần và slug lạ cho giao diện 404 (noindex, không lộ nội dung)", async ({
    page,
  }) => {
    const missing = [
      "/blog/chuyen-muc",
      "/blog/chuyen-muc/khong-co",
      "/blog/chuyen-muc/%3Cscript%3Ealert(1)%3C%2Fscript%3E",
      "/blog/chuyen-muc/viet/khong-co",
      "/blog/khong-co-bai-nay",
      "/blog/%3Cscript%3Ealert(1)%3C%2Fscript%3E",
      "/blog/bai-khong-ton-tai/phu",
      // Phân biệt hoa thường. Bỏ trên Windows: hệ thống file không phân biệt hoa thường nên
      // `next start` có thể trả file prerender của mã thật (CI chạy Linux vẫn kiểm).
      ...(process.platform === "win32"
        ? []
        : ["/blog/chuyen-muc/VIET", "/blog/CAU-TRUC-DE-TOPIK-II"]),
    ];
    for (const url of missing) {
      await page.goto(url);
      await expect(NOT_FOUND(page), url).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Về trang chủ", exact: true }),
        url,
      ).toHaveAttribute("href", "/");
      expect(await robotsMeta(page), url).toContain("noindex");
      // Không có bài nào bị lộ trên trang 404.
      await expect(page.getByRole("list", { name: "Danh sách bài viết" }), url).toHaveCount(0);
    }
  });

  test("HTTP 404 thật ngay lần truy cập đầu tới slug / mã chuyên mục chưa từng gọi (tránh soft 404 cho crawler)", async ({
    request,
  }, testInfo) => {
    // LỖI ĐÃ BIẾT (xem báo cáo QA): với `next start`, lần GET đầu tiên tới một đường dẫn động lạ trả
    // 200 kèm giao diện 404 (PPR "postponed"), từ lần thứ hai mới trả 404. test.fail() để bộ test xanh
    // nhưng báo ngay khi frontend sửa xong (khi đó test này "đột ngột pass" và phải gỡ test.fail).
    test.fail(true, "soft 404 ở lần gọi đầu: blog/[slug] và blog/chuyen-muc/[category]");
    const nonce = `${testInfo.project.name}-${Date.now()}`;
    for (const url of [`/blog/khong-co-${nonce}`, `/blog/chuyen-muc/khong-co-${nonce}`]) {
      const response = await request.get(url);
      expect(response.status(), url).toBe(404);
    }
  });
});

// ------------------------------------------------------------------ trang bài

test.describe("Blog — trang bài", () => {
  test("Mỗi bài: H1 khớp thẻ, thời gian đọc, chuyên mục dẫn đúng URL, ngày hợp lệ, nhãn Bản nháp khớp noindex, cấu trúc tiêu đề, không tràn ngang", async ({
    page,
  }) => {
    const errors = collectRuntimeErrors(page);
    const cards = await readIndex(page);
    let sawUnreviewed = false;

    for (const card of cards) {
      const article = await openPost(page, card.slug);
      await expect(page.getByRole("heading", { level: 1 }), card.slug).toHaveText(card.title);

      const header = article.locator("header");
      await expect(header, card.slug).toContainText(/\d+ phút đọc/);
      const categoryLink = header.getByRole("link").first();
      const categoryHref = (await categoryLink.getAttribute("href"))!;
      expect(categoryHref, card.slug).toMatch(/^\/blog\/chuyen-muc\/[a-z-]+$/);
      expect(CATEGORY_CODES).toContain(categoryHref.replace("/blog/chuyen-muc/", ""));

      // Ngày: chỉ bắt buộc khi bài có ngày; nếu có thì là YYYY-MM-DD.
      const dates = await header
        .locator("time")
        .evaluateAll((els) => els.map((el) => el.getAttribute("datetime")));
      for (const date of dates) expect(date, card.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (dates.length > 0) await expect(header.locator("time").first()).toContainText(/\d/);

      // Nhãn nháp <-> noindex <-> ghi chú. Khi nháp, người học thấy nhãn chữ và ghi chú role=note.
      const robots = await robotsMeta(page);
      if (card.draft) {
        await expect(header.getByText("Bản nháp", { exact: true }), card.slug).toBeVisible();
        expect(robots, `${card.slug}: bản nháp phải noindex`).toContain("noindex");
        await expect(header.getByRole("note"), card.slug).toContainText("bản nháp");
      } else {
        await expect(header.getByText("Bản nháp", { exact: true }), card.slug).toHaveCount(0);
        expect(robots, `${card.slug}: bài đã đăng không được noindex`).not.toContain("noindex");
      }
      if ((await header.getByText("Chưa duyệt", { exact: true }).count()) > 0) sawUnreviewed = true;

      await expectHeadingOutline(page, card.slug);
      await expectNoHorizontalOverflow(page, card.slug);

      // Không lộ trường nội bộ trong HTML trả về.
      const html = await page.content();
      for (const field of ["notes_internal", "reviewed_by", "authored_by"]) {
        expect(html, `${card.slug}: lộ ${field}`).not.toContain(field);
      }
    }
    expect(sawUnreviewed, "ít nhất một bài hiện nhãn 'Chưa duyệt'").toBe(true);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("Mục lục: số mục = số H2 thân bài, mỗi link là #neo có thật (kể cả id chữ Hàn), nhảy đúng bằng Enter, tiêu đề không bị thanh trên che", async ({
    page,
  }) => {
    const cards = await readIndex(page);
    let checkedLinks = 0;

    for (const card of cards) {
      const article = await openPost(page, card.slug);
      const toc = article.getByRole("navigation", { name: "Mục lục" });
      const bodyH2 = article.locator("h2:not(nav h2)");
      const h2Texts = await bodyH2.allInnerTexts();
      // Dưới 2 mục thì không hiện mục lục (theo thiết kế).
      if (h2Texts.length < 2) {
        await expect(toc, card.slug).toHaveCount(0);
        continue;
      }
      await expect(toc.getByRole("heading", { level: 2, name: "Mục lục" })).toBeVisible();
      const links = toc.getByRole("link");
      // Mục lục chỉ liệt kê H2 thuộc thân bài; sau thân bài còn H2 của khối "Luyện tiếp..." nên
      // lấy các H2 có id trùng một neo mục lục.
      const entries = await links.evaluateAll((els) =>
        els.map((a) => ({ href: a.getAttribute("href")!, text: (a.textContent ?? "").trim() })),
      );
      expect(entries.length, card.slug).toBeGreaterThanOrEqual(2);

      const ids = await page.evaluate(() =>
        [...document.querySelectorAll("[id]")].map((el) => el.id),
      );
      expect(uniq(ids), `${card.slug}: id trùng`).toHaveLength(ids.length);

      const headerBottom = await page
        .locator("body > header")
        .evaluate((el) => el.getBoundingClientRect().bottom);
      for (let i = 0; i < entries.length; i += 1) {
        const { href, text } = entries[i]!;
        expect(href, card.slug).toMatch(/^#.+/);
        const id = decodeURIComponent(href.slice(1));
        const heading = page.locator("article h2, article h3").and(page.locator(`[id="${id}"]`));
        await expect(heading, `${card.slug}: không có tiêu đề id="${id}"`).toHaveCount(1);
        await expect(heading, `${card.slug}: chữ mục lục khác tiêu đề`).toHaveText(text);

        await links.nth(i).focus();
        await page.keyboard.press("Enter");
        await expect
          .poll(() => page.evaluate(() => decodeURIComponent(location.hash)), {
            message: `${card.slug}: hash sau khi Enter`,
          })
          .toBe(`#${id}`);
        await expect(heading).toBeInViewport();
        await expect
          .poll(() => heading.evaluate((el) => el.getBoundingClientRect().top), {
            message: `${card.slug}: tiêu đề "${id}" bị thanh trên che`,
          })
          .toBeGreaterThanOrEqual(headerBottom - 1);
        checkedLinks += 1;
      }
    }
    expect(checkedLinks, "phải kiểm ít nhất một mục lục").toBeGreaterThan(0);
  });

  test("Bảng: nằm trong khung role=region tabindex=0 có nhãn, Tab tới được, mũi tên cuộn ngang trong khung, trang không cuộn ngang; thẻ <th scope=col>", async ({
    page,
  }, testInfo) => {
    const cards = await readIndex(page);
    let tables = 0;
    let scrollable = 0;

    for (const card of cards) {
      await openPost(page, card.slug);
      const frames = page.locator("article").getByRole("region", {
        name: /^Bảng \d+: /,
      });
      const count = await frames.count();
      for (let i = 0; i < count; i += 1) {
        const frame = frames.nth(i);
        tables += 1;
        await expect(frame, card.slug).toHaveAttribute("tabindex", "0");
        await expect(frame.locator("table"), card.slug).toHaveCount(1);
        const nonScopedHeaders = await frame.locator("thead th:not([scope='col'])").count();
        expect(nonScopedHeaders, `${card.slug}: <th> thiếu scope=col`).toBe(0);

        await frame.scrollIntoViewIfNeeded();
        // Đưa focus tới phần tử focus được ngay trước khung rồi Tab một lần: phải rơi vào khung.
        await frame.evaluate((el) => {
          const sel =
            'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
          const all = [...document.querySelectorAll<HTMLElement>(sel)].filter(
            (e) => e.offsetParent !== null || getComputedStyle(e).position === "fixed",
          );
          const idx = all.indexOf(el as HTMLElement);
          (idx > 0 ? all[idx - 1]! : document.body).focus();
        });
        await page.keyboard.press("Tab");
        await expect(frame, `${card.slug}: Tab không tới khung bảng #${i}`).toBeFocused();
        // Viền focus nhìn thấy được (ring dựng bằng box-shadow).
        expect(
          await frame.evaluate((el) => getComputedStyle(el).boxShadow),
          `${card.slug}: khung bảng không có viền focus`,
        ).not.toBe("none");

        const sizes = await frame.evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }));
        if (sizes.sw > sizes.cw) {
          scrollable += 1;
          await page.keyboard.press("ArrowRight");
          await expect
            .poll(() => frame.evaluate((el) => el.scrollLeft), {
              message: `${card.slug}: ArrowRight không cuộn khung bảng`,
            })
            .toBeGreaterThan(0);
        }
        // Dù bảng rộng thế nào, chỉ khung cuộn: trang không cuộn ngang, khung không vượt khung nhìn.
        await expectNoHorizontalOverflow(page, `${card.slug} (bảng #${i})`);
        const box = (await frame.boundingBox())!;
        const viewport = page.viewportSize()!;
        expect(box.x + box.width, `${card.slug}: khung bảng vượt khung nhìn`).toBeLessThanOrEqual(
          viewport.width + 1,
        );
      }
    }
    expect(tables, "các bài mẫu phải có ít nhất một bảng").toBeGreaterThan(0);
    if (testInfo.project.name === "mobile") {
      expect(
        scrollable,
        "ở 375px phải có bảng rộng hơn khung (cuộn ngang trong khung)",
      ).toBeGreaterThan(0);
    }
  });

  test("Khung mẹo role=note có nhãn; chữ Hàn có lang=ko + keep-all và không bị vỡ giữa từ khi xuống dòng", async ({
    page,
  }) => {
    const cards = await readIndex(page);
    let notes = 0;
    let hangulSpans = 0;

    for (const card of cards) {
      const article = await openPost(page, card.slug);
      const tips = article.getByRole("note", { name: "Mẹo / lưu ý" });
      notes += await tips.count();
      // Ghi chú "Bản nháp" cũng là role=note nhưng không có tên "Mẹo / lưu ý": khung mẹo nằm trong thân bài.
      for (const icon of await tips.locator("svg").all()) {
        await expect(icon, `${card.slug}: biểu tượng khung mẹo phải aria-hidden`).toHaveAttribute(
          "aria-hidden",
          "true",
        );
      }

      const ko = article.locator('[lang="ko"]');
      const koCount = await ko.count();
      hangulSpans += koCount;
      if (koCount > 0) await expect(ko.first(), card.slug).toHaveCSS("word-break", "keep-all");

      // Mỗi cụm Hangul liền nhau phải nằm gọn trên một dòng (Range.getClientRects không đổi top).
      const broken = await page.evaluate(() => {
        const root = document.querySelector("article")!;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const bad: string[] = [];
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const text = node.textContent ?? "";
          for (const m of text.matchAll(/[ㄱ-ㅣ가-힣]+/g)) {
            const range = document.createRange();
            range.setStart(node, m.index!);
            range.setEnd(node, m.index! + m[0].length);
            const tops = new Set([...range.getClientRects()].map((r) => Math.round(r.top)));
            if (tops.size > 1) bad.push(m[0]);
          }
        }
        return bad;
      });
      expect(broken, `${card.slug}: chữ Hàn bị vỡ dòng giữa từ`).toEqual([]);
      await expectNoHorizontalOverflow(page, card.slug);
    }
    expect(notes, "các bài mẫu phải có ít nhất một khung mẹo").toBeGreaterThan(0);
    expect(hangulSpans, "các bài mẫu phải có chữ Hàn gắn lang=ko").toBeGreaterThan(0);
  });

  test("Liên kết trong bài: ngoài = https + target=_blank + rel noopener noreferrer + báo 'mở trong tab mới'; nội bộ bắt đầu bằng '/'; không có href nguy hiểm", async ({
    page,
  }) => {
    const cards = await readIndex(page);
    let external = 0;

    for (const card of cards) {
      await openPost(page, card.slug);
      const links = await page.locator("article a[href], main section a[href]").evaluateAll((els) =>
        els.map((a) => ({
          href: a.getAttribute("href")!,
          target: a.getAttribute("target"),
          rel: a.getAttribute("rel"),
          text: (a.textContent ?? "").trim(),
        })),
      );
      for (const link of links) {
        const where = `${card.slug}: ${link.href}`;
        expect(link.href, where).not.toMatch(/^\s*(javascript|data|vbscript):/i);
        expect(link.href, where).not.toMatch(/^\/\//);
        expect(link.href, where).not.toMatch(/\\/);
        expect(link.href, where).not.toMatch(/^http:\/\//i);
        expect(link.text, `${where}: link không có chữ`).not.toBe("");
        if (/^https:\/\//.test(link.href)) {
          external += 1;
          expect(link.target, where).toBe("_blank");
          expect(link.rel ?? "", where).toContain("noopener");
          expect(link.rel ?? "", where).toContain("noreferrer");
          expect(link.text, `${where}: thiếu báo mở tab mới cho trình đọc màn hình`).toContain(
            "mở trong tab mới",
          );
        } else {
          expect(link.href, where).toMatch(/^[/#]/);
          expect(link.target, `${where}: link nội bộ không được mở tab mới`).toBeNull();
        }
      }
    }
    expect(external, "các bài mẫu phải có link ngoài").toBeGreaterThan(0);
  });

  test("Khối 'Luyện tiếp trên Topikly', 'Nguồn tham khảo' và 'Bài cùng chuyên mục'", async ({
    page,
  }) => {
    const cards = await readIndex(page);
    const filter = page.getByRole("navigation", { name: "Lọc bài viết theo chuyên mục" });
    const categoryOf: Record<string, string> = {};
    const members: Record<string, string[]> = {};
    for (const href of await filter
      .getByRole("link")
      .filter({ hasNotText: /^Tất cả/ })
      .evaluateAll((els) => els.map((a) => a.getAttribute("href")!))) {
      await page.goto(href);
      const inCategory = await readCards(page.getByRole("list", { name: "Danh sách bài viết" }));
      members[href] = inCategory.map((c) => c.slug);
      for (const c of inCategory) categoryOf[c.slug] = href;
    }

    let sawRelated = 0;
    let sawSources = 0;
    let sawSame = 0;
    for (const card of cards) {
      const article = await openPost(page, card.slug);
      void article;

      const related = page.getByRole("region", { name: "Luyện tiếp trên Topikly" });
      if ((await related.count()) > 0) {
        sawRelated += 1;
        const hrefs = await related
          .getByRole("link")
          .evaluateAll((els) => els.map((a) => a.getAttribute("href")!));
        expect(hrefs.length, card.slug).toBeGreaterThan(0);
        for (const href of hrefs) expect(href, card.slug).toMatch(/^\/(topik-ii|blog)(\/|$)/);
        expect(uniq(hrefs), `${card.slug}: related trùng`).toHaveLength(hrefs.length);
      }

      const sources = page.getByRole("region", { name: "Nguồn tham khảo" });
      if ((await sources.count()) > 0) {
        sawSources += 1;
        for (const link of await sources.getByRole("link").all()) {
          await expect(link).toHaveAttribute("href", /^https:\/\//);
          await expect(link).toHaveAttribute("target", "_blank");
          await expect(link).toHaveAttribute("rel", /noopener noreferrer/);
        }
      }

      const same = page.getByRole("region", { name: "Bài cùng chuyên mục" });
      const peers = (members[categoryOf[card.slug]!] ?? []).filter((s) => s !== card.slug);
      if (peers.length > 0) {
        await expect(same, `${card.slug}: thiếu 'Bài cùng chuyên mục'`).toBeVisible();
        sawSame += 1;
        const hrefs = await same
          .getByRole("link")
          .evaluateAll((els) => els.map((a) => a.getAttribute("href")!));
        expect(hrefs, `${card.slug}: bài tự liệt kê chính nó`).not.toContain(`/blog/${card.slug}`);
        expect(hrefs.length).toBeLessThanOrEqual(3);
        expect(
          peers.some((s) => hrefs.includes(`/blog/${s}`)),
          `${card.slug}: không có bài cùng chuyên mục nào trong khối`,
        ).toBe(true);
      }
      // Cuối bài có link về danh sách.
      await expect(
        page.getByRole("link", { name: "Tất cả bài viết", exact: true }),
      ).toHaveAttribute("href", "/blog");
    }
    expect(sawRelated, "phải có bài có 'Luyện tiếp trên Topikly'").toBeGreaterThan(0);
    expect(sawSources, "phải có bài có 'Nguồn tham khảo'").toBeGreaterThan(0);
    expect(sawSame, "phải có bài có 'Bài cùng chuyên mục'").toBeGreaterThan(0);
  });

  test("Mọi link nội bộ trong các bài (thân bài, related, bài cùng mục) mở được, không phải 404", async ({
    page,
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "kiểm tra link không phụ thuộc cỡ màn hình");
    test.setTimeout(180_000);
    const cards = await readIndex(page);
    const hrefs: string[] = [];
    for (const card of cards) {
      await openPost(page, card.slug);
      hrefs.push(
        ...(await page
          .locator("main a[href^='/']")
          .evaluateAll((els) => els.map((a) => a.getAttribute("href")!))),
      );
    }
    // Bỏ link chrome (header / tab bar nằm ngoài <main>) bằng cách chỉ lấy trong <main>; bỏ neo.
    const targets = uniq(hrefs.map((h) => h.split("#")[0]!).filter((h) => h !== ""));
    expect(targets.length).toBeGreaterThan(0);

    const broken: string[] = [];
    for (const href of targets) {
      const status = (await request.get(href)).status();
      if (status !== 200) {
        broken.push(`${status} ${href}`);
        continue;
      }
      // Trang 404 của Next đôi khi vẫn trả 200 ở lần gọi đầu, nên mở thật bằng trình duyệt.
      await page.goto(href);
      const notFound = await NOT_FOUND(page).count();
      const h1 = await page.getByRole("heading", { level: 1 }).count();
      if (notFound > 0 || h1 === 0) broken.push(`giao diện 404 ${href}`);
    }
    expect(broken, `Link nội bộ hỏng:\n${broken.join("\n")}`).toEqual([]);
  });

  test("Link nội bộ trong bài dẫn đi bằng click: bài liên quan mở đúng H1", async ({ page }) => {
    const cards = await readIndex(page);
    for (const card of cards) {
      await openPost(page, card.slug);
      const same = page.getByRole("region", { name: "Bài cùng chuyên mục" });
      if ((await same.count()) === 0) continue;
      const link = same.getByRole("link").first();
      // Liên kết chỉ bao tiêu đề thẻ: tên truy cập của nó chính là tiêu đề bài.
      const title = (await link.innerText()).trim();
      await link.click();
      await expect(page).toHaveURL(/\/blog\/[a-z0-9-]+$/);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
      return;
    }
    throw new Error("không có bài nào có khối 'Bài cùng chuyên mục' để bấm");
  });
});

// ------------------------------------------------------------------ SEO

test.describe("Blog — SEO", () => {
  test("Mỗi bài: canonical đúng đường dẫn, og:type article, og:title/url, JSON-LD Article parse được và khớp trang", async ({
    page,
  }) => {
    const cards = await readIndex(page);
    for (const card of cards) {
      await openPost(page, card.slug);
      const path = `/blog/${card.slug}`;

      const canonical = (await page.locator('link[rel="canonical"]').getAttribute("href"))!;
      expect(new URL(canonical).pathname, `${card.slug}: canonical`).toBe(path);
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);

      expect(await metaContent(page, 'meta[property="og:type"]'), card.slug).toBe("article");
      expect(await metaContent(page, 'meta[property="og:title"]'), card.slug).toBe(card.title);
      const ogUrl = (await metaContent(page, 'meta[property="og:url"]'))!;
      expect(new URL(ogUrl).pathname, `${card.slug}: og:url`).toBe(path);
      expect((await metaContent(page, 'meta[name="description"]')) ?? "", card.slug).not.toBe("");
      await expect(page).toHaveTitle(new RegExp(`^${escapeRegExp(card.title)}`));

      // JSON-LD: đúng một khối, JSON hợp lệ, không có "<" thô (không thoát được thẻ script).
      const scripts = page.locator('script[type="application/ld+json"]');
      await expect(scripts, `${card.slug}: số khối JSON-LD`).toHaveCount(1);
      const raw = (await scripts.first().textContent())!;
      expect(raw, `${card.slug}: JSON-LD chứa '<' chưa thoát`).not.toContain("<");
      const data = JSON.parse(raw) as Record<string, unknown>;
      expect(data["@context"], card.slug).toBe("https://schema.org");
      expect(data["@type"], card.slug).toBe("Article");
      expect(data.headline, card.slug).toBe(card.title);
      expect(data.inLanguage, card.slug).toBe("vi");
      expect(typeof data.description).toBe("string");
      expect(new URL(data.url as string).pathname, `${card.slug}: JSON-LD url`).toBe(path);
      const entity = data.mainEntityOfPage as Record<string, string>;
      expect(new URL(entity["@id"]!).pathname).toBe(path);
      for (const key of ["datePublished", "dateModified"]) {
        if (key in data) expect(data[key], `${card.slug}: ${key}`).toMatch(/^\d{4}-\d{2}-\d{2}/);
      }
      const publisher = data.publisher as Record<string, string>;
      expect(publisher["@type"]).toBe("Organization");
      expect(publisher.name).toBeTruthy();
    }
  });

  test("Trang /blog và chuyên mục có canonical; /blog không noindex", async ({ page }) => {
    await page.goto("/blog");
    expect(
      new URL((await page.locator('link[rel="canonical"]').getAttribute("href"))!).pathname,
    ).toBe("/blog");
    expect(await robotsMeta(page)).not.toContain("noindex");
  });

  test("/sitemap.xml: XML hợp lệ, cùng origin, không trùng, có /blog, KHÔNG có bài nháp / chuyên mục rỗng / đề nháp / tài khoản; mọi URL mở được", async ({
    page,
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "kiểm tra sitemap không phụ thuộc cỡ màn hình");
    test.setTimeout(240_000);
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("xml");
    const xml = await response.text();
    expect(xml).toContain("<urlset");

    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
    expect(locs.length).toBeGreaterThan(5);
    const urls = locs.map((loc) => new URL(loc));
    expect(uniq(urls.map((u) => u.origin)), "mọi <loc> cùng origin").toHaveLength(1);
    expect(uniq(locs), "<loc> trùng").toHaveLength(locs.length);
    for (const url of urls) {
      expect(url.search + url.hash, url.href).toBe("");
      expect(url.pathname, url.href).not.toMatch(/^\/(api|tai-khoan)(\/|$)/);
    }
    const paths = urls.map((u) => u.pathname);
    expect(paths).toContain("/blog");
    expect(paths).toContain("/");

    // Bài nháp (nhãn Bản nháp) không được vào sitemap; bài đã đăng phải vào.
    const cards = await readIndex(page);
    for (const card of cards) {
      if (card.draft)
        expect(paths, `bài nháp ${card.slug} có trong sitemap`).not.toContain(card.href);
      else expect(paths, `bài đã đăng ${card.slug} thiếu trong sitemap`).toContain(card.href);
    }
    // Chuyên mục chỉ vào sitemap khi có ít nhất một bài ĐÃ ĐĂNG.
    const publishedCategories = new Set<string>();
    for (const category of BLOG_CATEGORIES) {
      await page.goto(`/blog/chuyen-muc/${category.code}`);
      const inCategory = (await page.getByRole("list", { name: "Danh sách bài viết" }).count())
        ? await readCards(page.getByRole("list", { name: "Danh sách bài viết" }))
        : [];
      if (inCategory.some((c) => !c.draft)) publishedCategories.add(category.code);
    }
    for (const category of BLOG_CATEGORIES) {
      const path = `/blog/chuyen-muc/${category.code}`;
      if (publishedCategories.has(category.code)) expect(paths).toContain(path);
      else expect(paths, `${path}: chuyên mục không có bài đã đăng`).not.toContain(path);
    }

    // Đề nháp ("Đề mẫu") không vào sitemap; đề đã đăng phải vào.
    const examKinds = paths
      .map((p) => p.match(new RegExp(`^/${PROGRAM}/de-thi/([a-z]+)$`))?.[1])
      .filter((k): k is string => Boolean(k));
    for (const kind of examKinds) {
      await page.goto(`/${PROGRAM}/de-thi/${kind}`);
      const examLinks = page.locator(`main a[href^="/${PROGRAM}/de-thi/${kind}/"]`);
      const exams = await examLinks.evaluateAll((els) =>
        els.map((a) => ({
          href: a.getAttribute("href")!,
          sample: (a.textContent ?? "").includes("Đề mẫu"),
        })),
      );
      for (const exam of exams) {
        if (exam.sample)
          expect(paths, `đề nháp ${exam.href} có trong sitemap`).not.toContain(exam.href);
        else expect(paths, `đề đã đăng ${exam.href} thiếu trong sitemap`).toContain(exam.href);
      }
    }

    // Mọi URL trong sitemap trả 200 (không để crawler gặp trang chết).
    const dead: string[] = [];
    const queue = uniq(paths);
    await Promise.all(
      Array.from({ length: 8 }, async () => {
        for (let path = queue.pop(); path !== undefined; path = queue.pop()) {
          const status = (await request.get(path)).status();
          if (status !== 200) dead.push(`${status} ${path}`);
        }
      }),
    );
    expect(dead, `URL trong sitemap không mở được:\n${dead.join("\n")}`).toEqual([]);
  });

  test("/robots.txt: cho phép /, chặn /api/ và /tai-khoan, không chặn /blog, trỏ tới sitemap.xml cùng origin với sitemap", async ({
    request,
  }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/plain");
    const text = await response.text();
    expect(text).toMatch(/^User-Agent: \*$/im);
    expect(text).toMatch(/^Allow: \/$/im);
    expect(text).toMatch(/^Disallow: \/api\/$/im);
    expect(text).toMatch(/^Disallow: \/tai-khoan$/im);
    expect(text, "không được chặn /blog").not.toMatch(/^Disallow: \/blog/im);
    expect(text, "không được chặn cả site").not.toMatch(/^Disallow: \/$/im);

    const sitemapLine = text.match(/^Sitemap: (.+)$/im)?.[1];
    expect(sitemapLine, "thiếu dòng Sitemap").toBeTruthy();
    const sitemapUrl = new URL(sitemapLine!);
    expect(sitemapUrl.pathname).toBe("/sitemap.xml");
    const xml = await (await request.get("/sitemap.xml")).text();
    const firstLoc = xml.match(/<loc>([^<]+)<\/loc>/)![1]!;
    expect(new URL(firstLoc).origin, "robots và sitemap phải cùng origin").toBe(sitemapUrl.origin);
  });
});

// ------------------------------------------------------------------ Landing

test.describe("Landing — '/'", () => {
  test("Khối 'Bắt đầu từ đâu': Test trình độ và Mini test Đọc / Nghe / Viết dẫn đúng trang", async ({
    page,
  }) => {
    const errors = collectRuntimeErrors(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    const start = page.getByRole("region", { name: "Bắt đầu từ đâu" });
    await expect(start).toBeVisible();
    const links = start.getByRole("link");
    await expect(links).toHaveCount(4);

    const expectations = [
      { name: /^Test trình độ/, href: `/${PROGRAM}/lo-trinh/test-trinh-do`, h1: "Test trình độ" },
      {
        name: /^Mini test Đọc/,
        href: new RegExp(`^/${PROGRAM}/de-thi/mini(/[a-z0-9-]+)?$`),
        h1: /Mini test Đọc/,
      },
      {
        name: /^Mini test Nghe/,
        href: new RegExp(`^/${PROGRAM}/de-thi/mini(/[a-z0-9-]+)?$`),
        h1: /Mini test Nghe/,
      },
      {
        name: /^Mini test Viết/,
        href: new RegExp(`^/${PROGRAM}/de-thi/mini(/[a-z0-9-]+)?$`),
        h1: /Mini test Viết/,
      },
    ];
    for (const item of expectations) {
      await expect(start.getByRole("link", { name: item.name })).toHaveAttribute("href", item.href);
    }
    // Chọn đúng kỹ năng: mỗi thẻ Mini dẫn tới đề đúng kỹ năng, không phải cả danh sách.
    for (const item of expectations.slice(1)) {
      await expect(start.getByRole("link", { name: item.name })).toHaveAttribute(
        "href",
        new RegExp(`^/${PROGRAM}/de-thi/mini/[a-z0-9-]+$`),
      );
    }

    // Bấm từng thẻ: mở được trang, đúng H1, không 404.
    for (const item of expectations) {
      await page.goto("/");
      await page
        .getByRole("region", { name: "Bắt đầu từ đâu" })
        .getByRole("link", { name: item.name })
        .click();
      await expect(page.getByRole("heading", { level: 1, name: item.h1 })).toBeVisible();
      await expect(NOT_FOUND(page)).toHaveCount(0);
    }
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("Khối 'Bài viết mới': tối đa 3 bài khớp đầu /blog, link 'Xem tất cả', bấm thẻ mở đúng bài; không tràn ngang", async ({
    page,
  }) => {
    const cards = await readIndex(page);
    await page.goto("/");
    const latest = page.getByRole("region", { name: "Bài viết mới" });
    await expect(latest).toBeVisible();
    const shown = await readCards(latest.getByRole("list", { name: "Bài viết mới" }));
    expect(shown).toHaveLength(Math.min(3, cards.length));
    expect(shown.map((c) => c.slug)).toEqual(cards.slice(0, shown.length).map((c) => c.slug));
    await expect(latest.getByRole("link", { name: "Xem tất cả bài viết" })).toHaveAttribute(
      "href",
      "/blog",
    );
    await expectNoHorizontalOverflow(page, "/");

    // Thứ tự tiêu đề: h2 của khối, h3 của thẻ.
    await expect(latest.getByRole("heading", { level: 2, name: "Bài viết mới" })).toBeVisible();
    await expectHeadingOutline(page, "/");

    await latest.getByRole("link").filter({ hasText: shown[0]!.title }).click();
    await expect(page).toHaveURL(new RegExp(`${shown[0]!.href}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(shown[0]!.title);

    await page.goBack();
    await page
      .getByRole("region", { name: "Bài viết mới" })
      .getByRole("link", { name: "Xem tất cả bài viết" })
      .click();
    await expect(page).toHaveURL(/\/blog$/);
  });
});

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
