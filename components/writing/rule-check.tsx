import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import { t } from "@/components/i18n";
import { cn } from "@/lib/utils";
import type { WritingTypeCode } from "@/lib/practice/writing-types";
import type { WritingRuleFinding, WritingRuleReport } from "@/lib/writing/rules";

/** Số đoạn trích tối đa hiện cho mỗi lỗi; phần còn lại gộp thành "+n". */
const MAX_EXCERPTS = 4;

const SEVERITY_STYLE = {
  error: "border-red-600 bg-red-50 text-red-950 dark:bg-red-950/40 dark:text-red-50",
  warning: "border-amber-600 bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-50",
} as const;

const SEVERITY_ICON = { error: CircleAlert, warning: TriangleAlert } as const;

/** Lời nhắc tiếng Việt cho một phát hiện. */
export function ruleMessage(finding: WritingRuleFinding, typeCode: WritingTypeCode): string {
  const m = t.writing.rules;
  switch (finding.id) {
    case "length": {
      const info = finding.length!;
      return info.status === "below"
        ? m.lengthBelow(info.count, info.min)
        : m.lengthAbove(info.count, info.max);
    }
    case "register": {
      if (typeCode === "W51" || typeCode === "W52") return m.registerBlank;
      const endings = (finding.registers ?? [])
        .map((r) => (r === "polite" ? m.registerPolite : m.registerFormal))
        .join(", ");
      return m.register(endings);
    }
    case "title":
      return typeCode === "W53" ? m.titleW53 : m.title;
    default:
      return m[finding.id];
  }
}

function Excerpts({ finding }: { finding: WritingRuleFinding }) {
  if (finding.matches.length === 0) return null;
  const unique = [...new Set(finding.matches.map((match) => match.text))];
  const shown = unique.slice(0, MAX_EXCERPTS);
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
      <span className="sr-only">{t.writing.rules.excerptsLabel}:</span>
      {shown.map((text) => (
        <span
          key={text}
          lang="ko"
          className="max-w-full rounded-md border border-current/30 bg-background/70 px-1.5 py-0.5 text-sm break-words text-foreground"
        >
          {text}
        </span>
      ))}
      {unique.length > shown.length ? (
        <span className="text-xs font-semibold">
          {t.writing.rules.more(unique.length - shown.length)}
        </span>
      ) : null}
    </p>
  );
}

function FindingItem({
  finding,
  typeCode,
}: {
  finding: WritingRuleFinding;
  typeCode: WritingTypeCode;
}) {
  const Icon = SEVERITY_ICON[finding.severity];
  return (
    <li
      data-rule={finding.id}
      data-severity={finding.severity}
      className={cn("rounded-lg border px-3 py-2 text-sm", SEVERITY_STYLE[finding.severity])}
    >
      <p className="flex gap-2">
        <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>
          <strong className="font-semibold">
            {finding.severity === "error"
              ? t.writing.rules.errorLabel
              : t.writing.rules.warningLabel}
            :
          </strong>{" "}
          {ruleMessage(finding, typeCode)}
        </span>
      </p>
      <div className="pl-6">
        <Excerpts finding={finding} />
      </div>
    </li>
  );
}

/**
 * Bảng kiểm tra quy tắc của một bài W53–W54: lỗi/lưu ý (có chữ + biểu tượng, không chỉ màu) và
 * danh sách quy tắc đã đạt. `announce` bật vùng aria-live đọc dòng tóm tắt khi số lỗi đổi
 * (khi đang gõ); tắt khi xem lại bài đã nộp.
 */
export function RuleCheckPanel({
  report,
  typeCode,
  announce = true,
}: {
  report: WritingRuleReport;
  typeCode: WritingTypeCode;
  announce?: boolean;
}) {
  if (report.checked.length === 0) return null;
  const errors = report.findings.filter((f) => f.severity === "error").length;
  const warnings = report.findings.length - errors;
  const failed = new Set(report.findings.map((f) => f.id));
  const passed = report.checked.filter((id) => !failed.has(id));
  const summary =
    report.findings.length === 0
      ? t.writing.rules.summaryClean
      : t.writing.rules.summary(errors, warnings);

  return (
    <section
      aria-label={t.writing.rules.regionLabel}
      data-testid="writing-rule-check"
      className="space-y-2.5 rounded-xl border border-border bg-card p-3"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-sm font-bold">{t.writing.rules.heading}</h3>
        <p
          className={cn(
            "text-sm font-semibold",
            errors > 0
              ? "text-red-700 dark:text-red-300"
              : warnings > 0
                ? "text-amber-800 dark:text-amber-200"
                : "text-emerald-700 dark:text-emerald-300",
          )}
          {...(announce ? { role: "status", "aria-live": "polite" as const } : {})}
        >
          {summary}
        </p>
      </div>

      {report.findings.length > 0 ? (
        <ul className="space-y-2">
          {report.findings.map((finding) => (
            <FindingItem key={finding.id} finding={finding} typeCode={typeCode} />
          ))}
        </ul>
      ) : null}

      {passed.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-semibold text-muted-foreground">
            {t.writing.rules.passedLabel}:
          </span>
          <ul className="contents">
            {passed.map((id) => (
              <li
                key={id}
                data-rule={id}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
              >
                <CircleCheck aria-hidden className="size-3.5" />
                {t.writing.rules.passed[id]}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">{t.writing.rules.note}</p>
    </section>
  );
}

/** Lời nhắc ngắn dưới một ô điền W51–W52. Không có lỗi thì không hiện gì. */
export function BlankRuleNote({
  id,
  report,
  typeCode,
}: {
  id?: string;
  report: WritingRuleReport;
  typeCode: WritingTypeCode;
}) {
  if (report.findings.length === 0) return null;
  return (
    <ul id={id} data-testid="writing-blank-rule" className="space-y-1.5">
      {report.findings.map((finding) => (
        <FindingItem key={finding.id} finding={finding} typeCode={typeCode} />
      ))}
    </ul>
  );
}
