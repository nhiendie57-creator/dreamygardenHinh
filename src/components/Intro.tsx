import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface IntroProps {
  onComplete: () => void;
}

export default function Intro({ onComplete }: IntroProps) {
  const [stage, setStage] = useState<"envelope" | "opening" | "text" | "finished">("envelope");

  const handleEnvelopeClick = () => {
    setStage("opening");
    setTimeout(() => {
      setStage("text");
    }, 1800);
    setTimeout(() => {
      setStage("finished");
      onComplete();
    }, 4500);
  };

  return (
    <AnimatePresence>
      {stage !== "finished" && (
        <motion.div
          id="intro-container"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #E6E6FA 0%, #FFD1DC 50%, #BCECAC 100%)",
          }}
          exit={{
            y: "-100vh",
            transition: { duration: 1.2, ease: [0.76, 0, 0.24, 1] },
          }}
        >
          {/* Floating clouds inside intro */}
          <div className="absolute top-10 left-10 w-64 h-32 bg-white/50 blur-2xl rounded-full animate-pulse" />
          <div className="absolute bottom-10 right-10 w-80 h-40 bg-pink-100/40 blur-2xl rounded-full" />

          {stage === "envelope" && (
            <div className="flex flex-col items-center justify-center">
              {/* Envelope Container with Wings */}
              <motion.div
                id="envelope-wrapper"
                className="relative cursor-pointer select-none"
                initial={{ y: "100vh", opacity: 0, scale: 0.8 }}
                animate={{
                  y: [20, -20, 20],
                  opacity: 1,
                  scale: 1,
                }}
                transition={{
                  y: {
                    repeat: Infinity,
                    duration: 3,
                    ease: "easeInOut",
                  },
                  default: { duration: 1.5, ease: "easeOut" },
                }}
                onClick={handleEnvelopeClick}
              >
                {/* Left Wing */}
                <motion.div
                  className="absolute top-4 -left-16 w-16 h-10 bg-white/75 border border-pink-200"
                  style={{
                    borderRadius: "50% 10% 50% 50%",
                    transformOrigin: "right center",
                  }}
                  animate={{ rotate: [15, -15, 15] }}
                  transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
                />

                {/* Right Wing */}
                <motion.div
                  className="absolute top-4 -right-16 w-16 h-10 bg-white/75 border border-pink-200"
                  style={{
                    borderRadius: "10% 50% 50% 50%",
                    transformOrigin: "left center",
                  }}
                  animate={{ rotate: [-15, 15, -15] }}
                  transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
                />

                {/* Main Envelope Body */}
                <div className="w-56 h-36 bg-pink-200 rounded-2xl shadow-xl border-2 border-white flex flex-col items-center justify-center relative overflow-hidden group">
                  {/* Flap */}
                  <div className="absolute top-0 inset-x-0 h-0 w-0 border-t-[72px] border-t-pink-300 border-x-[112px] border-x-transparent border-b-0 origin-top" />
                  
                  {/* Heart sticker lock */}
                  <motion.div
                    className="absolute z-10 text-rose-500 text-3xl drop-shadow-md"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                  >
                    💖
                  </motion.div>

                  <span className="absolute bottom-3 text-[10px] uppercase font-bold tracking-widest text-pink-700/70">
                    Bấm để mở thư
                  </span>
                </div>
              </motion.div>
              <motion.p
                className="mt-8 text-sm font-semibold tracking-wider text-pink-600/80 animate-pulse text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                Ngu Hinh gửi đến bạn một lời mời...
              </motion.p>
            </div>
          )}

          {stage === "opening" && (
            <motion.div
              id="envelope-opening"
              className="relative flex flex-col items-center"
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            >
              {/* Envelope blowing apart with lovely glow */}
              <div className="w-56 h-36 bg-pink-100/80 rounded-2xl border border-white flex items-center justify-center relative">
                <div className="absolute top-[-30px] text-5xl">✨</div>
                <div className="absolute bottom-[-20px] text-4xl">🌸</div>
                <div className="text-pink-400 text-4xl animate-ping">💖</div>
              </div>
            </motion.div>
          )}

          {stage === "text" && (
            <motion.div
              id="intro-text"
              className="flex flex-col items-center text-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.1, opacity: 0 }}
              transition={{ duration: 1.2 }}
            >
              <span className="text-xs tracking-[6px] uppercase text-pink-700/60 font-semibold mb-2 italic">
                CRAFTED BY NGU HINH
              </span>
              <h1 className="flex flex-col md:flex-row items-center gap-2 md:gap-5">
                <span className="text-5xl md:text-7xl font-display text-white text-glow-pearl">
                  Dreamy
                </span>
                <span className="text-7xl md:text-9xl font-script text-pink-400 text-glow-pink">
                  Garden
                </span>
              </h1>
              <motion.div
                className="mt-6 h-[2px] w-24 bg-gradient-to-r from-transparent via-pink-400 to-transparent"
                initial={{ width: 0 }}
                animate={{ width: 120 }}
                transition={{ duration: 1.5 }}
              />
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
