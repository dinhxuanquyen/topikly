"use client";

/** Update on minute boundaries, foregrounding and bfcache restore; no timer survives unmount. */
export function subscribeClock(listener: () => void) {
  const timer = window.setInterval(listener, 1000);
  window.addEventListener("focus", listener);
  window.addEventListener("pageshow", listener);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener("focus", listener);
    window.removeEventListener("pageshow", listener);
  };
}
