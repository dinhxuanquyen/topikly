/**
 * Gọi GET /api/practice/writing/reveal. Chỉ import KIỂU từ lib/practice/writing-types.
 * Lỗi được gói thành WritingRevealError với `message` tiếng Việt, hiển thị thẳng cho người học.
 * Chỉ gọi SAU KHI người học bấm "Xem bài mẫu": bài mẫu không được nhúng sẵn vào trang.
 */
import { t } from "@/components/i18n";
import type { WritingReveal } from "@/lib/practice/writing-types";

export class WritingRevealError extends Error {
  readonly kind: "network" | "api";
  readonly status?: number;

  constructor(kind: "network" | "api", message: string, status?: number) {
    super(message);
    this.name = "WritingRevealError";
    this.kind = kind;
    this.status = status;
  }
}

function apiMessage(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const error = (body as { error?: unknown }).error;
  if (typeof error !== "object" || error === null) return null;
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" ? message : null;
}

export async function fetchWritingReveal(
  request: { program: string; id: string },
  fetchImpl: typeof fetch = fetch,
): Promise<WritingReveal> {
  const query = new URLSearchParams({ program: request.program, id: request.id });
  let response: Response;
  try {
    response = await fetchImpl(`/api/practice/writing/reveal?${query.toString()}`, {
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new WritingRevealError("network", t.writing.errors.network);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new WritingRevealError("api", t.writing.errors.server, response.status);
  }

  if (!response.ok) {
    throw new WritingRevealError(
      "api",
      apiMessage(body) ?? t.writing.errors.server,
      response.status,
    );
  }
  return body as WritingReveal;
}
