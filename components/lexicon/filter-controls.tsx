import { useId } from "react";
import { cn } from "@/lib/utils";

/** Ô chọn gốc của trình duyệt (dễ dùng trên điện thoại, đọc được bằng trình đọc màn hình). */
export function FilterSelect({
  label,
  value,
  onChange,
  allLabel,
  options,
  className,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  allLabel: string;
  options: readonly { value: string; label: string }[];
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      <select
        id={id}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value === "" ? null : event.target.value)}
        className="min-h-11 w-full rounded-lg border-2 border-input bg-background px-2.5 text-base outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Dãy nút chọn một giá trị (cấp). Mỗi nút là nút bật tắt (aria-pressed), nhấn lại để bỏ chọn. */
export function FilterChips({
  label,
  allLabel,
  value,
  onChange,
  options,
}: {
  label: string;
  allLabel: string;
  value: string | null;
  onChange: (value: string | null) => void;
  options: readonly { value: string; label: string }[];
}) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id}>
      <span id={id} className="mb-1 block text-xs font-semibold text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        {[{ value: "", label: allLabel }, ...options].map((option) => {
          const pressed = (value ?? "") === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={pressed}
              onClick={() => onChange(option.value === "" || pressed ? null : option.value)}
              className={cn(
                "min-h-11 rounded-lg border-2 px-3.5 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/60",
                pressed
                  ? "border-primary bg-brand-soft text-brand-soft-foreground"
                  : "border-border bg-background hover:bg-muted",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SearchField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className="min-h-11 w-full rounded-lg border-2 border-input bg-background px-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/50"
      />
    </div>
  );
}
