import React, { useState } from "react";
import { doc, setDoc, arrayUnion } from "firebase/firestore";
import { db } from "../config/firebase";
import { UserProfile } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { Send, Wand2, Info, Quote, CheckCircle2 } from "lucide-react";

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

const getLocalDateStr = (d: Date) => {
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split("T")[0];
};

export default function Manifestation({
  currentUser,
  onUpdateUser,
  showToast,
}: ManifestationProps) {
  const [wish, setWish] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [particles, setParticles] = useState<StarParticle[]>([]);

  const todayStr = getLocalDateStr(new Date());
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateStr(yesterday);

  const lastDate = currentUser?.lastManifestDate ? currentUser.lastManifestDate.split("T")[0] : null;
  const hasManifestedToday = lastDate === todayStr;

  let displayStreak = currentUser?.currentStreak || 0;
  if (!lastDate || (lastDate !== todayStr && lastDate !== yesterdayStr)) {
    displayStreak = 0; 
  }

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

    let newStreak = currentUser.currentStreak || 0;
    let streakIncreased = false;

    if (hasManifestedToday) {
      newStreak = currentUser.currentStreak;
      streakIncreased = false;
    } else if (lastDate === yesterdayStr) {
      newStreak += 1;
      streakIncreased = true;
    } else {
      newStreak = 1;
      streakIncreased = true;
    }

    const currentWish = wish.trim();

    try {
      const userRef = doc(db, "users", currentUser.username.toLowerCase());
      
      const updatedUser: UserProfile = {
        ...currentUser,
        currentStreak: newStreak,
        lastManifestDate: todayStr,
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

      const generatedParticles = Array.from({ length: 20 }).map((_, i) => ({
        id: i + Date.now(),
        x: Math.random() * 300 - 150,
        y: -Math.random() * 200 - 100,
        delay: Math.random() * 0.4,
      }));
      setParticles(generatedParticles);
      setShowParticles(true);

      setWish("");
      setTimeout(() => {
        onUpdateUser(updatedUser);
        setShowParticles(false);
        if (streakIncreased) {
          showToast(`Điều ước cất cánh! Streak tăng lên: ✨ ${newStreak} ngày`, "success");
        } else {
          showToast("Vũ trụ đã ghi nhận thêm điều ước của bạn! ✨", "info");
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
    <div className="w-full max-w-3xl mx-auto px-4 py-8 z-10 flex flex-col gap-6 relative text-slate-800">
      
      {/* Tiêu đề trang mới */}
      <div className="text-center mb-4">
        <h2 className="text-4xl md:text-5xl font-dancing font-bold text-pink-700 text-glow-pearl mb-2">
          Trạm Gửi Điều Ước
        </h2>
        <p className="text-xs md:text-sm text-pink-600/80 italic font-sans-dreamy max-w-md mx-auto">
          "Nơi thời gian dừng lại, để bạn gửi gắm những hy vọng nhiệm màu vào vũ trụ bao la..."
        </p>
      </div>

      <div className="bg-white/20 backdrop-blur-lg border border-white/40 p-6 md:p-8 rounded-[36px] shadow-2xl w-full relative overflow-hidden transition-all duration-300">
        
        <AnimatePresence>
          {showParticles && (
            <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
              {particles.map((p) => (
                <motion.div
                  key={p.id}
                  className="absolute text-pink-400 font-bold text-2xl"
                  initial={{ opacity: 1, scale: 0.5, x: 0, y: 0 }}
                  animate={{
                    opacity: 0,
                    scale: [1, 2, 0.5],
                    x: p.x,
                    y: p.y,
                    rotate: Math.random() * 360,
                  }}
                  transition={{ duration: 2, delay: p.delay, ease: "easeOut" }}
                >
                  {Math.random() > 0.5 ? "🦋" : "✨"}
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>

        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b border-pink-100/50 pb-4">
          <span className="text-sm font-bold text-slate-700 tracking-widest uppercase flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-500" />
            Nhật Ký Manifestation
          </span>
          {currentUser ? (
            <motion.div 
              className="text-sm font-bold text-pink-500 bg-pink-50/90 px-4 py-2 rounded-full shadow-sm border border-pink-200 flex items-center gap-2"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              ✨ {displayStreak} Ngày Nhiệm Màu
            </motion.div>
          ) : (
            <span className="text-xs font-semibold text-slate-500 bg-white/40 px-3 py-1.5 rounded-full">
              Chưa Đăng Nhập
            </span>
          )}
        </div>

        {currentUser && lastWish && displayStreak > 0 && (
          <div className="mb-6 bg-pink-50/70 rounded-2xl p-5 border border-pink-100/60 relative flex gap-3 items-start shadow-inner">
            <Quote className="w-6 h-6 text-pink-400 flex-shrink-0 opacity-50" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-pink-500 uppercase tracking-wider mb-2">
                Vũ trụ đã ghi nhận điều ước gần nhất:
              </span>
              <p className="text-sm text-slate-700 italic leading-relaxed font-semibold">
                "{lastWish}"
              </p>
            </div>
          </div>
        )}

        {hasManifestedToday && (
          <div className="mb-6 flex items-center justify-center gap-2 bg-green-50/80 border border-green-200/60 text-green-700 text-sm font-bold py-3 px-4 rounded-xl shadow-sm">
            <CheckCircle2 className="w-5 h-5" />
            Bạn đã duy trì chuỗi thành công hôm nay! (Vẫn có thể gửi thêm)
          </div>
        )}

        {currentUser ? (
          <form onSubmit={handleSendWish} className="relative mt-4">
            <AnimatePresence mode="wait">
              {!isSending ? (
                <motion.div
                  key="input-stage"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
                  className="flex flex-col gap-4"
                >
                  <textarea
                    value={wish}
                    onChange={(e) => setWish(e.target.value)}
                    placeholder={hasManifestedToday ? "Gửi thêm những dòng suy nghĩ tích cực vào không gian..." : "Hôm nay bạn muốn gửi điều gì vào vũ trụ?... 💫"}
                    className="w-full h-32 bg-white/60 border border-pink-200/50 rounded-2xl p-5 text-sm outline-none text-slate-800 placeholder-slate-400 focus:bg-white/90 focus:border-pink-300 transition-colors shadow-inner resize-none leading-relaxed"
                  />
                  <button
                    type="submit"
                    className="self-end bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-3 px-8 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-pink-200"
                  >
                    <Send className="w-4 h-4" />
                    Phóng lên vũ trụ
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="sending-stage"
                  className="flex flex-col items-center justify-center py-10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Wand2 className="w-10 h-10 text-pink-400 animate-spin mb-3" />
                  <span className="text-sm font-bold text-pink-600 text-glow-pink animate-pulse">
                    Đang truyền năng lượng vào tinh tú... 🌌
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        ) : (
          <div className="text-center py-8 text-sm text-slate-500 font-semibold flex flex-col items-center justify-center gap-3 bg-white/30 rounded-2xl border border-white/50">
            <Info className="w-8 h-8 text-pink-300" />
            <p>Vui lòng đăng nhập ở góc trái màn hình để bắt đầu hành trình Manifest!</p>
          </div>
        )}
      </div>
    </div>
  );
}
