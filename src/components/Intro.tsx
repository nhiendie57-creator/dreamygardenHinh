import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

interface IntroProps {
  onComplete: () => void;
}

export default function Intro({ onComplete }: IntroProps) {
  const [stage, setStage] = useState<"gate" | "opening" | "text" | "finished">("gate");

  const handleOpenGate = () => {
    // Chống bấm đúp gây lỗi logic
    if (stage !== "gate") return;
    
    // Bước 1: Kích hoạt hiệu ứng mở cửa
    setStage("opening");

    // Bước 2: Sau 1.5s khi cửa đã mở dạt sang hai bên, hiện dòng chữ chào mừng
    setTimeout(() => {
      setStage("text");
    }, 1500);

    // Bước 3: Sau 5s (đủ thời gian để người dùng đọc chữ), kết thúc Intro và vào Web
    setTimeout(() => {
      setStage("finished");
      onComplete();
    }, 5000);
  };

  // Tạo mảng 30 hạt lấp lánh (particles) bay lơ lửng
  const particles = Array.from({ length: 30 });

  return (
    <AnimatePresence>
      {stage !== "finished" && (
        <motion.div
          id="intro-container"
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-slate-950"
          exit={{ opacity: 0, transition: { duration: 1.5 } }}
        >
          {/* --- NỀN HẠT LẤP LÁNH (PARTICLES) --- */}
          {particles.map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: Math.random() * 4 + 1 + "px",
                height: Math.random() * 4 + 1 + "px",
                top: Math.random() * 100 + "%",
                left: Math.random() * 100 + "%",
                boxShadow: "0 0 10px 2px rgba(255, 255, 255, 0.8)",
              }}
              animate={{
                y: [0, -40, 0],
                opacity: [0.1, 0.8, 0.1],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: Math.random() * 2,
              }}
            />
          ))}

          {/* --- ÁNH SÁNG TRÀN VÀO (Khi cửa mở) --- */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-tr from-pink-200 via-purple-100 to-green-100 z-0"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: stage === "gate" ? 0 : 1,
              scale: stage === "gate" ? 0.8 : 1.1,
            }}
            transition={{ duration: 2, ease: "easeInOut" }}
          />

          {/* --- CÁNH CỬA KHÔNG GIAN (GATE) --- */}
          {stage === "gate" || stage === "opening" ? (
            <div 
              className="absolute inset-0 flex z-10 w-full h-full cursor-pointer" 
              onClick={handleOpenGate}
            >
              {/* Cửa Trái */}
              <motion.div
                className="w-1/2 h-full bg-slate-900/60 backdrop-blur-xl border-r-2 border-pink-400/50 flex items-center justify-end overflow-hidden relative shadow-[20px_0_50px_rgba(244,114,182,0.15)]"
                initial={{ x: 0 }}
                animate={{ x: stage === "opening" ? "-100%" : 0 }}
                transition={{ duration: 1.5, ease: [0.76, 0, 0.24, 1] }}
              >
                {/* Họa tiết ảo ảnh trên cửa */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-48 h-96 border-[4px] border-pink-300/20 rounded-full" />
              </motion.div>

              {/* Cửa Phải */}
              <motion.div
                className="w-1/2 h-full bg-slate-900/60 backdrop-blur-xl border-l-2 border-pink-400/50 flex items-center justify-start overflow-hidden relative shadow-[-20px_0_50px_rgba(244,114,182,0.15)]"
                initial={{ x: 0 }}
                animate={{ x: stage === "opening" ? "100%" : 0 }}
                transition={{ duration: 1.5, ease: [0.76, 0, 0.24, 1] }}
              >
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-48 h-96 border-[4px] border-pink-300/20 rounded-full" />
              </motion.div>

              {/* Cầu Cầu Phép Thuật (Nút mở cửa ở giữa) */}
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-4"
                initial={{ opacity: 1, scale: 1 }}
                animate={{ 
                  opacity: stage === "opening" ? 0 : 1, 
                  scale: stage === "opening" ? 1.5 : 1 
                }}
                transition={{ duration: 0.5 }}
              >
                <motion.div
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shadow-[0_0_40px_rgba(244,114,182,0.6)] cursor-pointer"
                  animate={{ 
                    scale: [1, 1.05, 1], 
                    boxShadow: [
                      "0 0 20px rgba(244,114,182,0.5)", 
                      "0 0 60px rgba(244,114,182,1)", 
                      "0 0 20px rgba(244,114,182,0.5)"
                    ] 
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Sparkles className="w-10 h-10 text-white" />
                </motion.div>
                <span className="text-white font-bold tracking-widest text-xs uppercase drop-shadow-md">
                  Chạm Để Mở Cửa
                </span>
              </motion.div>
            </div>
          ) : null}

          {/* --- DÒNG CHỮ CHÀO MỪNG CHÍNH THỨC --- */}
          {stage === "text" && (
            <motion.div
              className="z-30 flex flex-col items-center text-center px-6"
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            >
              <motion.div 
                initial={{ opacity: 0, rotate: -45 }}
                animate={{ opacity: 1, rotate: 0 }}
                transition={{ delay: 0.3, duration: 1 }}
                className="mb-4"
              >
                <Sparkles className="w-12 h-12 text-pink-500 animate-spin-slow drop-shadow-md" />
              </motion.div>
              
              <h1 className="text-3xl md:text-5xl font-display text-slate-800 drop-shadow-sm leading-tight">
                Chào mừng bạn đến với <br />
                <span className="text-5xl md:text-7xl font-script text-pink-500 mt-3 block drop-shadow-lg">
                  thế giới mộng mơ của Hinh.
                </span>
              </h1>
              
              {/* Vạch kẻ trang trí nhỏ dưới chữ */}
              <motion.div
                className="mt-8 h-[2px] rounded-full bg-gradient-to-r from-transparent via-pink-400 to-transparent"
                initial={{ width: 0 }}
                animate={{ width: 150 }}
                transition={{ delay: 0.8, duration: 1.5 }}
              />
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
