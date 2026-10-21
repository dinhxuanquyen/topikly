/**
 * Gọi POST /api/practice/check. Chỉ import KIỂU từ lib/practice/types (an toàn cho client).
 * Lỗi được gói thành CheckError với `message` tiếng Việt, hiển thị thẳng cho người học.
 */
import { t } from "@/components/i18n";
import type { ApiErrorBody, CheckRequest, CheckResponse } from "@/lib/practice/types";

export class CheckError extends Error {
  readonly kind: "network" | "api";
  readonly status?: number;

  constructor(kind: "network" | "api", message: string, status?: number) {
    super(message);
    this.name = "CheckError";
    this.kind = kind;
    this.status = status;
  }
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== "object" || value === null) return false;
  const error = (value as { error?: unknown }).error;
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { message?: unknown }).message === "string"
  );
}

export async function checkAnswer(
  request: CheckRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<CheckResponse> {
  let response: Response;
  try {
    response = await fetchImpl("/api/practice/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    throw new CheckError("network", t.runner.errors.network);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new CheckError("api", t.runner.errors.server, response.status);
  }

  if (!response.ok) {
    const message = isApiErrorBody(body) ? body.error.message : t.runner.errors.server;
    throw new CheckError("api", message, response.status);
  }
  return body as CheckResponse;
}
