import React, { useState, useEffect } from "react";
import { collection, addDoc, query, orderBy, onSnapshot, limit, deleteDoc, doc } from "firebase/firestore";
import { db } from "../config/firebase";
import { ConfessionNote, UserProfile } from "../types";
import { motion, AnimatePresence } from "motion/react";
// Thay đổi các icon phù hợp với ý tưởng / góp ý
import { Send, Heart, X, Calendar, Lightbulb, Sparkles, MessageCircleCode } from "lucide-react";

interface ConfessionNotesProps {
  type: "confession" | "notes";
  currentUser: UserProfile | null;
  isAdmin: boolean;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

const DEFAULT_CONFESSIONS: ConfessionNote[] = [];
const DEFAULT_NOTES: ConfessionNote[] = [];

export default function ConfessionNotes({
  type,
  currentUser,
  isAdmin,
  showToast,
}: ConfessionNotesProps) {
  const [items, setItems] = useState<ConfessionNote[]>([]);
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("");
  const [selectedColor, setSelectedColor] = useState("#FFD1DC"); // pastel pink
  const [loading, setLoading] = useState(false);

  const colors = [
    { value: "#FFD1DC", label: "Hồng Phấn" },
    { value: "#E6E6FA", label: "Tím Mộng" },
    { value: "#BCECAC", label: "Baby Blue" },
    { value: "#FAFAD2", label: "Vàng Kim" },
    { value: "#FFE4E1", label: "Misty Rose" },
  ];

  // Sync entries from Firestore
  useEffect(() => {
    const collectionName = type === "confession" ? "confessions" : "notes";
    const q = query(collection(db, collectionName), orderBy("createdAt", "desc"), limit(40));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: ConfessionNote[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() } as ConfessionNote);
      });

      const defaults = type === "confession" ? DEFAULT_CONFESSIONS : DEFAULT_NOTES;
      if (fetched.length === 0) {
        setItems(defaults);
      } else {
        setItems([...fetched, ...defaults.filter(def => !fetched.some(f => f.content === def.content))]);
      }
    }, (err) => {
      console.error(err);
      setItems(type === "confession" ? DEFAULT_CONFESSIONS : DEFAULT_NOTES);
    });

    return () => unsubscribe();
  }, [type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      showToast(
        type === "confession" 
          ? "Vui lòng viết nội dung ghi chú nhé!" 
          : "Vui lòng nhập ý tưởng của bạn nhé!", 
        "error"
      );
      return;
    }

    if (type === "notes" && !currentUser) {
      showToast("Vui lòng đăng nhập để gửi góp ý ý tưởng của bạn! ✨", "info");
      return;
    }

    setLoading(true);
    const collectionName = type === "confession" ? "confessions" : "notes";

    try {
      const payload = {
        content: content.trim(),
        author: type === "notes" 
          ? (currentUser?.username || "Ẩn danh")
          : (author.trim() || "Ẩn danh"),
        color: selectedColor,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, collectionName), payload);
      showToast(
        type === "confession"
          ? "Thư tâm sự đã được ghim lên bảng mây! 💌"
          : "Ý tưởng sáng tạo của bạn đã được ghi nhận! 💡✨",
        "success"
      );

      setContent("");
      setAuthor("");
    } catch (err) {
      console.error(err);
      showToast("Gặp sự cố khi gửi dữ liệu!", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!isAdmin && type === "confession") {
      showToast("Chỉ có quản trị viên mới có thể tháo gỡ thư tâm sự!", "error");
      return;
    }

    const collectionName = type === "confession" ? "confessions" : "notes";

    if (window.confirm("Bạn có chắc muốn tháo dỡ nội dung này khỏi khu vườn?")) {
      try {
        await deleteDoc(doc(db, collectionName, id));
        showToast("Đã tháo gỡ thành công.", "info");
      } catch (err) {
        console.error(err);
        showToast("Thao tác tháo gỡ thất bại!", "error");
      }
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 z-10 flex flex-col gap-6 relative">
      <div className="text-center">
        <h2 className="text-3xl font-display text-white text-glow-pearl flex items-center justify-center gap-2">
          {type === "confession" ? (
            <>
              <MessageCircleCode className="w-6 h-6 text-pink-400 animate-pulse" />
              Bức Tường Tâm Sự (Confession)
            </>
          ) : (
            <>
              <Lightbulb className="w-6 h-6 text-amber-300 animate-bounce" />
              Góc Sáng Tạo & Góp Ý Idea (Idea Box)
            </>
          )}
        </h2>
        <p className="text-xs text-slate-700/80 font-medium mt-1">
          {type === "confession"
            ? "Nơi gieo mầm những lời thì thầm ngọt ngào, những tâm tư chưa thể gọi tên..."
            : "Cùng gieo mầm những ý tưởng mới mẻ và đóng góp ý kiến để khu vườn ngày càng hoàn thiện."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Creator Form */}
        <div className="lg:col-span-1 p-6 rounded-[32px] glass-panel border border-pink-200/50 shadow-xl text-slate-800">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <h3 className="text-sm font-bold text-pink-600 tracking-wider uppercase flex items-center gap-1.5 border-b border-pink-100 pb-2">
              {type === "confession" ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  Gửi Tâm Sự Thầm Kín
                </>
              ) : (
                <>
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Góp Ý Ý Tưởng Mới
                </>
              )}
            </h3>

            {type === "confession" && (
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-600">Biệt danh (Tùy chọn)</label>
                <input
                  type="text"
                  placeholder="Ẩn danh, Người giấu tên..."
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="bg-white/50 border border-pink-200/50 rounded-xl px-3 py-1.5 text-xs outline-none focus:bg-white"
                />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-600">
                {type === "confession" ? "Lời thầm thì ngọt ngào" : "Ý tưởng hoặc góp ý của bạn..."}
              </label>
              <textarea
                required
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  type === "confession"
                    ? "Hãy kể cho khu vườn nghe về niềm vui nhỏ bé hay chút tâm tình của bạn hôm nay nhé..."
                    : "Bạn muốn bổ sung tính năng gì, đổi mới giao diện hay có ý tưởng độc đáo nào cho khu vườn? Chia sẻ ở đây nhé..."
                }
                className="bg-white/50 border border-pink-200/50 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white resize-none"
              />
            </div>

            {/* Pastel Color Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-600">Chọn màu thẻ ý tưởng</label>
              <div className="flex gap-2">
                {colors.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setSelectedColor(c.value)}
                    style={{ backgroundColor: c.value }}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      selectedColor === c.value ? "border-slate-800 scale-125" : "border-white/80"
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-2 rounded-xl text-xs shadow-md shadow-pink-100 flex items-center justify-center gap-1.5 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              {loading 
                ? "Đang gửi..." 
                : type === "confession" 
                  ? "Ghim thư tâm sự" 
                  : "Gửi ý tưởng ngay"
              }
            </button>
          </form>
        </div>

        {/* Ideas List Display */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto pr-2 custom-scroll">
            <AnimatePresence>
              {items.map((item, index) => {
                const rotAngle = (index % 3) - 1;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9, rotate: rotAngle * 2 }}
                    animate={{ opacity: 1, scale: 1, rotate: rotAngle }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ scale: 1.03, rotate: 0, zIndex: 10 }}
                    style={{ backgroundColor: item.color }}
                    className="p-5 rounded-3xl shadow-md border border-white/60 text-slate-800 flex flex-col gap-3 relative transition-all duration-300 min-h-[140px]"
                  >
                    {(isAdmin || (type === "notes" && currentUser && item.author === currentUser.username)) && (
                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        className="absolute top-4 right-4 p-1 rounded-full bg-white/40 hover:bg-rose-50 text-rose-600 hover:scale-110 transition-all shadow-sm"
                        title="Tháo gỡ ý tưởng"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-4 bg-white/60 backdrop-blur-md rounded-md shadow-sm border border-white/80" />

                    <p className="text-xs leading-relaxed font-semibold italic text-slate-800 whitespace-pre-line mt-1">
                      "{item.content}"
                    </p>

                    <div className="mt-auto pt-2.5 border-t border-slate-800/10 flex items-center justify-between text-[10px] font-bold text-slate-700/80">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3 text-rose-400 fill-rose-400 animate-pulse" />
                        Idea by: <span className="text-slate-900">{item.author}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}
