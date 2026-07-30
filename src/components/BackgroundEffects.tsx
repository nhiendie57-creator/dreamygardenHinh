import React, { useEffect, useState } from "react";
// Sửa lại import chuẩn để Vercel không báo lỗi không tìm thấy package
import { motion } from "framer-motion";

interface BackgroundEffectsProps {
  customBgUrl?: string | null;
}

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

export default function BackgroundEffects({ customBgUrl }: BackgroundEffectsProps) {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  useEffect(() => {
    // Chỉ tạo hiệu ứng chấm sáng (sparkles) - Số lượng 30 để nhẹ máy
    const newSparkles = Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      delay: Math.random() * 5,
      duration: Math.random() * 3 + 2,
    }));
    setSparkles(newSparkles);
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full -z-50 overflow-hidden pointer-events-none select-none">
      {/* Nền màu hoặc ảnh nền Custom */}
      {customBgUrl ? (
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center transition-all duration-1000 ease-in-out scale-105"
          style={{ backgroundImage: `url(${customBgUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-tr from-[#E6E6FA] via-[#FFD1DC] to-[#BCECAC] opacity-95" />
      )}

      {/* Những mảng mây màu tĩnh ở góc (Không gây lag) */}
      <div className="absolute top-[-5%] left-[-10%] w-[45%] h-[35%] opacity-60 filter blur-[40px] rounded-full bg-white" />
      <div className="absolute top-[-10%] left-[-5%] w-[35%] h-[30%] opacity-40 filter blur-[30px] rounded-full bg-[#FFD1DC]" />
      <div className="absolute bottom-[-8%] right-[-10%] w-[50%] h-[40%] opacity-60 filter blur-[50px] rounded-full bg-white" />
      <div className="absolute bottom-[-2%] right-[-5%] w-[35%] h-[30%] opacity-40 filter blur-[35px] rounded-full bg-[#FFD1DC]" />

      {/* Chấm sáng lấp lánh */}
      {sparkles.map((sparkle) => (
        <motion.div
          key={`sparkle-${sparkle.id}`}
          className="absolute rounded-full"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            width: `${sparkle.size}px`,
            height: `${sparkle.size}px`,
            backgroundColor: "#ffffff",
            boxShadow: "0 0 10px 2px rgba(255, 255, 255, 0.6)",
          }}
          animate={{
            opacity: [0, 0.8, 0],
            scale: [0.5, 1.2, 0.5],
          }}
          transition={{
            duration: sparkle.duration,
            delay: sparkle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
