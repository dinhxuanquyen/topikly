/**
 * Gọi POST /api/exam/submit. Chỉ import KIỂU từ lib/exam/types (an toàn cho client).
 * Lỗi được gói thành ExamSubmitError với `message` tiếng Việt, hiển thị thẳng cho người học.
 */
import { t } from "@/components/i18n";
import type {
  ExamApiErrorBody,
  ExamErrorCode,
  ExamResult,
  ExamSubmitRequest,
} from "@/lib/exam/types";

export class ExamSubmitError extends Error {
  readonly kind: "network" | "api";
  readonly status?: number;
  /** Mã lỗi của API (vd. "invalid_writing_answer"); undefined với lỗi mạng hoặc phản hồi lạ. */
  readonly code?: ExamErrorCode;

  constructor(kind: "network" | "api", message: string, status?: number, code?: ExamErrorCode) {
    super(message);
    this.name = "ExamSubmitError";
    this.kind = kind;
    this.status = status;
    this.code = code;
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
    if (isApiErrorBody(body)) {
      const { code, message } = body.error;
      // Bài Viết sai hình dạng / quá dài: nói rõ bài làm còn nguyên, kèm lý do tiếng Việt của server.
      const text =
        code === "invalid_writing_answer"
          ? `${t.examRun.errors.invalidWriting} (${message})`
          : message;
      throw new ExamSubmitError("api", text, response.status, code);
    }
    throw new ExamSubmitError("api", t.examRun.errors.server, response.status);
  }
  return body as ExamResult;
}
