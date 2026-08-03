import React, { useState } from "react";
import { doc, setDoc, arrayUnion } from "firebase/firestore";
import { db } from "../config/firebase";
import { UserProfile, KeyTier, UserKeys } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { Send, Wand2, Info, Quote, CheckCircle2, KeyRound } from "lucide-react";

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

// --- Hệ thống Chìa Khoá: đổi streak hiện tại lấy khoá, streak sẽ bị tiêu về 0 sau khi đổi ---
// NOTE: metadata này được lặp lại giống hệt trong CharacterSection.tsx để 2 nơi luôn khớp mốc ngày.
const KEY_TIER_META: Record<KeyTier, { label: string; threshold: number; emoji: string; color: string }> = {
  bronze: { label: "Đồng", threshold: 10, emoji: "🥉", color: "border-orange-300 bg-orange-50 text-orange-700" },
  silver: { label: "Bạc", threshold: 20, emoji: "🥈", color: "border-slate-300 bg-slate-100 text-slate-600" },
  gold: { label: "Vàng", threshold: 30, emoji: "🥇", color: "border-amber-300 bg-amber-50 text-amber-600" },
  diamond: { label: "Kim Cương", threshold: 40, emoji: "💎", color: "border-cyan-300 bg-cyan-50 text-cyan-600" },
};
const KEY_TIER_ORDER: KeyTier[] = ["bronze", "silver", "gold", "diamond"];
const EMPTY_KEYS: UserKeys = { bronze: 0, silver: 0, gold: 0, diamond: 0 };

export default function Manifestation({
  currentUser,
  onUpdateUser,
  showToast,
}: ManifestationProps) {
  const [wish, setWish] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [particles, setParticles] = useState<StarParticle[]>([]);
  const [redeemingTier, setRedeemingTier] = useState<KeyTier | null>(null);

  // --- LOGIC ĐẾM NGÀY MỚI (CHUẨN 100% THEO GIỜ ĐỊA PHƯƠNG) ---
  const checkStreakStatus = (lastDateStr?: string) => {
    // Nếu chưa từng gửi bao giờ
    if (!lastDateStr) return { hasManifestedToday: false, isStreakActive: false };

    const now = new Date();
    let lastDate: Date;

    // Tương thích ngược: Đọc cả dữ liệu code cũ "YYYY-MM-DD" và code mới "ISO String"
    if (lastDateStr.length === 10) {
      const [y, m, d] = lastDateStr.split('-');
      lastDate = new Date(Number(y), Number(m) - 1, Number(d));
    } else {
      lastDate = new Date(lastDateStr);
    }

    // So sánh xem có đúng là hôm nay không (Khớp ngày, tháng, năm)
    const isSameDay =
      lastDate.getFullYear() === now.getFullYear() &&
      lastDate.getMonth() === now.getMonth() &&
      lastDate.getDate() === now.getDate();

    // So sánh xem có phải hôm qua không (Để giữ chuỗi)
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      lastDate.getFullYear() === yesterday.getFullYear() &&
      lastDate.getMonth() === yesterday.getMonth() &&
      lastDate.getDate() === yesterday.getDate();

    return {
      hasManifestedToday: isSameDay,
      isStreakActive: isSameDay || isYesterday
    };
  };

  // Tính toán trạng thái thực tại
  const { hasManifestedToday, isStreakActive } = checkStreakStatus(currentUser?.lastManifestDate);

  // Nếu đứt chuỗi (không gửi hôm nay và cũng bỏ lỡ hôm qua) thì đưa về 0
  let displayStreak = currentUser?.currentStreak || 0;
  if (!isStreakActive) {
    displayStreak = 0;
  }

  // Kỷ lục chuỗi cao nhất từng đạt được - KHÔNG BAO GIỜ GIẢM, kể cả khi đứt chuỗi hiện tại.
  const highestStreak = currentUser?.highestStreak || 0;

  const historyList = currentUser?.manifestHistory || [];
  const lastWish = historyList.length > 0 ? historyList[historyList.length - 1].wish : null;
  const userKeys = currentUser?.keys || EMPTY_KEYS;

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

    // Phân tích lại lúc nhấn gửi
    const currentStatus = checkStreakStatus(currentUser.lastManifestDate);

    if (currentStatus.hasManifestedToday) {
      newStreak = currentUser.currentStreak || 0;
      streakIncreased = false;
    } else if (currentStatus.isStreakActive) {
      newStreak += 1; // Hôm qua có gửi, nay gửi tiếp -> Cộng chuỗi
      streakIncreased = true;
    } else {
      newStreak = 1; // Bắt đầu chuỗi mới
      streakIncreased = true;
    }

    // Cập nhật kỷ lục cao nhất nếu chuỗi hiện tại vượt qua kỷ lục cũ.
    const previousHighest = currentUser.highestStreak || 0;
    const newHighestStreak = Math.max(previousHighest, newStreak);
    const justBrokeRecord = newHighestStreak > previousHighest;

    const currentWish = wish.trim();
    // Lưu chính xác tới từng giây của lúc bấm gửi để không bao giờ bị lệch múi giờ nữa
    const exactTimeNow = new Date().toISOString();

    try {
      const userId = currentUser.username?.toLowerCase() || currentUser.uid || currentUser.id || "unknown_user";
      const userRef = doc(db, "users", userId);

      const updatedUser: UserProfile = {
        ...currentUser,
        currentStreak: newStreak,
        highestStreak: newHighestStreak,
        lastManifestDate: exactTimeNow,
        manifestHistory: [...historyList, { wish: currentWish, date: exactTimeNow }],
      };

      await setDoc(
        userRef,
        {
          currentStreak: newStreak,
          highestStreak: newHighestStreak,
          lastManifestDate: exactTimeNow,
          manifestHistory: arrayUnion({
            wish: currentWish,
            date: exactTimeNow,
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
        if (justBrokeRecord) {
          showToast(`Kỷ lục mới! ✨ ${newHighestStreak} ngày liên tiếp!`, "success");
        } else if (streakIncreased) {
          showToast(`Điều ước cất cánh! Streak tăng lên: ✨ ${newStreak} ngày`, "success");
        } else {
          showToast("Vũ trụ đã ghi nhận thêm điều ước của bạn! ✨", "info");
        }
      }, 1800);

    } catch (err: any) {
      console.error("Lỗi Manifest:", err);
      alert("Chi tiết lỗi Firebase: " + (err.message || "Lỗi không xác định"));
      showToast("Gặp khó khăn khi truyền phát điều ước đến các vì sao!", "error");
    } finally {
      setIsSending(false);
    }
  };

  // Đổi streak hiện tại lấy 1 chìa khoá - streak sẽ bị tiêu về 0 sau khi đổi thành công
  const handleRedeemKey = async (tier: KeyTier) => {
    if (!currentUser) {
      showToast("Vui lòng đăng nhập để đổi khoá! ✨", "info");
      return;
    }

    const threshold = KEY_TIER_META[tier].threshold;
    if (displayStreak < threshold) {
      showToast(`Cần giữ chuỗi ít nhất ${threshold} ngày để đổi Khoá ${KEY_TIER_META[tier].label}!`, "error");
      return;
    }

    setRedeemingTier(tier);
    const updatedKeys: UserKeys = {
      ...userKeys,
      [tier]: (userKeys[tier] || 0) + 1,
    };

    try {
      const userId = currentUser.username?.toLowerCase() || currentUser.uid || currentUser.id || "unknown_user";
      const userRef = doc(db, "users", userId);

      await setDoc(
        userRef,
        {
          currentStreak: 0,
          keys: updatedKeys,
        },
        { merge: true }
      );

      const updatedUser: UserProfile = {
        ...currentUser,
        currentStreak: 0,
        keys: updatedKeys,
      };
      onUpdateUser(updatedUser);
      showToast(
        `Đã đổi thành công 1 Khoá ${KEY_TIER_META[tier].emoji} ${KEY_TIER_META[tier].label}! Chuỗi được reset về 0, cùng bắt đầu hành trình mới nhé! 🔑`,
        "success"
      );
    } catch (err) {
      console.error(err);
      showToast("Đổi khoá thất bại, thử lại nhé!", "error");
    } finally {
      setRedeemingTier(null);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 z-10 flex flex-col gap-6 relative">

      {/* Tiêu đề trang */}
      <div className="text-center mb-4">
        <h2 className="text-3xl md:text-4xl font-bold text-indigo-900 mb-2 tracking-wide drop-shadow-[0_0_15px_rgba(255,255,255,1)]">
          Trạm Gửi Điều Ước
        </h2>
        <p className="text-xs md:text-sm text-indigo-900 italic max-w-md mx-auto font-semibold drop-shadow-[0_0_10px_rgba(255,255,255,0.9)]">
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
                  className="absolute text-indigo-400 font-bold text-2xl"
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
                  {Math.random() > 0.5 ? "🎀" : "✨"}
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>

        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b border-white/40 pb-4">
          <span className="text-sm font-bold text-indigo-900 tracking-widest uppercase flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-indigo-600" />
            Nhật Ký Manifestation
          </span>
          {currentUser ? (
            <div className="flex flex-col items-end gap-1">
              <motion.div
                className="text-sm font-bold text-indigo-600 bg-indigo-50/90 px-4 py-2 rounded-full shadow-sm border border-indigo-200 flex items-center gap-2"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                ✨ {displayStreak} Ngày Nhiệm Màu
              </motion.div>
              {highestStreak > 0 && (
                <span className="text-[10px] font-semibold text-indigo-500/80 pr-1">
                  Kỷ lục: {highestStreak} ngày
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs font-semibold text-slate-500 bg-white/40 px-3 py-1.5 rounded-full">
              Chưa Đăng Nhập
            </span>
          )}
        </div>

        {/* --- Đổi Chuỗi Lấy Chìa Khoá --- */}
        {currentUser && (
          <div className="mb-6 bg-white/50 rounded-2xl p-5 border border-indigo-100/60 shadow-inner">
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4" />
              Đổi Chuỗi Lấy Chìa Khoá
            </span>
            <p className="text-[10px] text-slate-500 mt-1 mb-3">
              Đủ mốc là đổi được khoá tương ứng — lưu ý: đổi khoá sẽ tiêu hết chuỗi hiện tại về 0.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {KEY_TIER_ORDER.map((tier) => {
                const meta = KEY_TIER_META[tier];
                const canRedeem = displayStreak >= meta.threshold;
                return (
                  <button
                    key={tier}
                    type="button"
                    disabled={!canRedeem || redeemingTier !== null}
                    onClick={() => handleRedeemKey(tier)}
                    className={`flex flex-col items-center gap-1 px-2 py-3 rounded-2xl border text-[10px] font-bold transition-all ${
                      canRedeem
                        ? `${meta.color} hover:scale-105 shadow-sm cursor-pointer`
                        : "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-70"
                    }`}
                  >
                    <span className="text-xl">{meta.emoji}</span>
                    <span>Khoá {meta.label}</span>
                    <span className="opacity-80">{meta.threshold} ngày</span>
                    <span className="mt-0.5 px-1.5 py-0.5 rounded-full bg-white/70 text-[9px]">
                      Đang có: {userKeys[tier] || 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {currentUser && lastWish && displayStreak > 0 && (
          <div className="mb-6 bg-white/50 rounded-2xl p-5 border border-indigo-100/60 relative flex gap-3 items-start shadow-inner">
            <Quote className="w-6 h-6 text-indigo-400 flex-shrink-0 opacity-50" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">
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
                    className="w-full h-32 bg-white/60 border border-indigo-200/50 rounded-2xl p-5 text-sm outline-none text-slate-800 placeholder-slate-500 focus:bg-white/90 focus:border-indigo-400 transition-colors shadow-inner resize-none leading-relaxed"
                  />
                  <button
                    type="submit"
                    className="self-end bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold py-3 px-8 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-indigo-200"
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
                  <Wand2 className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
                  <span className="text-sm font-bold text-indigo-700 animate-pulse">
                    Đang truyền năng lượng vào tinh tú... 🌌
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        ) : (
          <div className="text-center py-8 text-sm text-slate-600 font-semibold flex flex-col items-center justify-center gap-3 bg-white/30 rounded-2xl border border-white/50">
            <Info className="w-8 h-8 text-indigo-400" />
            <p>Vui lòng đăng nhập ở góc trái màn hình để bắt đầu hành trình Manifest!</p>
          </div>
        )}
      </div>
    </div>
  );
}
