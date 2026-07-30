import React, { useState, useEffect } from "react";
import { Send, Sparkles, CloudSun } from "lucide-react";
import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { UserProfile } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface ManifestSectionProps {
  currentUser: (UserProfile & { isAdmin: boolean }) | null;
  onStreakUpdate: (newStreak: number, lastDate: string) => void;
}

interface Butterfly {
  id: number;
  x: number;
  y: number;
  scale: number;
  color: string;
  delay: number;
}

export default function ManifestSection({ currentUser, onStreakUpdate }: ManifestSectionProps) {
  const [message, setMessage] = useState("");
  const [isFlying, setIsFlying] = useState(false);
  const [submittedText, setSubmittedText] = useState("");
  const [butterflies, setButterflies] = useState<Butterfly[]>([]);
  const [streakBounce, setStreakBounce] = useState(false);

  if (!currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMsg = message.trim();
    if (!trimmedMsg) return;

    setSubmittedText(trimmedMsg);
    setIsFlying(true);
    setMessage("");

    // Generate butterflies at the location of the form
    const colors = ["#FFB6C1", "#E6E6FA", "#BCECAC", "#FAFAD2", "#FFD700"];
    const newButterflies = Array.from({ length: 12 }).map((_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 160, // scatter horizontally
      y: -50 - Math.random() * 200, // rise up
      scale: Math.random() * 0.4 + 0.6,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.4,
    }));
    setButterflies(newButterflies);

    // Save Manifestation in Firebase Firestore
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const userRef = doc(db, "users", currentUser.username);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data() as UserProfile;
        let newStreak = userData.currentStreak || 0;
        const lastDate = userData.lastManifestDate;

        if (!lastDate) {
          // First manifest
          newStreak = 1;
        } else if (lastDate === todayStr) {
          // Already manifested today, streak stays same
        } else {
          // Check if yesterday was the last manifest
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split("T")[0];

          if (lastDate === yesterdayStr) {
            newStreak += 1;
          } else {
            // Missed a day, reset to 1
            newStreak = 1;
          }
        }

        // Save to manifest history
        await updateDoc(userRef, {
          currentStreak: newStreak,
          lastManifestDate: todayStr,
          manifestHistory: arrayUnion({
            text: trimmedMsg,
            date: new Date().toISOString(),
          }),
        });

        // Trigger streak bounce visual effect
        setTimeout(() => {
          setStreakBounce(true);
          onStreakUpdate(newStreak, todayStr);
          setTimeout(() => setStreakBounce(false), 1000);
        }, 1500);
      }
    } catch (err) {
      console.error("Error saving manifestation:", err);
    }

    // End flying animation after 3 seconds
    setTimeout(() => {
      setIsFlying(false);
      setSubmittedText("");
      setButterflies([]);
    }, 3500);
  };

  return (
    <div className="w-full max-w-lg mx-auto p-4 select-none" id="manifestation-section">
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="relative glass-panel rounded-3xl p-6 border border-white/70 shadow-2xl overflow-hidden flex flex-col items-center"
        >
          {/* Glowing Ambient light */}
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-yellow-200/30 filter blur-2xl rounded-full" />
          <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-purple-200/30 filter blur-2xl rounded-full" />

          {/* Cloud Sun Header */}
          <div className="flex items-center gap-2 mb-3.5">
            <CloudSun className="w-6 h-6 text-pink-400 animate-pulse" />
            <h2 className="text-xl font-bold font-dancing text-pink-700 tracking-wide text-glow-pearl">
              Khế Ước Vũ Trụ
            </h2>
          </div>

          {/* Streak Indicator with Bounce Option */}
          <motion.div
            animate={streakBounce ? { scale: [1, 1.3, 0.95, 1.05, 1] } : {}}
            transition={{ duration: 0.8 }}
            className="px-5 py-1.5 rounded-full bg-white/70 shadow-sm border border-pink-200/50 flex items-center gap-1.5 mb-5 font-semibold text-xs text-pink-700"
          >
            <span>✨</span>
            <span>{currentUser.currentStreak} Ngày Manifest Liên Tiếp</span>
            <span>✨</span>
          </motion.div>

          <AnimatePresence mode="wait">
            {!isFlying ? (
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full flex flex-col gap-3 relative"
              >
                <div className="relative">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Hôm nay bạn muốn gửi điều nguyện cầu gì vào vũ trụ thơ mộng này?..."
                    className="w-full h-24 bg-white/40 border border-pink-200/50 rounded-2xl p-4 text-sm text-pink-900 focus:outline-none focus:ring-2 focus:ring-pink-300 placeholder:text-pink-400/60 resize-none custom-scroll leading-relaxed"
                    maxLength={300}
                    required
                  />
                  <div className="absolute bottom-2.5 right-3 text-[10px] text-pink-400 font-medium">
                    {message.length}/300
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 hover:opacity-90 text-white font-bold rounded-xl py-2.5 transition active:scale-95 flex items-center justify-center gap-2 shadow-md cursor-pointer text-sm"
                >
                  <Send className="w-4 h-4" />
                  Gửi vào Tinh Cầu
                </button>
              </motion.form>
            ) : (
              <motion.div
                key="animation-container"
                className="w-full h-36 flex flex-col items-center justify-center relative overflow-visible"
              >
                {/* Dissolving & Floating Glow text */}
                <motion.div
                  initial={{ y: 0, opacity: 1, scale: 1 }}
                  animate={{ y: -80, opacity: 0, scale: 1.15, filter: "blur(4px)" }}
                  transition={{ duration: 2, ease: "easeOut" }}
                  className="text-center font-medium italic text-pink-600 text-glow-pink max-w-[85%] text-sm leading-relaxed"
                >
                  "{submittedText}"
                </motion.div>

                {/* Sparkling dust text */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1.5 }}
                  className="absolute text-xs text-yellow-500 font-bold"
                >
                  🪄 Phép màu nhiệm đang gửi đi...
                </motion.div>

                {/* Flying butterflies */}
                {butterflies.map((bf) => (
                  <motion.div
                    key={bf.id}
                    className="absolute pointer-events-none origin-center"
                    initial={{ x: 0, y: 30, opacity: 1, scale: 0 }}
                    animate={{
                      x: [0, bf.x / 2, bf.x],
                      y: [30, bf.y / 2, bf.y],
                      opacity: [1, 1, 0],
                      scale: [0, bf.scale, bf.scale * 1.2],
                    }}
                    transition={{
                      duration: 2.8,
                      delay: bf.delay,
                      ease: "easeOut",
                    }}
                  >
                    {/* Tiny cute butterfly SVG */}
                    <svg viewBox="0 0 24 24" fill={bf.color} className="w-6 h-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
                      <path d="M12 8c-.5-1.5-2.5-3-4.5-3S3 6.5 3 8.5C3 11 6 12 12 16c6-4 9-5 9-7.5 0-2-2.5-3.5-4.5-3.5S12.5 6.5 12 8z" />
                      {/* Left wing flutter */}
                      <motion.path
                        d="M3 8.5C3 11 6 12 12 16"
                        stroke="#FFF"
                        strokeWidth="1"
                        animate={{ skewX: [0, 15, 0] }}
                        transition={{ duration: 0.15, repeat: Infinity }}
                      />
                      {/* Right wing flutter */}
                      <motion.path
                        d="M12 16c6-4 9-5 9-7.5"
                        stroke="#FFF"
                        strokeWidth="1"
                        animate={{ skewX: [0, -15, 0] }}
                        transition={{ duration: 0.15, repeat: Infinity }}
                      />
                    </svg>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
