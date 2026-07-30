import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

interface IntroProps {
  onComplete: () => void;
}

export default function Intro({ onComplete }: IntroProps) {
  const [stage, setStage] = useState<"door_closed" | "door_opening" | "entering" | "text" | "finished">("door_closed");

  const handleOpenDoor = () => {
    if (stage !== "door_closed") return;
    
    // 1. Cửa bắt đầu mở
    setStage("door_opening");

    // 2. Sau 1.5s, camera tiến tới (zoom) vào cánh cửa ánh sáng
    setTimeout(() => {
      setStage("entering");
    }, 1500);

    // 3. Sau 2.5s, chuyển sang màn hình chữ mây trời mộng mơ
    setTimeout(() => {
      setStage("text");
    }, 2500);

    // 4. Đợi người dùng ngắm chữ 4s rồi kết thúc
    setTimeout(() => {
      setStage("finished");
      onComplete();
    }, 6500);
  };

  // Tạo mảng sao lấp lánh bên trong cánh cửa
  const stars = Array.from({ length: 40 });

  return (
    <>
      {/* Nhúng trực tiếp font chữ siêu đẹp và lấp lánh giống hệt ảnh reference */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Montserrat:wght@300;400&display=swap');
        
        .font-dreamy {
          font-family: 'Great Vibes', cursive;
        }
        
        .font-sans-elegant {
          font-family: 'Montserrat', sans-serif;
        }

        .glow-text {
          color: #ffffff;
          text-shadow: 
            0 0 10px #fff,
            0 0 20px #fff,
            0 0 40px #ff9ecd,
            0 0 80px #ff9ecd,
            0 0 120px #ff9ecd;
        }

        .door-perspective {
          perspective: 1200px;
        }
        
        .door-swing {
          transform-origin: left;
        }
      `}</style>

      <AnimatePresence>
        {stage !== "finished" && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#0A1128]"
            exit={{ opacity: 0, transition: { duration: 1.5 } }}
          >
            {/* ---------------- SCENE 1 & 2: CÁNH CỬA PHÉP THUẬT (Dựa theo image_8) ---------------- */}
            {(stage === "door_closed" || stage === "door_opening" || stage === "entering") && (
              <motion.div
                className="relative w-full h-full flex flex-col items-center justify-end door-perspective"
                initial={{ scale: 1, opacity: 1 }}
                animate={{ 
                  scale: stage === "entering" ? 5 : 1, // Hiệu ứng zoom xuyên qua cửa
                  opacity: stage === "entering" ? 0 : 1 
                }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
              >
                {/* Vệt sáng chiếu ra sàn nhà */}
                <motion.div 
                  className="absolute bottom-0 w-full h-[40vh] bg-gradient-to-t from-pink-200/40 via-purple-300/20 to-transparent"
                  style={{ clipPath: "polygon(20% 100%, 80% 100%, 55% 0, 45% 0)" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: stage === "door_closed" ? 0 : 1 }}
                  transition={{ duration: 1.5 }}
                />

                {/* Khung cửa */}
                <div className="relative w-[280px] h-[480px] md:w-[360px] md:h-[600px] mb-[10vh] border-[12px] border-[#c0d6df] bg-gradient-to-tr from-[#ff9a9e] to-[#fecfef] shadow-[0_0_50px_rgba(255,154,158,0.5)] flex items-center justify-center overflow-hidden">
                  
                  {/* Bầu trời sao bên trong cửa */}
                  {stars.map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute bg-white rounded-full"
                      style={{
                        width: Math.random() * 3 + 1 + "px",
                        height: Math.random() * 3 + 1 + "px",
                        top: Math.random() * 100 + "%",
                        left: Math.random() * 100 + "%",
                        boxShadow: "0 0 8px 2px rgba(255, 255, 255, 0.8)",
                      }}
                      animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                      transition={{ duration: Math.random() * 2 + 1.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                  ))}
                  
                  {/* Chữ lơ lửng mời gọi (sẽ biến mất khi mở) */}
                  <motion.div 
                    className="absolute z-10 flex flex-col items-center"
                    animate={{ opacity: stage === "door_closed" ? 1 : 0 }}
                  >
                    <Sparkles className="w-8 h-8 text-white mb-2 animate-pulse" />
                    <span className="text-white font-sans-elegant text-xs uppercase tracking-widest font-bold">Mở cửa</span>
                  </motion.div>

                  {/* Cánh cửa (sẽ mở xoay ra ngoài) */}
                  <motion.div
                    className="door-swing absolute top-0 left-0 w-full h-full bg-[#e0eaf5] border-r-2 border-white/50 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] cursor-pointer flex items-center"
                    initial={{ rotateY: 0 }}
                    animate={{ rotateY: stage !== "door_closed" ? -105 : 0 }} // Xoay 105 độ để mở cửa
                    transition={{ duration: 1.5, ease: [0.25, 1, 0.5, 1] }}
                    onClick={handleOpenDoor}
                  >
                    {/* Tay nắm cửa mạ vàng */}
                    <div className="absolute right-4 w-4 h-16 bg-gradient-to-b from-yellow-300 to-yellow-600 rounded-full shadow-lg" />
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* ---------------- SCENE 3: TYPOGRAPHY MỘNG MƠ (Dựa theo image_9) ---------------- */}
            {stage === "text" && (
              <motion.div
                className="absolute inset-0 z-50 flex flex-col items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, filter: "blur(20px)" }}
                transition={{ duration: 1.5 }}
                // Background bầu trời mây pastel ảo diệu
                style={{
                  background: "radial-gradient(circle at center, #ffc3a0 0%, #ffafbd 30%, #a18cd1 80%, #fbc2eb 100%)",
                }}
              >
                {/* Lớp filter mây trắng lơ lửng làm nền */}
                <div className="absolute inset-0 bg-white/20 mix-blend-overlay blur-3xl" />

                <motion.div
                  className="relative z-10 text-center px-4"
                  initial={{ y: 30, scale: 0.9, opacity: 0 }}
                  animate={{ y: 0, scale: 1, opacity: 1 }}
                  transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
                >
                  <p className="font-sans-elegant text-white text-sm md:text-lg tracking-[0.2em] uppercase mb-4 drop-shadow-md">
                    Chào mừng bạn đến với
                  </p>
                  
                  <div className="relative">
                    {/* Icon lấp lánh điểm xuyết quanh chữ */}
                    <motion.div className="absolute -top-6 -left-6 text-white text-2xl" animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 2 }}>✦</motion.div>
                    <motion.div className="absolute -bottom-4 -right-4 text-white text-3xl" animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2.5, delay: 0.5 }}>✧</motion.div>

                    <h1 className="font-dreamy text-6xl md:text-8xl lg:text-9xl glow-text leading-tight px-8">
                      Thế giới mộng mơ
                      <br />
                      <span className="text-5xl md:text-7xl lg:text-8xl mt-2 block">của Hinh</span>
                    </h1>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
