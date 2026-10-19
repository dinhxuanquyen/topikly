import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import {
  formatReport,
  validateContent,
  type ContentFileInput,
} from "../../lib/db/content-validation";

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

/** Trả về exit code: 1 nếu có lỗi, 0 nếu sạch (cảnh báo không làm fail). */
export interface CliOptions {
  /** Import vào CSDL: reviewed_by null / source khác original là lỗi. */
  forImport: boolean;
  dir: string | undefined;
}

export function parseArgs(argv: readonly string[]): CliOptions {
  const positional = argv.filter((a) => !a.startsWith("--"));
  return { forImport: argv.includes("--for-import"), dir: positional[0] };
}

/** Trả về exit code: 1 nếu có lỗi, 0 nếu sạch (cảnh báo không làm fail). */
export function runValidateContent(argv: readonly string[], io: CliIo = console): number {
  const { dir, forImport } = parseArgs(argv);
  const root = path.resolve(process.cwd(), dir ?? "content");
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    io.log(`Không có thư mục nội dung (${root}) — không có gì để kiểm tra.`);
    return 0;
  }
  const files = collectYamlFiles(root);
  if (files.length === 0) {
    io.log(`Thư mục ${root} chưa có file YAML nào — không có gì để kiểm tra.`);
    return 0;
  }
  const result = validateContent(files, { forImport });
  const report = formatReport(result);
  if (result.errorCount > 0) io.error(report);
  else io.log(report);
  return result.errorCount > 0 ? 1 : 0;
}
