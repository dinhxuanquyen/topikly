/**
 * Gọi POST /api/exam/submit. Chỉ import KIỂU từ lib/exam/types (an toàn cho client).
 * Lỗi được gói thành ExamSubmitError với `message` tiếng Việt, hiển thị thẳng cho người học.
 */
import { t } from "@/components/i18n";
import type { ExamApiErrorBody, ExamResult, ExamSubmitRequest } from "@/lib/exam/types";

export class ExamSubmitError extends Error {
  readonly kind: "network" | "api";
  readonly status?: number;

  constructor(kind: "network" | "api", message: string, status?: number) {
    super(message);
    this.name = "ExamSubmitError";
    this.kind = kind;
    this.status = status;
  }
}

function isApiErrorBody(value: unknown): value is ExamApiErrorBody {
  if (typeof value !== "object" || value === null) return false;
  const error = (value as { error?: unknown }).error;
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { message?: unknown }).message === "string"
  );
}

export async function submitExam(
  request: ExamSubmitRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<ExamResult> {
  let response: Response;
  try {
    response = await fetchImpl("/api/exam/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    throw new ExamSubmitError("network", t.examRun.errors.network);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ExamSubmitError("api", t.examRun.errors.server, response.status);
  }

  if (!response.ok) {
    const message = isApiErrorBody(body) ? body.error.message : t.examRun.errors.server;
    throw new ExamSubmitError("api", message, response.status);
  }
  return body as ExamResult;
}
