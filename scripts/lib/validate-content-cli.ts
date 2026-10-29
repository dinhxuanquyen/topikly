import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import {
  formatReport,
  validateContent,
  type ContentFileInput,
} from "../../lib/db/content-validation";
import { verifyFormatOnly } from "../../lib/db/format-only";
import { buildBlogLinkIndex } from "../../lib/blog/links";
import { collectBlogFiles } from "../../lib/blog/source";
import { validateBlogFiles } from "../../lib/blog/validation";

/** Đọc đệ quy *.yaml|*.yml; đường dẫn trả về tương đối so với `root`, dùng dấu "/". */
export function collectYamlFiles(root: string): ContentFileInput[] {
  const out: ContentFileInput[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
        walk(full);
      } else if (/\.ya?ml$/i.test(entry.name)) {
        out.push({
          file: path.relative(root, full).split(path.sep).join("/"),
          text: readFileSync(full, "utf8"),
        });
      }
    }
  };
  walk(root);
  return out;
}

export interface CliIo {
  log: (msg: string) => void;
  error: (msg: string) => void;
}

export interface CliOptions {
  /** Import vào CSDL: reviewed_by null / source khác original là lỗi. */
  forImport: boolean;
  dir: string | undefined;
  /** Git ref (commit/nhánh/tag) để xác nhận các thay đổi "chỉ định dạng" (§8.2). */
  formatOnlyAgainst: string | undefined;
}

export function parseArgs(argv: readonly string[]): CliOptions {
  const positional: string[] = [];
  let forImport = false;
  let formatOnlyAgainst: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--for-import") forImport = true;
    else if (a === "--format-only-against") formatOnlyAgainst = argv[++i];
    else if (a.startsWith("--format-only-against=")) {
      formatOnlyAgainst = a.slice("--format-only-against=".length);
    } else if (!a.startsWith("--")) positional.push(a);
  }
  return { forImport, dir: positional[0], formatOnlyAgainst };
}

// ------------------------------------------------------------------ "chỉ định dạng" (§8.2)

function git(args: string[], cwd: string): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
}

/**
 * So các file câu hỏi đã đổi (so với `ref`) với bản cũ trong git. Trả về số file KHÔNG thể xác
 * nhận là "chỉ định dạng" (tức có thay đổi nội dung, phải đặt lại reviewed_by theo §8.2).
 * Thay đổi chỉ ở metadata (tags, trap, notes_internal…) được coi là không ảnh hưởng văn bản.
 */
export function runFormatOnlyCheck(root: string, ref: string, io: CliIo): number {
  let changed: string[];
  try {
    changed = git(["diff", "--name-only", "--relative", ref, "--", "."], root)
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => /\.ya?ml$/i.test(l) && /(^|\/)practice\//.test(l));
  } catch (err) {
    io.error(`Không đọc được git diff so với "${ref}": ${(err as Error).message.split("\n")[0]}`);
    return 1;
  }

  let notConfirmed = 0;
  let formatOnly = 0;
  let metadataOnly = 0;
  let added = 0;
  for (const rel of changed) {
    const abs = path.join(root, rel);
    if (!existsSync(abs)) continue; // đã xoá
    let oldText: string;
    try {
      oldText = git(["show", `${ref}:./${rel}`], root);
    } catch {
      added += 1;
      io.log(`[MỚI] ${rel}: không có ở ${ref}, không có bản cũ để so`);
      continue;
    }
    let oldDoc: unknown;
    let newDoc: unknown;
    try {
      oldDoc = parseYaml(oldText);
      newDoc = parseYaml(readFileSync(abs, "utf8"));
    } catch (err) {
      notConfirmed += 1;
      io.error(
        `[NỘI DUNG] ${rel}: lỗi cú pháp YAML khi so (${(err as Error).message.split("\n")[0]})`,
      );
      continue;
    }
    const result = verifyFormatOnly(oldDoc, newDoc);
    if (!result.formatOnly) {
      notConfirmed += 1;
      io.error(
        `[NỘI DUNG] ${rel}: có thay đổi nội dung ở ${result.contentChanges.join(", ")} — không xác nhận được "chỉ định dạng", đặt lại reviewed_by`,
      );
    } else if (result.formatChanges.length > 0) {
      formatOnly += 1;
      io.log(
        `[ĐỊNH DẠNG] ${rel}: giống hệt sau chuẩn hoá khoảng trắng/ngắt dòng (${result.formatChanges.join(", ")})`,
      );
    } else {
      metadataOnly += 1;
      io.log(`[METADATA] ${rel}: văn bản không đổi (chỉ metadata)`);
    }
  }
  io.log(
    `So với ${ref}: ${changed.length} file YAML đổi — ${formatOnly} chỉ định dạng, ${metadataOnly} chỉ metadata, ${added} mới, ${notConfirmed} thay đổi nội dung.`,
  );
  return notConfirmed;
}

// ------------------------------------------------------------------ lệnh chính

/** Trả về exit code: 1 nếu có lỗi, 0 nếu sạch (cảnh báo không làm fail). */
export function runValidateContent(argv: readonly string[], io: CliIo = console): number {
  const { dir, forImport, formatOnlyAgainst } = parseArgs(argv);
  const root = path.resolve(process.cwd(), dir ?? "content");
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    io.log(`Không có thư mục nội dung (${root}) — không có gì để kiểm tra.`);
    return 0;
  }
  const files = collectYamlFiles(root);
  const blogFiles = collectBlogFiles(root);
  if (files.length === 0 && blogFiles.length === 0) {
    io.log(
      `Thư mục ${root} chưa có file YAML hay bài blog (blog/*.md) nào — không có gì để kiểm tra.`,
    );
    return 0;
  }
  const result = validateContent(files, { forImport });
  if (blogFiles.length > 0) {
    const blog = validateBlogFiles(blogFiles, {
      forImport,
      linkIndex: buildBlogLinkIndex({
        contentRoot: root,
        blogSlugs: blogFiles.map((f) => f.file.replace(/^blog\//, "").replace(/\.md$/i, "")),
      }),
    });
    result.issues.push(...blog.issues);
    result.errorCount += blog.errorCount;
    result.warningCount += blog.warningCount;
    result.blog = { checked: blog.filesChecked, published: blog.published, draft: blog.draft };
  }
  const report = formatReport(result);
  if (result.errorCount > 0) io.error(report);
  else io.log(report);
  let code = result.errorCount > 0 ? 1 : 0;

  if (formatOnlyAgainst) {
    io.log("");
    if (runFormatOnlyCheck(root, formatOnlyAgainst, io) > 0) code = 1;
  }
  return code;
}
