import { cn } from "@/lib/utils";

interface TopiCatProps {
  className?: string;
  /** Có hai tia lấp lánh quanh đầu (dùng ở chỗ lớn: màn đầu, tổng kết). */
  sparkles?: boolean;
  /** Nhãn cho trình đọc màn hình; bỏ trống = hình trang trí (aria-hidden). */
  label?: string;
}

/**
 * Mèo Topi, linh vật Topikly (bản vẽ trong file Figma): mắt cười híp, miệng cười mở,
 * vòng cổ xanh da trời có chuông vàng. Màu lấy từ token nên đổi theo bảng màu.
 */
export function TopiCat({ className, sparkles = false, label }: TopiCatProps) {
  return (
    <svg
      viewBox="0 0 160 160"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("shrink-0", className)}
    >
      <path d="M20 70 L28 12 Q30 6 36 9 L74 38 Z" fill="#C9D3E6" />
      <path d="M140 70 L132 12 Q130 6 124 9 L86 38 Z" fill="#C9D3E6" />
      <path d="M30 56 L35 24 L60 41 Z" fill="#F6C7D0" />
      <path d="M130 56 L125 24 L100 41 Z" fill="#F6C7D0" />
      <ellipse cx="80" cy="92" rx="66" ry="56" fill="#C9D3E6" />
      <path d="M80 38 C77 46 77 52 80 58 C83 52 83 46 80 38Z" fill="#9FAECB" />
      <path d="M64 41 C65 48 67 53 71 57 C71 50 68 45 64 41Z" fill="#9FAECB" />
      <path d="M96 41 C95 48 93 53 89 57 C89 50 92 45 96 41Z" fill="#9FAECB" />
      <ellipse cx="80" cy="116" rx="36" ry="26" fill="#FFFFFF" />
      <path
        d="M45 90 Q56 76 67 90 M93 90 Q104 76 115 90"
        stroke="var(--ink-900)"
        strokeWidth="5.5"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx="38" cy="104" rx="11" ry="7" fill="#F7A9B8" />
      <ellipse cx="122" cy="104" rx="11" ry="7" fill="#F7A9B8" />
      <path d="M74 99 H86 Q86 104 80 106 Q74 104 74 99Z" fill="#F08AA0" />
      <path d="M64 110 Q80 115 96 110 Q94 130 80 132 Q66 130 64 110Z" fill="var(--ink-900)" />
      <ellipse cx="80" cy="125" rx="10" ry="6" fill="#F08AA0" />
      <path
        d="M44 108 L14 102 M44 116 L16 122 M116 108 L146 102 M116 116 L144 122"
        stroke="#8C9AB8"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path d="M46 146 Q80 160 114 146 L110 138 Q80 150 50 138 Z" fill="var(--sky-500)" />
      <circle cx="80" cy="150" r="6" fill="var(--sun-400)" />
      {sparkles ? (
        <>
          <path
            className="topi-sparkle"
            d="M148 22 L151 30 L159 33 L151 36 L148 44 L145 36 L137 33 L145 30 Z"
            fill="var(--sun-400)"
          />
          <path
            className="topi-sparkle topi-sparkle-late"
            d="M12 30 L14 35 L19 37 L14 39 L12 44 L10 39 L5 37 L10 35 Z"
            fill="var(--sky-300)"
          />
        </>
      ) : null}
    </svg>
  );
}
