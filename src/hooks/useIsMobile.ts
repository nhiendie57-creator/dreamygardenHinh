import { useEffect, useState } from "react";

/**
 * Trả về true nếu màn hình <= breakpoint (mặc định 768px).
 * Dùng để tắt bớt animation nặng (blur động, box-shadow động, filter động...)
 * trên điện thoại / máy yếu, tránh giật lag.
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth <= breakpoint : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);

    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    handler(mql);

    mql.addEventListener("change", handler as (e: MediaQueryListEvent) => void);
    return () => mql.removeEventListener("change", handler as (e: MediaQueryListEvent) => void);
  }, [breakpoint]);

  return isMobile;
}
