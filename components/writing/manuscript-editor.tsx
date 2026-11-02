"use client";

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type TextareaHTMLAttributes,
} from "react";
import { t } from "@/components/i18n";
import { cn } from "@/lib/utils";
import {
  caretAt,
  frameRows as countFrameRows,
  layoutManuscript,
  offsetAt,
  type ManuscriptCaret,
  type ManuscriptCell,
  type ManuscriptConfig,
  type ManuscriptLayout,
} from "@/lib/writing/manuscript";

/** Đoạn cần tô trên giấy (vị trí trên văn bản gốc), ví dụ lỗi của kiểm tra quy tắc. */
export interface ManuscriptHighlight {
  start: number;
  end: number;
  severity: "error" | "warning";
}

interface Range {
  start: number;
  end: number;
}

/** Ô chung chữ + dấu câu treo cuối dòng (không phải cặp chữ số/Latin). */
function hangingParts(cell: ManuscriptCell): [string, string] | null {
  if (cell.kind !== "char" || Array.from(cell.text).length < 2) return null;
  if (/^[0-9a-z]{2}$/u.test(cell.text)) return null;
  const glyphs = Array.from(cell.text);
  return [glyphs.slice(0, -1).join(""), glyphs.at(-1)!];
}

function overlaps(cell: ManuscriptCell, range: Range) {
  return cell.kind !== "indent" && cell.start < range.end && cell.end > range.start;
}

function CellGlyph({ cell }: { cell: ManuscriptCell }) {
  const hanging = hangingParts(cell);
  if (hanging) {
    return (
      <>
        <span>{hanging[0]}</span>
        <span className="absolute right-[6%] bottom-[2%] text-[0.75em] leading-none">
          {hanging[1]}
        </span>
      </>
    );
  }
  if (cell.text === "." || cell.text === ",") {
    // Trên giấy, dấu chấm và dấu phẩy viết ở góc dưới trái của ô.
    return <span className="absolute bottom-[8%] left-[18%] leading-none">{cell.text}</span>;
  }
  if (cell.text.length === 2) {
    return <span className="text-[0.8em] tracking-tighter">{cell.text}</span>;
  }
  return <span>{cell.text}</span>;
}

interface GridProps {
  layout: ManuscriptLayout;
  frameCells: number;
  caret?: ManuscriptCaret | null;
  showCaret?: boolean;
  selection?: Range | null;
  highlights?: readonly ManuscriptHighlight[];
  caretRef?: React.Ref<HTMLSpanElement>;
  onCellPointerDown?: (row: number, col: number) => void;
}

/**
 * Lưới 원고지 chỉ để nhìn (aria-hidden): người dùng trình đọc màn hình đọc và sửa bài qua ô nhập
 * thật. Khung giấy có `frameCells` ô; bài dài hơn thì hiện thêm dòng tô đỏ "ngoài khung".
 */
export function ManuscriptGrid({
  layout,
  frameCells,
  caret,
  showCaret = false,
  selection,
  highlights = [],
  caretRef,
  onCellPointerDown,
}: GridProps) {
  const cpl = layout.cellsPerLine;
  const frameRowCount = Math.max(1, Math.ceil(frameCells / cpl));
  const rowCount = Math.max(frameRowCount, layout.rows.length);
  const hasSelection = selection && selection.end > selection.start;
  const caretCol = caret ? Math.min(caret.col, cpl - 1) : -1;
  const caretAtRightEdge = caret ? caret.col >= cpl : false;

  return (
    <div
      aria-hidden
      data-testid="manuscript-grid"
      className="@container relative select-none sm:pr-10"
      style={{ "--cpl": cpl } as CSSProperties}
    >
      {Array.from({ length: rowCount }, (_, r) => {
        const row = layout.rows[r];
        const outside = r >= frameRowCount;
        const marker = (r + 1) * cpl;
        return (
          <div key={r} className="relative">
            {r === frameRowCount && outside ? (
              <p className="my-1.5 border-t-2 border-dashed border-red-600 pt-1 text-xs font-semibold text-red-700 dark:text-red-300">
                {t.writing.manuscript.frameEnd(frameCells)}
              </p>
            ) : null}
            <div
              data-row={r}
              className={cn(
                "mb-1 grid border-t border-l border-manuscript",
                outside && "bg-red-50 dark:bg-red-950/30",
              )}
              style={{ gridTemplateColumns: `repeat(${cpl}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: cpl }, (_, c) => {
                const cell = row?.cells[c];
                const highlight = cell
                  ? highlights.find((h) => overlaps(cell, h))?.severity
                  : undefined;
                const selected = cell && hasSelection ? overlaps(cell, selection) : false;
                const isCaretCell = showCaret && caret?.row === r && caretCol === c;
                return (
                  <div
                    key={c}
                    data-col={c}
                    onMouseDown={
                      onCellPointerDown
                        ? (event) => {
                            event.preventDefault();
                            onCellPointerDown(r, c);
                          }
                        : undefined
                    }
                    className={cn(
                      "relative grid aspect-square place-items-center border-r border-b border-manuscript leading-none",
                      onCellPointerDown && "cursor-text",
                      highlight === "error" && "bg-red-100 dark:bg-red-900/50",
                      highlight === "warning" && "bg-amber-100 dark:bg-amber-900/40",
                      selected && "bg-primary/25",
                    )}
                    style={{ fontSize: "min(1.15rem, calc(100cqi / var(--cpl) * 0.62))" }}
                  >
                    {cell && cell.kind === "char" ? <CellGlyph cell={cell} /> : null}
                    {caret?.row === r && caretCol === c ? (
                      <span
                        ref={caretRef}
                        data-testid={isCaretCell ? "manuscript-caret" : undefined}
                        className={cn(
                          "absolute inset-y-[12%] w-0.5 scroll-mt-[calc(var(--header-height,4rem)+1rem)] scroll-mb-32 rounded-full bg-primary",
                          caretAtRightEdge ? "right-0" : "left-0",
                          !isCaretCell && "invisible",
                        )}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
            {marker % 100 === 0 && marker <= frameCells ? (
              <span className="absolute -right-0 bottom-1 hidden w-9 text-right text-[10px] text-muted-foreground tabular-nums sm:block">
                {marker}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "className"> & {
  value: string;
};

interface EditorProps {
  textareaProps: TextareaProps;
  config: ManuscriptConfig;
  /** Số ô của khung giấy (W53: 300, W54: 700). */
  frameCells: number;
  highlights?: readonly ManuscriptHighlight[];
  /** id của dòng số ô đã dùng, để ô nhập trỏ aria-describedby tới. */
  usageId?: string;
}

/**
 * Trình soạn 원고지: chữ vẫn gõ vào một ô nhập thật (giữ bộ gõ tiếng Hàn, dán, hoàn tác, trình
 * đọc màn hình), nhưng ô nhập trong suốt và đặt đúng tại ô con trỏ trên giấy, nên khung gợi ý
 * của bộ gõ hiện cạnh chữ đang viết. Lưới vẽ lại từ văn bản theo quy tắc 원고지; bấm vào ô nào thì
 * con trỏ tới chữ đó; phím lên/xuống đi theo dòng của giấy.
 */
export function ManuscriptEditor({
  textareaProps,
  config,
  frameCells,
  highlights,
  usageId,
}: EditorProps) {
  const { value, onChange, onSelect, onKeyDown, onFocus, onBlur, ...rest } = textareaProps;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);
  const [selection, setSelection] = useState<Range>({ start: value.length, end: value.length });
  const [focused, setFocused] = useState(false);
  const [box, setBox] = useState<{ left: number; top: number; size: number } | null>(null);

  const layout = useMemo(() => layoutManuscript(value, config), [value, config]);
  const start = Math.min(selection.start, value.length);
  const end = Math.min(selection.end, value.length);
  const caret = caretAt(layout, end);
  const frameRowCount = countFrameRows(frameCells, config);
  const overflow = Math.max(0, layout.usedCells - frameCells);

  function syncSelection() {
    const el = textareaRef.current;
    if (!el) return;
    setSelection({ start: el.selectionStart, end: el.selectionEnd });
  }

  function moveTo(offset: number) {
    const el = textareaRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(offset, offset);
    setSelection({ start: offset, end: offset });
  }

  // Đặt ô nhập trong suốt đúng chỗ con trỏ trên giấy và giữ con trỏ trong tầm nhìn.
  useLayoutEffect(() => {
    const mark = caretRef.current;
    const wrapper = wrapperRef.current;
    if (!mark || !wrapper) return;
    const cell = mark.parentElement!.getBoundingClientRect();
    const origin = wrapper.getBoundingClientRect();
    const next = { left: cell.left - origin.left, top: cell.top - origin.top, size: cell.height };
    setBox((prev) =>
      prev && prev.left === next.left && prev.top === next.top && prev.size === next.size
        ? prev
        : next,
    );
    if (focused) mark.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [caret.row, caret.col, focused, layout.rows.length]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.nativeEvent.isComposing) return;
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    if (event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) return;
    event.preventDefault();
    const row = caret.row + (event.key === "ArrowUp" ? -1 : 1);
    const col = Math.min(caret.col, layout.cellsPerLine - 1);
    moveTo(row < 0 ? 0 : offsetAt(layout, row, col, value.length));
  }

  return (
    <div className="space-y-1.5">
      <div
        ref={wrapperRef}
        data-focused={focused || undefined}
        className="relative rounded-xl border-2 border-input bg-background p-2 focus-within:border-primary focus-within:ring-3 focus-within:ring-ring/50 md:p-3"
      >
        <ManuscriptGrid
          layout={layout}
          frameCells={frameCells}
          caret={caret}
          showCaret={focused && start === end}
          selection={{ start, end }}
          highlights={highlights}
          caretRef={caretRef}
          onCellPointerDown={(row, col) => moveTo(offsetAt(layout, row, col, value.length))}
        />
        <textarea
          {...rest}
          ref={textareaRef}
          value={value}
          onChange={(event) => {
            onChange?.(event);
            setSelection({
              start: event.target.selectionStart,
              end: event.target.selectionEnd,
            });
          }}
          onSelect={(event) => {
            onSelect?.(event);
            syncSelection();
          }}
          onKeyDown={handleKeyDown}
          onKeyUp={syncSelection}
          onFocus={(event) => {
            onFocus?.(event);
            setFocused(true);
            syncSelection();
          }}
          onBlur={(event) => {
            onBlur?.(event);
            setFocused(false);
          }}
          rows={1}
          wrap="off"
          data-mode="manuscript"
          className="absolute resize-none overflow-hidden border-0 bg-transparent p-0 text-base text-transparent caret-transparent opacity-0 outline-none"
          style={
            box
              ? { left: box.left, top: box.top, width: box.size, height: box.size }
              : { left: 0, top: 0, width: 1, height: 1 }
          }
        />
      </div>
      <p
        id={usageId}
        data-overflow={overflow > 0 || undefined}
        className={cn(
          "text-sm tabular-nums",
          overflow > 0 ? "font-semibold text-red-700 dark:text-red-300" : "text-muted-foreground",
        )}
      >
        {t.writing.manuscript.usage(layout.usedCells, frameCells, layout.usedRows, frameRowCount)}
        {overflow > 0 ? ` · ${t.writing.manuscript.overflow(overflow)}` : ""}
      </p>
    </div>
  );
}
