import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface IntroProps {
  onComplete: () => void;
}

export default function Intro({ onComplete }: IntroProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Không còn cảnh mở cửa -> vào thẳng chữ, tự tắt sau vài giây
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete();
    }, 3200);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <>
      {/* Font script bay bổng, giống kiểu "Dream Big" */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Mrs+Saint+Delafield&family=Alex+Brush&family=Montserrat:wght@300;400;500&display=swap');

        .font-dreamy-main {
          font-family: 'Mrs Saint Delafield', cursive;
        }

        .font-dreamy-sub {
          font-family: 'Alex Brush', cursive;
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
      `}</style>

      <AnimatePresence>
        {visible && (
          <motion.div
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(20px)", transition: { duration: 1.2 } }}
            transition={{ duration: 1 }}
            style={{
              background:
                "radial-gradient(circle at center, #ffc3a0 0%, #ffafbd 30%, #a18cd1 80%, #fbc2eb 100%)",
            }}
          >
            {/* Lớp mây trắng lơ lửng làm nền */}
            <div className="absolute inset-0 bg-white/20 mix-blend-overlay blur-3xl" />

            <motion.div
              className="relative z-10 text-center px-4"
              initial={{ y: 30, scale: 0.9, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
            >
              <p className="font-sans-elegant text-white text-sm md:text-lg tracking-[0.2em] uppercase mb-4 drop-shadow-md">
                Chào mừng bạn đến với
              </p>

              <div className="relative">
                <motion.div
                  className="absolute -top-6 -left-6 text-white text-2xl"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  ✦
                </motion.div>
                <motion.div
                  className="absolute -bottom-4 -right-4 text-white text-3xl"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2.5, delay: 0.5 }}
                >
                  ✧
                </motion.div>

                <h1 className="font-dreamy-main glow-text leading-tight px-8 text-6xl md:text-8xl lg:text-9xl">
                  Thế giới mộng mơ
                </h1>
                <h2 className="font-dreamy-sub glow-text mt-2 text-5xl md:text-7xl lg:text-8xl">
                  của Hinh
                </h2>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
