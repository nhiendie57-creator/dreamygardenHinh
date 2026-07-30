import React, { useState } from "react";
import { doc, setDoc, arrayUnion } from "firebase/firestore";
import { db } from "../config/firebase";
import { UserProfile } from "../types";
import { motion, AnimatePresence } from "framer-motion";
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

// Hàm lấy ngày chuẩn theo giờ địa phương (tránh lỗi múi giờ quốc tế)
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

  // Tính toán ngày hiện tại và hôm qua
  const todayStr = getLocalDateStr(new Date());
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateStr(yesterday);

  const lastDate = currentUser?.lastManifestDate ? currentUser.lastManifestDate.split("T")[0] : null;

  // Kiểm tra xem hôm nay ĐÃ MANIFEST CHƯA
  const hasManifestedToday = lastDate === todayStr;

  // Lọc số chuỗi HIỂN THỊ 
  // Nếu chưa từng manifest hoặc đã bỏ lỡ ngày hôm qua -> tạm hiển thị 0
  let displayStreak = currentUser?.currentStreak || 0;
  if (!lastDate || (lastDate !== todayStr && lastDate !== yesterdayStr)) {
    displayStreak = 0; 
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

    let newStreak = currentUser.currentStreak || 0;
    let streakIncreased = false;

    if (hasManifestedToday) {
      // Đã giữ chuỗi hôm nay rồi -> KHÔNG CỘNG THÊM, GIỮ NGUYÊN CHUỖI
      newStreak = currentUser.currentStreak;
      streakIncreased = false;
    } else if (lastDate === yesterdayStr) {
      // Đã manifest hôm qua, nay viết tiếp -> Cộng thêm 1 ngày chuỗi
      newStreak += 1;
      streakIncreased = true;
    } else {
      // Lần đầu tiên viết HOẶC đã đứt chuỗi (nghỉ từ 2 ngày trở lên) -> Bắt đầu lại từ 1
      newStreak = 1;
      streakIncreased = true;
    }

    const currentWish = wish.trim();

    try {
      // Lưu lên Firestore
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

      // Hiệu ứng bay lên
      const generatedParticles = Array.from({ length: 15 }).map((_, i) => ({
        id: i + Date.now(),
        x: Math.random() * 200 - 100,
        y: -Math.random() * 150 - 50,
        delay: Math.random() * 0.4,
      }));
      setParticles(generatedParticles);
      setShowParticles(true);

      // Reset form
      setWish("");
      setTimeout(() => {
        onUpdateUser(updatedUser);
        setShowParticles(false);
        if (streakIncreased) {
          showToast(`Điều ước cất cánh! Streak tăng lên: ✨ ${newStreak} ngày`, "success");
        } else {
          showToast("Vũ trụ đã ghi nhận thêm điều ước của bạn! ✨ (Chuỗi đã được giữ trước đó)", "info");
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
      <div className="bg-white/25 backdrop-blur-lg border border-white/40 p-5 rounded-[32px] shadow-xl w-[340px] relative overflow-hidden transition-all duration-300 hover:shadow-pink-100/50">
        
        {/* Particle Overlay */}
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

        <div className="flex justify-between items-center mb-4 gap-2">
          <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase flex items-center gap-1.5 whitespace-nowrap">
            <Wand2 className="w-3.5 h-3.5 text-purple-400" />
            Manifestation
          </span>
          {currentUser ? (
            <motion.div 
              className="text-[11px] font-bold text-pink-500 bg-pink-50/90 px-3 py-1.5 rounded-full shadow-sm border border-pink-100 whitespace-nowrap flex items-center gap-1"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              ✨ {displayStreak} Ngày Nhiệm Màu
            </motion.div>
          ) : (
            <span className="text-[10px] font-semibold text-slate-500 bg-white/40 px-2 py-1 rounded-full">
              Chưa Đăng Nhập
            </span>
          )}
        </div>

        {/* Khung hiển thị câu manifest gần nhất */}
        {currentUser && lastWish && displayStreak > 0 && (
          <div className="mb-4 bg-pink-50/70 rounded-xl p-3 border border-pink-100/60 relative flex gap-2.5 items-start shadow-inner text-left">
            <Quote className="w-3.5 h-3.5 text-pink-400 flex-shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-pink-500 uppercase tracking-wider mb-1">
                Vũ trụ đã ghi nhận:
              </span>
              <p className="text-[11px] text-slate-600 italic leading-relaxed line-clamp-2">
                "{lastWish}"
              </p>
            </div>
          </div>
        )}

        {/* Thông báo đã giữ chuỗi */}
        {hasManifestedToday && (
          <div className="mb-3 flex items-center justify-center gap-1.5 bg-green-50/80 border border-green-200/60 text-green-600 text-[10px] font-bold py-1.5 px-3 rounded-lg shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Bạn đã giữ chuỗi hôm nay! (Có thể gửi thêm)
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
                    placeholder={hasManifestedToday ? "Viết thêm điều ước gửi vào không gian..." : "Hôm nay bạn muốn gửi điều gì vào vũ trụ?... 💫"}
                    className="w-full bg-white/50 border border-white/60 rounded-xl px-4 py-3.5 text-xs outline-none pr-10 italic text-slate-800 placeholder-slate-400 focus:bg-white/80 focus:border-pink-300 transition-colors shadow-sm"
                  />
                  <button
                    type="submit"
                    className="absolute right-3 top-3 text-pink-400 hover:text-pink-600 active:scale-90 transition-all p-1 bg-white/50 hover:bg-white rounded-full shadow-sm"
                    title="Phóng điều ước lên vũ trụ"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="sending-stage"
                  className="flex flex-col items-center justify-center py-3"
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
          <div className="text-center py-3 text-xs text-slate-500 italic flex items-center justify-center gap-1.5 bg-white/30 rounded-xl">
            <Info className="w-3.5 h-3.5" />
            Vui lòng đăng nhập để gửi điều ước!
          </div>
        )}
      </div>
    </div>
  );
}
