import React, { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { useIsMobile } from "../hooks/useIsMobile";

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

interface BackgroundOverlayProps {
  customBgUrl: string | null;
  isDarkMode?: boolean;
  darkBgUrl?: string | null;
}

export default function BackgroundOverlay({ customBgUrl, isDarkMode = false, darkBgUrl = null }: BackgroundOverlayProps) {
  const isMobile = useIsMobile();
  const prefersReducedMotion = useReducedMotion();
  // Tắt / giảm hiệu ứng nặng trên mobile hoặc khi hệ điều hành yêu cầu giảm animation
  const reduceEffects = isMobile || !!prefersReducedMotion;

  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  useEffect(() => {
    // Mobile: 12 hạt sáng. Desktop: 30 hạt sáng.
    const count = reduceEffects ? 12 : 30;
    const initialSparkles = Array.from({ length: count }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      delay: Math.random() * 5,
      duration: Math.random() * 3 + 2,
    }));
    setSparkles(initialSparkles);
  }, [reduceEffects]);

  // Ảnh nền đang hiệu lực tuỳ theo chế độ: dark mode ưu tiên darkBgUrl,
  // sáng mode dùng customBgUrl như cũ.
  const activeBgUrl = isDarkMode ? darkBgUrl : customBgUrl;

  return (
    // Đã thay đổi "absolute" thành "fixed w-full h-full" ở dòng dưới để khóa chặt hình nền
    <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
      
      {/* Nền màu hoặc ảnh nền Custom (đổi theo chế độ sáng/tối) */}
      {activeBgUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out scale-105"
          style={{ backgroundImage: `url(${activeBgUrl})` }}
        />
      ) : (
        <div
          className="absolute inset-0 transition-all duration-1000 ease-in-out"
          style={{
            background: isDarkMode
              ? "linear-gradient(135deg, #1e1b4b 0%, #3b0764 50%, #0f172a 100%)"
              : "linear-gradient(135deg, #E6E6FA 0%, #FFD1DC 50%, #BCECAC 100%)",
          }}
        />
      )}

      {/* Những mảng mây màu tĩnh ở góc - KHÔNG animate, nhẹ máy. Đổi tông màu
          tối hơn khi ở dark mode để không bị "chói" trên nền tối. */}
      <div className={`absolute -top-12 -left-12 w-96 h-48 blur-3xl rounded-full ${isDarkMode ? "bg-indigo-900/30" : "bg-white/40"}`} />
      <div className={`absolute top-24 -right-16 w-[450px] h-64 blur-3xl rounded-full ${isDarkMode ? "bg-purple-900/30" : "bg-pink-100/40"}`} />
      <div className={`absolute -bottom-20 left-1/4 w-[500px] h-64 blur-3xl rounded-full ${isDarkMode ? "bg-blue-950/30" : "bg-blue-100/40"}`} />
      <div className={`absolute bottom-1/3 -left-16 w-80 h-48 blur-3xl rounded-full ${isDarkMode ? "bg-violet-950/25" : "bg-purple-100/30"}`} />

      {/* Hiệu ứng hạt sáng lấp lánh - CSS animation thuần (transform/opacity),
          box-shadow TĨNH (khai báo 1 lần trong class, không animate mỗi frame) */}
      {sparkles.map((s) => (
        <span
          key={`sparkle-${s.id}`}
          className="absolute rounded-full sparkle-twinkle"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}

      {/* Lớp sương mờ ảo — GIỮ TĨNH, radius blur 28px/30px. Giảm opacity ở
          dark mode để tránh làm nền tối bị "trắng loá" chỗ giữa. */}
      <div
        className="absolute -inset-[10%] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 30% 40%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.15) 40%, transparent 70%)",
          filter: "blur(28px)",
          opacity: isDarkMode ? 0.25 : 0.62,
        }}
      />
      <div
        className="absolute -inset-[10%] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 70% 65%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.12) 45%, transparent 75%)",
          filter: "blur(30px)",
          opacity: isDarkMode ? 0.2 : 0.52,
        }}
      />

      {/* Lớp phủ trên cùng — trắng mờ ở light mode, tối mờ ở dark mode để giữ
          độ tương phản đúng hướng cho từng chế độ. */}
      {reduceEffects ? (
        <div className={`absolute inset-0 ${isDarkMode ? "bg-slate-950/35" : "bg-white/20"}`} />
      ) : (
        <div className={`absolute inset-0 backdrop-blur-[2px] ${isDarkMode ? "bg-slate-950/25" : "bg-white/10"}`} />
      )}
    </div>
  );
}
