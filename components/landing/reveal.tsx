"use client";

import { useEffect } from "react";

/**
 * Bật lớp chuyển động của trang chủ: gắn `lp-reveal-ready` lên <html> rồi theo dõi các phần
 * tử `[data-reveal]`, `[data-chapter]`, `[data-bars]`; khi vào màn hình thì thêm `is-in` (một lần).
 * Không có script thì lớp không được gắn và mọi thứ hiện sẵn (xem landing.css).
 */
export function Reveal() {
  useEffect(() => {
    const root = document.documentElement;
    const targets = document.querySelectorAll<HTMLElement>(
      "[data-reveal], [data-chapter], [data-bars]",
    );
    if (!("IntersectionObserver" in window) || targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );
    root.classList.add("lp-reveal-ready");
    targets.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      root.classList.remove("lp-reveal-ready");
    };
  }, []);

  return null;
}
