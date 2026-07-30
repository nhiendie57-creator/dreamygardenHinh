import React, { useState } from "react";
import { doc, setDoc, arrayUnion } from "firebase/firestore";
import { db } from "../config/firebase";
import { UserProfile } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Wand2, Info, Quote } from "lucide-react";

interface ManifestationProps {
  currentUser: UserProfile | null;
  onUpdateUser: (updatedUser: UserProfile) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

interface StarParticle {
  id: number;
  x: number;
  y: number;
  delay: number;
}

export default function Manifestation({
  currentUser,
  onUpdateUser,
  showToast,
}: ManifestationProps) {
  const [wish, setWish] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [particles, setParticles] = useState<StarParticle[]>([]);

  // Tính toán ngày hiện tại và hôm qua
  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const lastDate = currentUser?.lastManifestDate ? currentUser.lastManifestDate.split("T")[0] : null;

  // Lọc số chuỗi HIỂN THỊ (Xóa chuỗi ảo nếu đã đứt chuỗi)
  let displayStreak = currentUser?.currentStreak || 0;
  if (lastDate && lastDate !== todayStr && lastDate !== yesterdayStr) {
    displayStreak = 0; // Đứt chuỗi thì tạm hiện 0
  }

  // Lấy câu Manifest gần nhất trong lịch sử
  const historyList = currentUser?.manifestHistory || [];
  const lastWish = historyList.length > 0 ? historyList[historyList.length - 1].wish : null;

  const handleSendWish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      showToast("Vui lòng đăng nhập để gửi điều ước vào vũ trụ! ✨", "info");
      return;
    }

    if (!wish.trim()) {
      showToast("Điều ước của bạn đang trống trải. Hãy viết điều gì đó nhé! 🌸", "error");
      return;
    }

    setIsSending(true);

    let newStreak = currentUser.currentStreak;
    let streakIncreased = false;

    if (lastDate === todayStr) {
      // Đã manifest hôm nay rồi -> Không tăng chuỗi
      streakIncreased = false;
    } else if (lastDate === yesterdayStr) {
      // Ngày liên tiếp -> Cộng chuỗi
      newStreak += 1;
      streakIncreased = true;
    } else {
      // Lần đầu tiên hoặc đã đứt chuỗi -> Reset về 1 ngày
      newStreak = 1;
      streakIncreased = true;
    }

    const currentWish = wish.trim();

    try {
      // Save manifestation to Firestore
      const userRef = doc(db, "users", currentUser.username.toLowerCase());
      
      const updatedUser: UserProfile = {
        ...currentUser,
        currentStreak: newStreak,
        lastManifestDate: todayStr,
        // Cập nhật mảng lịch sử ở local để hiển thị ngay lập tức
        manifestHistory: [...historyList, { wish: currentWish, date: new Date().toISOString() }],
      };

      await setDoc(
        userRef,
        {
          currentStreak: newStreak,
          lastManifestDate: todayStr,
          manifestHistory: arrayUnion({
            wish: currentWish,
            date: new Date().toISOString(),
          }),
        },
        { merge: true }
      );

      // Trigger the spectacular particle animation
      const generatedParticles = Array.from({ length: 15 }).map((_, i) => ({
        id: i + Date.now(),
        x: Math.random() * 200 - 100, // horizontal spreading
        y: -Math.random() * 150 - 50, // floating high up
        delay: Math.random() * 0.4,
      }));
      setParticles(generatedParticles);
      setShowParticles(true);

      // Reset form and update user state
      setWish("");
      setTimeout(() => {
        onUpdateUser(updatedUser);
        setShowParticles(false);
        if (streakIncreased) {
          showToast(`Điều ước của bạn đã hóa thành cánh bướm bay vào vũ trụ! Streak tăng lên: ✨ ${newStreak} ngày`, "success");
        } else {
          showToast("Điều ước của bạn đã cất cánh bay vào vũ trụ rộng lớn! ✨", "success");
        }
      }, 1800);

    } catch (err) {
      console.error(err);
      showToast("Gặp khó khăn khi truyền phát điều ước đến các vì sao!", "error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div 
      id="manifestation-streak" 
      className="absolute bottom-8 right-8 z-[100] text-right"
    >
      <div className="bg-white/25 backdrop-blur-lg border border-white/40 p-4 rounded-3xl shadow-xl w-72 relative overflow-hidden transition-all duration-300 hover:shadow-pink-100/50">
        
        {/* Particle Overlay for the dissolve animation */}
        <AnimatePresence>
          {showParticles && (
            <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
              {particles.map((p) => (
                <motion.div
                  key={p.id}
                  className="absolute text-pink-400 font-bold"
                  initial={{ opacity: 1, scale: 0.8, x: 0, y: 0 }}
                  animate={{
                    opacity: 0,
                    scale: [1, 1.5, 0.5],
                    x: p.x,
                    y: p.y,
                    rotate: Math.random() * 360,
                  }}
                  transition={{ duration: 1.6, delay: p.delay, ease: "easeOut" }}
                >
                  {Math.random() > 0.5 ? "🦋" : "✨"}
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>

        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase flex items-center gap-1">
            <Wand2 className="w-3 h-3 text-purple-400" />
            Manifestation
          </span>
          {currentUser ? (
            <motion.span 
              className="text-xs font-bold text-pink-500 bg-pink-50 px-2.5 py-0.5 rounded-full shadow-inner border border-pink-100"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              ✨ {displayStreak} Ngày Nhiệm Màu
            </motion.span>
          ) : (
            <span className="text-[9px] font-semibold text-slate-500">Chưa Đăng Nhập</span>
          )}
        </div>

        {/* Khung hiển thị câu manifest gần nhất */}
        {currentUser && lastWish && (
          <div className="mb-3 bg-pink-50/60 rounded-xl p-2.5 border border-pink-100/50 relative flex gap-2 items-start shadow-inner text-left">
            <Quote className="w-3 h-3 text-pink-400 flex-shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-pink-500 uppercase tracking-wider mb-0.5">
                Vũ trụ đã ghi nhận:
              </span>
              <p className="text-[10px] text-slate-600 italic leading-relaxed line-clamp-2">
                "{lastWish}"
              </p>
            </div>
          </div>
        )}

        {currentUser ? (
          <form onSubmit={handleSendWish} className="relative">
            <AnimatePresence mode="wait">
              {!isSending ? (
                <motion.div
                  key="input-stage"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
                >
                  <input
                    type="text"
                    value={wish}
                    onChange={(e) => setWish(e.target.value)}
                    placeholder="Hôm nay bạn muốn gửi điều gì vào vũ trụ?... 💫"
                    className="w-full bg-white/40 border border-white/50 rounded-xl px-4 py-3 text-xs outline-none pr-10 italic text-slate-800 placeholder-slate-500 focus:bg-white/60 focus:border-pink-300 transition-colors"
                  />
                  <button
                    type="submit"
                    className="absolute right-3 top-2.5 text-pink-400 hover:text-pink-600 active:scale-90 transition-all p-1"
                    title="Phóng điều ước lên vũ trụ"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="sending-stage"
                  className="flex flex-col items-center justify-center py-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <span className="text-xs font-bold text-pink-600 text-glow-pink animate-pulse">
                    Đang truyền năng lượng vào tinh tú... 🌌
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        ) : (
          <div className="text-center py-2 text-xs text-slate-600/80 italic flex items-center justify-center gap-1">
            <Info className="w-3 h-3 text-slate-500" />
            Vui lòng đăng nhập để gửi điều ước!
          </div>
        )}
      </div>
    </div>
  );
}
