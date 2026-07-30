import React, { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { motion } from "motion/react";
import { Upload, Image as ImageIcon, Sparkles, Loader2, ArrowRight } from "lucide-react";

interface HeroProps {
  isAdmin: boolean;
  onChangeTab: (tab: "characters" | "confession" | "notes" | "socials") => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  onUpdateBg: (url: string | null) => void;
  customBgUrl: string | null;
}

export default function Hero({
  isAdmin,
  onChangeTab,
  showToast,
  onUpdateBg,
  customBgUrl,
}: HeroProps) {
  const [uploading, setUploading] = useState(false);

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    showToast("Đang tải ảnh nền lên Cloudinary... ☁", "info");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "dreamy_garden_preset");

      const response = await fetch("https://api.cloudinary.com/v1_1/i7upt5gk/auto/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload background image");
      }

      const data = await response.json();
      const secureUrl = data.secure_url;

      // Update Firestore settings doc
      await setDoc(doc(db, "settings", "app"), {
        backgroundImage: secureUrl,
      }, { merge: true });

      onUpdateBg(secureUrl);
      showToast("Đã thay đổi ảnh nền Khu Vườn thành công! 🌸✨", "success");
    } catch (err) {
      console.error(err);
      showToast("Không thể tải ảnh nền lên. Hãy kiểm tra cài đặt!", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleResetBg = async () => {
    try {
      await setDoc(doc(db, "settings", "app"), {
        backgroundImage: null,
      }, { merge: true });

      onUpdateBg(null);
      showToast("Đã khôi phục ảnh nền Gradient mặc định.", "info");
    } catch (err) {
      console.error(err);
      showToast("Không thể khôi phục ảnh nền!", "error");
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center text-center z-10 px-4 mt-20 md:mt-24">
      {/* Dynamic Keyframe Styles for Shimmering Text, Ombre, and Glowing Shadows */}
      <style>{`
        @keyframes dreamyShimmer {
          0%, 100% {
            text-shadow:
              0 2px 6px rgba(40, 20, 80, 0.55),
              0 0 10px rgba(255,255,255,0.9),
              0 0 20px rgba(255,255,255,0.6),
              0 0 35px rgba(200,220,255,0.5);
          }
          50% {
            text-shadow:
              0 2px 8px rgba(40, 20, 80, 0.65),
              0 0 18px rgba(255,255,255,1),
              0 0 32px rgba(255,255,255,0.85),
              0 0 55px rgba(200,220,255,0.75);
          }
        }

        .dreamy-shimmer {
          animation: dreamyShimmer 2.6s ease-in-out infinite;
        }

        @keyframes gardenOmbre {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes gardenGlow {
          0%, 100% {
            filter: drop-shadow(0 2px 6px rgba(30, 15, 70, 0.55))
                    drop-shadow(0 0 8px rgba(106, 47, 217, 0.65))
                    drop-shadow(0 0 18px rgba(120, 60, 190, 0.5))
                    drop-shadow(0 0 30px rgba(60, 90, 190, 0.4));
          }
          50% {
            filter: drop-shadow(0 2px 8px rgba(30, 15, 70, 0.65))
                    drop-shadow(0 0 14px rgba(106, 47, 217, 0.85))
                    drop-shadow(0 0 28px rgba(120, 60, 190, 0.7))
                    drop-shadow(0 0 46px rgba(60, 90, 190, 0.55));
          }
        }

        .garden-ombre {
          background: linear-gradient(
            90deg,
            #6a2fd9 0%,
            #9b4de0 33%,
            #4d7de0 66%,
            #6a2fd9 100%
          );
          background-size: 300% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          animation: gardenOmbre 6s ease-in-out infinite, gardenGlow 2.6s ease-in-out infinite;
        }

        .quote-halo {
          text-shadow:
            0 1px 3px rgba(255,255,255,0.9),
            0 0 14px rgba(255,255,255,0.75),
            0 0 28px rgba(255,255,255,0.5);
        }
      `}</style>

      {/* Small Eyebrow Label */}
      <motion.span
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 0.8, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="text-[11px] md:text-xs uppercase tracking-[4px] md:tracking-[6px] text-white italic font-semibold mb-2 [text-shadow:0_1px_6px_rgba(0,0,0,0.55)]"
      >
        Crafted by Ngu Hinh
      </motion.span>

      {/* Main Title combining Serif and Script fonts */}
      <motion.h1
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.8, duration: 1.2, ease: "easeOut" }}
        className="flex flex-row flex-wrap items-center justify-center gap-x-1 md:gap-x-2 gap-y-1 select-none max-w-full overflow-visible py-4"
      >
        <motion.span
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          className="dreamy-shimmer font-display text-white"
          style={{ fontSize: "clamp(2.75rem, 9vw, 7rem)", lineHeight: 1.1 }}
        >
          Dreamy
        </motion.span>

        <span
          className="garden-ombre font-display inline-block"
          style={{ fontSize: "clamp(2.75rem, 9vw, 7rem)", lineHeight: 1.1 }}
        >
          Garden
        </span>
      </motion.h1>

      {/* Encouraging Quote */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.85 }}
        transition={{ delay: 1.2, duration: 1 }}
        className="max-w-md md:max-w-xl text-xs md:text-sm text-slate-800 font-bold italic tracking-wide mt-6 leading-relaxed quote-halo"
      >
        "Nơi thời gian dừng lại bên lề của những đám mây ngũ sắc, để bạn lắng nghe khúc nhạc ngọt ngào của những tâm hồn đầy mơ mộng..."
      </motion.p>

      {/* Primary action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="flex flex-wrap gap-4 justify-center mt-8"
      >
        <button
          onClick={() => onChangeTab("characters")}
          className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-full text-xs font-bold tracking-wider shadow-lg shadow-violet-300/50 hover:scale-105 transition-all flex items-center gap-1.5"
        >
          Khám phá nhân vật
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onChangeTab("confession")}
          className="px-6 py-2.5 bg-white/40 hover:bg-white/70 text-slate-800 rounded-full text-xs font-bold tracking-wider border border-white/60 hover:scale-105 transition-all flex items-center gap-1.5"
        >
          Để lại lời nhắn
          <Sparkles className="w-3.5 h-3.5 text-violet-600" />
        </button>
      </motion.div>

      {/* Admin Background Customization Interface */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8 }}
          className="mt-12 p-5 rounded-[28px] glass-panel border border-pink-200/40 shadow-md max-w-sm w-full mx-auto text-slate-800 flex flex-col gap-3"
        >
          <div className="flex items-center gap-1.5 text-xs font-bold text-pink-600 justify-center">
            <ImageIcon className="w-4 h-4" />
            <span>Tùy Biến Ảnh Nền Khu Vườn</span>
          </div>
          
          <div className="flex gap-2 justify-center">
            <label className="px-4 py-2 bg-pink-100 hover:bg-pink-200 text-pink-700 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors">
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              {uploading ? "Đang tải..." : "Tải ảnh mới lên"}
              <input
                type="file"
                accept="image/*"
                onChange={handleBgUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
            {customBgUrl && (
              <button
                onClick={handleResetBg}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all"
              >
                Đặt lại mặc định
              </button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
