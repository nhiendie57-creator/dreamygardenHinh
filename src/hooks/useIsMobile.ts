import { useEffect, useState } from "react";

const DEFAULT_BREAKPOINT = 768;
// Máy tầm trung/thấp thường có <=4 nhân CPU logic. Ngưỡng này chủ động chọn
// hơi rộng một chút để ưu tiên "an toàn" (thà giảm hiệu ứng oan trên vài máy
// tầm trung khá, còn hơn bỏ sót máy yếu thật gây lag).
const LOW_CORE_THRESHOLD = 4;

function detectLowCoreDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const cores = (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency;
  // Trình duyệt không phải lúc nào cũng trả được số nhân (một số trình duyệt
  // cũ/riêng tư không hỗ trợ). Không rõ thì KHÔNG tính là máy yếu, tránh làm
  // tắt hiệu ứng oan cho máy mạnh chỉ vì thiếu thông tin.
  if (typeof cores !== "number" || cores <= 0) return false;
  return cores <= LOW_CORE_THRESHOLD;
}

/**
 * Trả về true nếu: màn hình <= breakpoint (mặc định 768px) HOẶC thiết bị có
 * ít nhân CPU (mặc định <=4 nhân — thường là máy tầm trung/thấp), dù màn
 * hình có to cỡ nào cũng tính là "yếu". Dùng để tắt bớt animation nặng (blur
 * động, box-shadow động, filter động...) trên điện thoại / máy yếu, tránh
 * giật lag.
 */
export function useIsMobile(breakpoint: number = DEFAULT_BREAKPOINT): boolean {
  const [isNarrow, setIsNarrow] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth <= breakpoint : false
  );

  // Số nhân CPU không đổi trong suốt phiên làm việc, nên chỉ cần đọc 1 lần
  // lúc mount — không cần theo dõi liên tục như bề rộng màn hình.
  const [isLowCore] = useState<boolean>(() => detectLowCoreDevice());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);

    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsNarrow(e.matches);
    handler(mql);

    mql.addEventListener("change", handler as (e: MediaQueryListEvent) => void);
    return () => mql.removeEventListener("change", handler as (e: MediaQueryListEvent) => void);
  }, [breakpoint]);

  return isNarrow || isLowCore;
}
