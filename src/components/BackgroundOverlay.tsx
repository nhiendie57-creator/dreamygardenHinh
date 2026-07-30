import React, { useEffect, useState } from "react";
import { motion } from "motion/react";

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
}

export default function BackgroundOverlay({ customBgUrl }: BackgroundOverlayProps) {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  useEffect(() => {
    // Tạo 30 chấm sáng lấp lánh rải rác (Số lượng vừa đủ để đẹp mà không gây lag iPad)
    const initialSparkles = Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2, // Kích thước nhỏ nhắn lấp lánh
      delay: Math.random() * 5,
      duration: Math.random() * 3 + 2, // Tốc độ chớp tắt
    }));
    setSparkles(initialSparkles);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Nền màu hoặc ảnh nền Custom */}
      {customBgUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out scale-105"
          style={{ backgroundImage: `url(${customBgUrl})` }}
        />
      ) : (
        <div 
          className="absolute inset-0 transition-all duration-1000 ease-in-out"
          style={{
            background: "linear-gradient(135deg, #E6E6FA 0%, #FFD1DC 50%, #BCECAC 100%)"
          }}
        />
      )}

      {/* Những mảng mây màu (Không gây lag vì là hiệu ứng tĩnh) */}
      <div className="absolute -top-12 -left-12 w-96 h-48 bg-white/40 blur-3xl rounded-full" />
      <div className="absolute top-24 -right-16 w-[450px] h-64 bg-pink-100/40 blur-3xl rounded-full" />
      <div className="absolute -bottom-20 left-1/4 w-[500px] h-64 bg-blue-100/40 blur-3xl rounded-full" />
      <div className="absolute bottom-1/3 -left-16 w-80 h-48 bg-purple-100/30 blur-3xl rounded-full" />

      {/* Hiệu ứng hạt sáng lấp lánh */}
      {sparkles.map((s) => (
        <motion.div
          key={`sparkle-${s.id}`}
          className="absolute rounded-full"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            background: "#ffffff",
            boxShadow: "0 0 10px 2px rgba(255, 255, 255, 0.6)", // Tạo vầng hào quang chói lọi
          }}
          animate={{
            opacity: [0, 0.8, 0], // Chớp và tắt dần
            scale: [0.5, 1.2, 0.5], // Phình to rồi thu nhỏ
          }}
          transition={{
            duration: s.duration,
            delay: s.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
