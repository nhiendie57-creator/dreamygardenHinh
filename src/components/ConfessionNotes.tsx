import React, { useState, useEffect, useMemo } from "react";
import { collection, addDoc, query, orderBy, onSnapshot, limit, deleteDoc, doc } from "firebase/firestore";
import { db } from "../config/firebase";
import { ConfessionNote, UserProfile } from "../types";
import { motion, AnimatePresence } from "motion/react";
// Thay đổi các icon phù hợp với ý tưởng / góp ý
import { Send, Heart, X, Calendar, Lightbulb, Sparkles, MessageCircleCode } from "lucide-react";

interface ConfessionNotesProps {
  currentUser: UserProfile | null;
  isAdmin: boolean;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

// --- Gộp Confession + Idea Box vào chung 1 trang ---
// "sourceType" CHỈ tồn tại ở client (không lưu vào Firestore, không cần sửa types.ts)
// để biết 1 item lấy về là từ collection "confessions" hay "notes".
type PostType = "confession" | "notes";
type NoteWithSource = ConfessionNote & { sourceType: PostType };

const DEFAULT_CONFESSIONS: ConfessionNote[] = [];
const DEFAULT_NOTES: ConfessionNote[] = [];

export default function ConfessionNotes({
  currentUser,
  isAdmin,
  showToast,
}: ConfessionNotesProps) {
  const [confessionItems, setConfessionItems] = useState<NoteWithSource[]>([]);
  const [noteItems, setNoteItems] = useState<NoteWithSource[]>([]);

  // Bộ lọc hiển thị: Tất cả / chỉ Confession / chỉ Idea
  const [viewFilter, setViewFilter] = useState<"all" | PostType>("all");

  // Loại nội dung đang soạn trong form: Confession hay Idea
  const [postType, setPostType] = useState<PostType>("confession");

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

  // Sync 2 collection song song, mỗi item được gắn thêm sourceType cục bộ
  useEffect(() => {
    const qConfession = query(collection(db, "confessions"), orderBy("createdAt", "desc"), limit(40));
    const unsubConfession = onSnapshot(qConfession, (snapshot) => {
      const fetched: NoteWithSource[] = [];
      snapshot.forEach((d) => {
        fetched.push({ id: d.id, ...d.data(), sourceType: "confession" } as NoteWithSource);
      });
      setConfessionItems(
        fetched.length > 0
          ? fetched
          : DEFAULT_CONFESSIONS.map((n) => ({ ...n, sourceType: "confession" as const }))
      );
    }, (err) => {
      console.error(err);
      setConfessionItems(DEFAULT_CONFESSIONS.map((n) => ({ ...n, sourceType: "confession" as const })));
    });

    const qNotes = query(collection(db, "notes"), orderBy("createdAt", "desc"), limit(40));
    const unsubNotes = onSnapshot(qNotes, (snapshot) => {
      const fetched: NoteWithSource[] = [];
      snapshot.forEach((d) => {
        fetched.push({ id: d.id, ...d.data(), sourceType: "notes" } as NoteWithSource);
      });
      setNoteItems(
        fetched.length > 0
          ? fetched
          : DEFAULT_NOTES.map((n) => ({ ...n, sourceType: "notes" as const }))
      );
    }, (err) => {
      console.error(err);
      setNoteItems(DEFAULT_NOTES.map((n) => ({ ...n, sourceType: "notes" as const })));
    });

    return () => {
      unsubConfession();
      unsubNotes();
    };
  }, []);

  // Gộp 2 danh sách lại, sắp xếp theo thời gian, rồi lọc theo viewFilter
  const displayedItems = useMemo(() => {
    const merged = [...confessionItems, ...noteItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return viewFilter === "all" ? merged : merged.filter((i) => i.sourceType === viewFilter);
  }, [confessionItems, noteItems, viewFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      showToast(
        postType === "confession"
          ? "Vui lòng viết nội dung ghi chú nhé!"
          : "Vui lòng nhập ý tưởng của bạn nhé!",
        "error"
      );
      return;
    }

    if (postType === "notes" && !currentUser) {
      showToast("Vui lòng đăng nhập để gửi góp ý ý tưởng của bạn! ✨", "info");
      return;
    }

    setLoading(true);
    const collectionName = postType === "confession" ? "confessions" : "notes";

    try {
      const payload = {
        content: content.trim(),
        author: postType === "notes"
          ? (currentUser?.username || "Ẩn danh")
          : (author.trim() || "Ẩn danh"),
        color: selectedColor,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, collectionName), payload);
      showToast(
        postType === "confession"
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

  const handleDelete = async (item: NoteWithSource, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!isAdmin && item.sourceType === "confession") {
      showToast("Chỉ có quản trị viên mới có thể tháo gỡ thư tâm sự!", "error");
      return;
    }
    if (item.sourceType === "notes" && !isAdmin && !(currentUser && item.author === currentUser.username)) {
      showToast("Bạn không có quyền tháo gỡ góp ý này!", "error");
      return;
    }

    const collectionName = item.sourceType === "confession" ? "confessions" : "notes";

    if (window.confirm("Bạn có chắc muốn tháo dỡ nội dung này khỏi khu vườn?")) {
      try {
        await deleteDoc(doc(db, collectionName, item.id));
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
          <MessageCircleCode className="w-6 h-6 text-pink-400 animate-pulse" />
          Bức Tường Tâm Sự & Góc Ý Tưởng
        </h2>
        <p className="text-xs text-slate-700/80 font-medium mt-1">
          Nơi gieo mầm những lời thì thầm ngọt ngào, và cả những ý tưởng mới mẻ cho khu vườn.
        </p>
      </div>

      {/* Bộ lọc hiển thị: Tất cả / Confession / Idea */}
      <div className="flex justify-center gap-2">
        {[
          { key: "all" as const, label: "Tất cả", icon: Sparkles },
          { key: "confession" as const, label: "Tâm sự", icon: Heart },
          { key: "notes" as const, label: "Ý tưởng", icon: Lightbulb },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setViewFilter(key)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all flex items-center gap-1.5 ${
              viewFilter === key
                ? "bg-pink-400 text-white shadow-md shadow-pink-100"
                : "bg-white/20 hover:bg-white/40 text-slate-700"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

        {/* Creator Form */}
        <div className="lg:col-span-1 p-6 rounded-[32px] glass-panel border border-pink-200/50 shadow-xl text-slate-800">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Toggle: đang soạn Confession hay Idea */}
            <div className="flex gap-2 border-b border-pink-100 pb-3">
              <button
                type="button"
                onClick={() => setPostType("confession")}
                className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                  postType === "confession"
                    ? "bg-pink-400 text-white shadow-sm"
                    : "bg-white/40 text-slate-600 hover:bg-white/70"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Tâm Sự
              </button>
              <button
                type="button"
                onClick={() => setPostType("notes")}
                className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                  postType === "notes"
                    ? "bg-amber-400 text-white shadow-sm"
                    : "bg-white/40 text-slate-600 hover:bg-white/70"
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5" />
                Ý Tưởng
              </button>
            </div>

            {postType === "confession" && (
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
                {postType === "confession" ? "Lời thầm thì ngọt ngào" : "Ý tưởng hoặc góp ý của bạn..."}
              </label>
              <textarea
                required
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  postType === "confession"
                    ? "Hãy kể cho khu vườn nghe về niềm vui nhỏ bé hay chút tâm tình của bạn hôm nay nhé..."
                    : "Bạn muốn bổ sung tính năng gì, đổi mới giao diện hay có ý tưởng độc đáo nào cho khu vườn? Chia sẻ ở đây nhé..."
                }
                className="bg-white/50 border border-pink-200/50 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white resize-none"
              />
            </div>

            {/* Pastel Color Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-600">Chọn màu thẻ</label>
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
              className={`w-full mt-2 text-white font-bold py-2 rounded-xl text-xs shadow-md flex items-center justify-center gap-1.5 transition-all ${
                postType === "confession"
                  ? "bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 shadow-pink-100"
                  : "bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 shadow-amber-100"
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              {loading
                ? "Đang gửi..."
                : postType === "confession"
                  ? "Ghim thư tâm sự"
                  : "Gửi ý tưởng ngay"
              }
            </button>
          </form>
        </div>

        {/* Ideas + Confessions List Display */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto pr-2 custom-scroll">
            <AnimatePresence>
              {displayedItems.map((item, index) => {
                const rotAngle = (index % 3) - 1;
                const isConfession = item.sourceType === "confession";
                return (
                  <motion.div
                    key={`${item.sourceType}-${item.id}`}
                    initial={{ opacity: 0, scale: 0.9, rotate: rotAngle * 2 }}
                    animate={{ opacity: 1, scale: 1, rotate: rotAngle }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ scale: 1.03, rotate: 0, zIndex: 10 }}
                    style={{ backgroundColor: item.color }}
                    className="p-5 rounded-3xl shadow-md border border-white/60 text-slate-800 flex flex-col gap-3 relative transition-all duration-300 min-h-[140px]"
                  >
                    {(isAdmin || (item.sourceType === "notes" && currentUser && item.author === currentUser.username)) && (
                      <button
                        onClick={(e) => handleDelete(item, e)}
                        className="absolute top-4 right-4 p-1 rounded-full bg-white/40 hover:bg-rose-50 text-rose-600 hover:scale-110 transition-all shadow-sm"
                        title="Tháo gỡ"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Nhãn nhỏ phân biệt Tâm sự / Ý tưởng */}
                    <div
                      className={`absolute top-4 left-4 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        isConfession
                          ? "bg-pink-500/15 text-pink-700"
                          : "bg-amber-500/15 text-amber-700"
                      }`}
                    >
                      {isConfession ? <Heart className="w-2.5 h-2.5" /> : <Lightbulb className="w-2.5 h-2.5" />}
                      {isConfession ? "Tâm sự" : "Ý tưởng"}
                    </div>

                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-4 bg-white/60 backdrop-blur-md rounded-md shadow-sm border border-white/80" />

                    <p className="text-xs leading-relaxed font-semibold italic text-slate-800 whitespace-pre-line mt-5">
                      "{item.content}"
                    </p>

                    <div className="mt-auto pt-2.5 border-t border-slate-800/10 flex items-center justify-between text-[10px] font-bold text-slate-700/80">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3 text-rose-400 fill-rose-400 animate-pulse" />
                        <span className="text-slate-900">{item.author}</span>
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
