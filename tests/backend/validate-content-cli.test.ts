import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  collectYamlFiles,
  parseArgs,
  runValidateContent,
} from "../../scripts/lib/validate-content-cli";

const FIXTURES = path.resolve(__dirname, "../fixtures/content");
const tmpDirs: string[] = [];

function tmp(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "topikly-content-"));
  tmpDirs.push(dir);
  return dir;
}

function capture() {
  const out: string[] = [];
  const err: string[] = [];
  return { out, err, io: { log: (m: string) => out.push(m), error: (m: string) => err.push(m) } };
}

afterEach(() => {
  for (const d of tmpDirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe("validate-content CLI", () => {
  it("parseArgs: thư mục và cờ --for-import", () => {
    expect(parseArgs([])).toEqual({ forImport: false, dir: undefined });
    expect(parseArgs(["x/y", "--for-import"])).toEqual({ forImport: true, dir: "x/y" });
    expect(parseArgs(["--for-import"])).toEqual({ forImport: true, dir: undefined });
  });

  it("thư mục không tồn tại -> thông báo, exit 0", () => {
    const c = capture();
    expect(runValidateContent([path.join(tmp(), "khong-co")], c.io)).toBe(0);
    expect(c.out.join("\n")).toMatch(/không có gì để kiểm tra/);
  });

  it("thư mục rỗng hoặc không có YAML -> exit 0", () => {
    const dir = tmp();
    const c = capture();
    expect(runValidateContent([dir], c.io)).toBe(0);
    mkdirSync(path.join(dir, "topik-ii"));
    writeFileSync(path.join(dir, "topik-ii", "ghi-chu.md"), "x");
    expect(runValidateContent([dir], c.io)).toBe(0);
  });

  it("collectYamlFiles: đệ quy, đường dẫn tương đối dùng '/'", () => {
    const files = collectYamlFiles(path.join(FIXTURES, "valid"));
    expect(files.map((f) => f.file)).toContain("topik-ii/practice/R19/r19-0001.yaml");
    expect(files.map((f) => f.file)).toContain("topik-ii/vocab/vocab-sample.yaml");
  });

  it("fixtures hợp lệ -> exit 0 (cảnh báo không làm fail)", () => {
    const c = capture();
    expect(runValidateContent([path.join(FIXTURES, "valid")], c.io)).toBe(0);
    expect(c.out.join("\n")).toMatch(/Hợp lệ/);
    expect(c.err).toEqual([]);
  });

  it("--for-import: fixtures chưa duyệt -> exit 1", () => {
    const c = capture();
    expect(runValidateContent([path.join(FIXTURES, "valid"), "--for-import"], c.io)).toBe(1);
    expect(c.err.join("\n")).toMatch(/reviewed_by/);
  });

  it("có lỗi nội dung -> exit 1 và báo theo file + đường dẫn trường", () => {
    const dir = tmp();
    cpSync(path.join(FIXTURES, "valid"), dir, { recursive: true });
    const file = path.join(dir, "topik-ii", "practice", "R19", "r19-0001.yaml");
    writeFileSync(file, "id: r19-0001\ntype_code: R19\n");
    const c = capture();
    expect(runValidateContent([dir], c.io)).toBe(1);
    const text = c.err.join("\n");
    expect(text).toContain("topik-ii/practice/R19/r19-0001.yaml");
    expect(text).toContain("[LỖI] explanation_vi: thiếu trường bắt buộc");
  });
});
