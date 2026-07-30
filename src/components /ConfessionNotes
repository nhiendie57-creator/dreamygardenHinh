import React, { useState, useEffect } from "react";
import { collection, addDoc, query, orderBy, onSnapshot, limit, deleteDoc, doc } from "firebase/firestore";
import { db } from "../config/firebase";
import { ConfessionNote, UserProfile } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { Send, Heart, Trash2, Calendar, Smile, ShieldAlert, Sparkles, MessageCircleCode } from "lucide-react";

interface ConfessionNotesProps {
  type: "confession" | "notes";
  currentUser: UserProfile | null;
  isAdmin: boolean;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

const DEFAULT_CONFESSIONS: ConfessionNote[] = [
  {
    id: "def-conf-1",
    author: "Ẩn danh",
    content: "Mong rằng ai ghé thăm khu vườn thơ mộng của Hinh hôm nay đều sẽ có một ngày thật ngọt ngào như kẹo dâu và ngập tràn niềm vui! 🍓✨",
    color: "#FFD1DC", // Pink
    createdAt: new Date().toISOString(),
  },
  {
    id: "def-conf-2",
    author: "Người mộng mơ",
    content: "Ước gì mình có thể giữ mãi nụ cười tỏa nắng của người ấy trong ngăn tủ ký ức. Gửi chút tình cảm này vào gió mây... ☁🌸",
    color: "#E6E6FA", // Purple
    createdAt: new Date().toISOString(),
  }
];

const DEFAULT_NOTES: ConfessionNote[] = [
  {
    id: "def-note-1",
    author: "Ngu Hinh",
    content: "🌸 Lời nhắn gửi: 'Hãy tin tưởng vào hành trình của chính mình. Mỗi hạt mầm tốt đẹp bạn gieo xuống ngày hôm nay, nhất định sẽ nở hoa rực rỡ vào ngày mai.'",
    color: "#BCECAC", // Blue/Green
    createdAt: new Date().toISOString(),
  }
];

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
      showToast("Vui lòng viết nội dung ghi chú nhé!", "error");
      return;
    }

    if (type === "notes" && !currentUser) {
      showToast("Vui lòng đăng nhập để lưu trữ sổ tay cá nhân của bạn! ✨", "info");
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
          : "Ghi chú nhật ký đã được cất giữ cẩn thận! 📔",
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

    if (confirm("Bạn có chắc muốn tháo dỡ ghi chú này khỏi bức tường thơ mộng?")) {
      try {
        await deleteDoc(doc(db, collectionName, id));
        showToast("Đã tháo gỡ ghi chú thành công.", "info");
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
              <Sparkles className="w-6 h-6 text-purple-400 animate-spin-slow" />
              Sổ Tay Lưu Giữ Giấc Mơ (Dream Notes)
            </>
          )}
        </h2>
        <p className="text-xs text-slate-700/80 font-medium mt-1">
          {type === "confession"
            ? "Nơi gieo mầm những lời thì thầm ngọt ngào, những tâm tư chưa thể gọi tên..."
            : "Cuốn nhật ký lãng mạn ghi chép những suy tư lơ lửng giữa tinh vân kẹo ngọt."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Creator Note form */}
        <div className="lg:col-span-1 p-6 rounded-[32px] glass-panel border border-pink-200/50 shadow-xl text-slate-800">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <h3 className="text-sm font-bold text-pink-600 tracking-wider uppercase flex items-center gap-1.5 border-b border-pink-100 pb-2">
              <Smile className="w-4 h-4" />
              {type === "confession" ? "Gửi Tâm Sự Thầm Kín" : "Viết Nhật Ký Mộng Mơ"}
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
                {type === "confession" ? "Lời thầm thì ngọt ngào" : "Những giấc mơ hôm nay..."}
              </label>
              <textarea
                required
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  type === "confession"
                    ? "Hãy kể cho khu vườn nghe về niềm vui nhỏ bé hay chút tâm tình của bạn hôm nay nhé..."
                    : "Lưu lại những trăn trở, cảm xúc, lời nhắn gửi hay lịch trình thơ mộng của bạn..."
                }
                className="bg-white/50 border border-pink-200/50 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white resize-none"
              />
            </div>

            {/* Pastel Color Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-600">Chọn giấy viết thư</label>
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
              {loading ? "Đang ghim thư..." : type === "confession" ? "Ghim thư tâm sự" : "Lưu vào sổ nhật ký"}
            </button>
          </form>
        </div>

        {/* Notes list Display */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto pr-2 custom-scroll">
            <AnimatePresence>
              {items.map((item, index) => {
                // Generate a slight random angle based on index to simulate sticky note wall
                const rotAngle = (index % 3) - 1; // -1, 0, or 1 deg
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
                    {/* Delete button (Visible for admins, or note author if matching logged-in user) */}
                    {(isAdmin || (type === "notes" && currentUser && item.author === currentUser.username)) && (
                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        className="absolute top-4 right-4 p-1 rounded-full bg-white/40 hover:bg-rose-50 text-rose-600 hover:scale-110 transition-all shadow-sm"
                        title="Tháo gỡ ghi chú"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Cute clip sticker decoration */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-4 bg-white/60 backdrop-blur-md rounded-md shadow-sm border border-white/80" />

                    {/* Content */}
                    <p className="text-xs leading-relaxed font-semibold italic text-slate-800 whitespace-pre-line mt-1">
                      "{item.content}"
                    </p>

                    {/* Author & Date metadata */}
                    <div className="mt-auto pt-2.5 border-t border-slate-800/10 flex items-center justify-between text-[10px] font-bold text-slate-700/80">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3 text-rose-400 fill-rose-400 animate-pulse" />
                        By: <span className="text-slate-900">{item.author}</span>
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
