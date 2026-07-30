import React, { useState, useEffect } from "react";
import { MessageSquare, Pin, Sparkles, Send, Trash2, Globe, Music, Image as ImageIcon, UploadCloud } from "lucide-react";
import { collection, onSnapshot, doc, addDoc, deleteDoc, updateDoc, setDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { ConfessionNote, UserProfile, Song } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface ConfessionSectionProps {
  currentUser: (UserProfile & { isAdmin: boolean }) | null;
  activeTab: "confession" | "notes" | "social";
  onBgChange: (url: string | null) => void;
}

const PASTEL_COLORS = [
  "bg-[#FFD1DC]/60 border-[#FFAEB9]/30 text-pink-900 shadow-pink-100", // pink
  "bg-[#E6E6FA]/60 border-[#D8B4F8]/30 text-purple-900 shadow-purple-100", // lavender
  "bg-[#BCECAC]/50 border-[#A1E3A1]/30 text-emerald-950 shadow-emerald-50", // soft blue/green
  "bg-[#FFF0F5]/70 border-[#FFE4E1]/50 text-rose-900 shadow-rose-100", // lavender blush
  "bg-[#FAFAD2]/60 border-[#F0E68C]/30 text-yellow-950 shadow-yellow-100" // light gold
];

const SOCIALS = [
  { name: "Facebook", icon: "🌸", url: "https://facebook.com", description: "Kết nối tâm sự mộng mơ" },
  { name: "Instagram", icon: "📸", url: "https://instagram.com", description: "Hình ảnh lấp lánh lưu giữ" },
  { name: "Tiktok", icon: "🎵", url: "https://tiktok.com", description: "Giai điệu diệu kỳ vút bay" },
  { name: "GitHub", icon: "🐈", url: "https://github.com", description: "Nơi lập trình những vì sao" }
];

export default function ConfessionSection({ currentUser, activeTab, onBgChange }: ConfessionSectionProps) {
  const [notes, setNotes] = useState<ConfessionNote[]>([]);
  const [noteContent, setNoteContent] = useState("");
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [submittingNote, setSubmittingNote] = useState(false);

  // Admin settings upload state
  const [songTitle, setSongTitle] = useState("");
  const [songArtist, setSongArtist] = useState("");
  const [songUrl, setSongUrl] = useState("");
  const [songUploading, setSongUploading] = useState(false);
  const [songUploadError, setSongUploadError] = useState("");
  const [bgUploading, setBgUploading] = useState(false);
  const [bgUploadError, setBgUploadError] = useState("");

  // Fetch confessions/notes from Firestore in real-time
  useEffect(() => {
    const q = query(collection(db, "confessions"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: ConfessionNote[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as ConfessionNote);
      });
      setNotes(list);
    }, (err) => {
      console.warn("Error loading confessions:", err);
    });

    return () => unsubscribe();
  }, []);

  // Post confession
  const handlePostNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const cleanContent = noteContent.trim();
    if (!cleanContent) return;

    setSubmittingNote(true);
    try {
      await addDoc(collection(db, "confessions"), {
        author: currentUser.username,
        content: cleanContent,
        color: PASTEL_COLORS[selectedColorIndex],
        createdAt: serverTimestamp()
      });
      setNoteContent("");
    } catch (err) {
      console.error("Error creating confession:", err);
    } finally {
      setSubmittingNote(false);
    }
  };

  // Delete confession
  const handleDeleteNote = async (noteId: string) => {
    if (!currentUser?.isAdmin) return;
    if (!window.confirm("Admin ơi, bạn có chắc muốn gỡ note tâm sự này không? 🗑️")) return;
    try {
      await deleteDoc(doc(db, "confessions", noteId));
    } catch (err) {
      console.error("Error deleting confession:", err);
    }
  };

  // Admin BG Image upload to Cloudinary
  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBgUploading(true);
    setBgUploadError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "dreamy_garden_preset");

    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/i7upt5gk/auto/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Thất bại khi liên kết máy chủ Cloudinary.");
      const data = await res.json();
      if (data.secure_url) {
        // Save bg setting in settings
        await setDoc(doc(db, "settings", "app_settings"), {
          backgroundImage: data.secure_url,
          updatedAt: serverTimestamp()
        });
        onBgChange(data.secure_url);
      }
    } catch (err) {
      console.error("BG Upload error:", err);
      setBgUploadError("Có lỗi khi tải lên Cloudinary. Đang dùng hình nền mặc định.");
    } finally {
      setBgUploading(false);
    }
  };

  // Restore Default Background
  const handleResetBg = async () => {
    try {
      await setDoc(doc(db, "settings", "app_settings"), {
        backgroundImage: null,
        updatedAt: serverTimestamp()
      });
      onBgChange(null);
    } catch (err) {
      console.error("Reset background error:", err);
    }
  };

  // Admin Song upload to Cloudinary
  const handleSongUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSongUploading(true);
    setSongUploadError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "dreamy_garden_preset");

    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/i7upt5gk/auto/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Thất bại khi liên kết máy chủ.");
      const data = await res.json();
      if (data.secure_url) {
        setSongUrl(data.secure_url);
        if (!songTitle) {
          // prefill title from file name
          const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
          setSongTitle(nameWithoutExt);
        }
      }
    } catch (err) {
      console.error("Song upload error:", err);
      setSongUploadError("Không thể tải lên tệp âm thanh này.");
    } finally {
      setSongUploading(false);
    }
  };

  // Admin Save Song to Firestore
  const handleSaveSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!songTitle || !songUrl) return;

    try {
      await addDoc(collection(db, "songs"), {
        title: songTitle,
        artist: songArtist || "Khu vườn thần tiên",
        url: songUrl,
        createdAt: serverTimestamp()
      });
      // Clear states
      setSongTitle("");
      setSongArtist("");
      setSongUrl("");
      alert("Đã thêm bài nhạc lấp lánh vào trình phát! 🎵🌸");
    } catch (err) {
      console.error("Save song error:", err);
      alert("Ủa hệ thống nghẽn mây rồi, lưu bài hát sau nha!");
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 select-none" id="confessions-container">
      
      {/* ----------------- CONFESSION BOARD / STICKY NOTES ----------------- */}
      {(activeTab === "confession" || activeTab === "notes") && (
        <div className="flex flex-col gap-10">
          
          {/* Header */}
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-dancing font-bold text-pink-700 text-glow-pearl mb-2">
              Bảng Confession Tâm Sự
            </h2>
            <p className="text-xs md:text-sm text-pink-600/80 italic font-sans-dreamy max-w-md mx-auto">
              "Gửi gắm nỗi lòng thầm kín, gửi thư tình hay lời chúc bình yên ẩn danh lên những đóa mây..."
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Note Creation Left Column (Only if logged in) */}
            <div className="lg:col-span-4 glass-panel p-5 rounded-3xl border border-white/60 shadow-xl flex flex-col gap-4">
              <h3 className="font-bold text-pink-800 text-sm flex items-center gap-1.5 font-sans-dreamy border-b border-pink-100 pb-2">
                <MessageSquare className="w-4 h-4 text-pink-500" />
                DÁN STICKY NOTE MỚI
              </h3>

              {currentUser ? (
                <form onSubmit={handlePostNote} className="flex flex-col gap-4">
                  {/* Select Sticky Color */}
                  <div className="flex flex-col gap-1 text-xs text-pink-700">
                    <span className="font-bold mb-1">Màu giấy lấp lánh:</span>
                    <div className="flex gap-2">
                      {PASTEL_COLORS.map((color, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setSelectedColorIndex(index)}
                          className={`w-7 h-7 rounded-full border cursor-pointer active:scale-95 transition ${
                            color.split(" ")[0]
                          } ${
                            selectedColorIndex === index
                              ? "ring-2 ring-pink-500 scale-105 shadow-md border-transparent"
                              : "border-pink-200"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Note Content */}
                  <div className="flex flex-col gap-1 text-xs">
                    <textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Viết điều thầm kín lãng mạn tại đây..."
                      className="w-full h-28 bg-white/40 border border-pink-200/50 rounded-xl p-3 text-sm text-pink-950 focus:outline-none focus:ring-2 focus:ring-pink-300 placeholder:text-pink-400/50 resize-none custom-scroll leading-relaxed"
                      maxLength={200}
                      required
                    />
                    <div className="text-right text-[10px] text-pink-400 font-medium">
                      {noteContent.length}/200
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingNote}
                    className="w-full bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 text-white font-bold rounded-xl py-2 transition active:scale-95 flex items-center justify-center gap-1.5 shadow-md cursor-pointer text-xs"
                  >
                    {submittingNote ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Ghim lên Bảng Mây
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="text-center py-8 px-4 bg-pink-50/40 border border-pink-100 rounded-2xl flex flex-col items-center gap-1.5 text-xs text-pink-600">
                  <span className="text-lg animate-bounce">🔑</span>
                  <p className="font-bold">Bạn chưa đăng nhập!</p>
                  <p className="text-[10px] italic">Hãy đăng nhập ở góc trên bên trái để có thể ghim lời nhắn nhé.</p>
                </div>
              )}
            </div>

            {/* Note Board Display Right Column */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              {notes.length === 0 ? (
                <div className="text-center py-16 bg-white/30 border border-white/50 rounded-3xl flex flex-col items-center gap-2 text-pink-600 italic">
                  <span className="text-3xl">🕊️</span>
                  <p className="font-dancing text-xl font-bold">Chưa có note tâm sự nào...</p>
                  <p className="text-xs">Hãy khai bút gửi điều lãng mạn đầu tiên nhé!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto custom-scroll pr-2">
                  <AnimatePresence mode="popLayout">
                    {notes.map((note) => (
                      <motion.div
                        layout
                        key={note.id}
                        initial={{ scale: 0.85, opacity: 0, rotate: -3 }}
                        animate={{ scale: 1, opacity: 1, rotate: (Math.random() * 4) - 2 }}
                        exit={{ scale: 0.85, opacity: 0 }}
                        className={`relative rounded-2xl p-5 border shadow-sm flex flex-col justify-between overflow-hidden transition-all duration-300 hover:shadow-lg ${note.color}`}
                      >
                        {/* Pin ornament top center */}
                        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 text-red-400 opacity-60">
                          <Pin className="w-4 h-4 fill-current rotate-45" />
                        </div>

                        {/* Content text */}
                        <p className="text-xs font-semibold leading-relaxed mb-6 pt-2 select-text whitespace-pre-line break-words italic">
                          "{note.content}"
                        </p>

                        {/* Note footer */}
                        <div className="flex items-center justify-between border-t border-black/5 pt-2.5 mt-auto">
                          <span className="text-[10px] font-bold tracking-wider capitalize">
                            ✍️ {note.author}
                          </span>
                          
                          {/* Admin remove button */}
                          {currentUser?.isAdmin && (
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="p-1 rounded-full hover:bg-black/5 active:scale-95 transition text-red-600 cursor-pointer"
                              title="Gỡ note"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

          </div>

          {/* ----------------- ADMIN COMPREHENSIVE SETTINGS DRAWER ----------------- */}
          {currentUser?.isAdmin && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel p-6 rounded-3xl border border-white/60 shadow-xl mt-6 flex flex-col gap-6"
            >
              <div className="flex items-center gap-1.5 border-b border-pink-100 pb-2">
                <Sparkles className="w-5 h-5 text-purple-600 animate-spin" style={{ animationDuration: "5s" }} />
                <h3 className="text-lg font-bold text-pink-800 font-sans-dreamy">
                  PHÒNG BÍ MẬT QUẢN TRỊ VIÊN (ADMIN PANEL)
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                
                {/* Background Customize Admin Module */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-1.5">
                    <ImageIcon className="w-4.5 h-4.5 text-pink-500" />
                    <h4 className="font-bold text-sm text-pink-700">Tùy Biến Giao Diện / Ảnh Nền</h4>
                  </div>
                  <p className="text-[11px] text-pink-600/90 leading-relaxed italic">
                    "Tải lên hình ảnh kỳ diệu để thiết lập làm hình nền tùy chỉnh cho toàn bộ trang web."
                  </p>

                  <div className="flex flex-col gap-3 bg-white/40 border border-pink-100 p-4 rounded-2xl">
                    <label className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-pink-400 to-purple-400 text-white rounded-xl text-xs font-bold cursor-pointer hover:opacity-90 active:scale-95 transition shadow-sm">
                      <UploadCloud className="w-4.5 h-4.5" />
                      Tải lên Ảnh Nền (Cloudinary)
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBgUpload}
                        className="hidden"
                        disabled={bgUploading}
                      />
                    </label>

                    <button
                      onClick={handleResetBg}
                      className="w-full py-1.5 border border-pink-300 text-pink-600 hover:bg-pink-100/40 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
                    >
                      Khôi phục Hình nền Gradient gốc
                    </button>

                    {bgUploading && (
                      <div className="flex items-center gap-2 text-purple-600 text-[11px] font-bold">
                        <span className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin shrink-0" />
                        <span>Đang dệt mây trời... ☁️🕊️</span>
                      </div>
                    )}
                    {bgUploadError && <p className="text-[10px] text-red-500 font-bold">{bgUploadError}</p>}
                  </div>
                </div>

                {/* Music Upload Admin Module */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-1.5">
                    <Music className="w-4.5 h-4.5 text-pink-500" />
                    <h4 className="font-bold text-sm text-pink-700">Tải Lên Nhạc Nền MP3</h4>
                  </div>
                  <p className="text-[11px] text-pink-600/90 leading-relaxed italic">
                    "Thêm giai điệu ngọt ngào yêu thích của bạn trực tiếp lên danh sách nhạc của khu vườn."
                  </p>

                  <form onSubmit={handleSaveSong} className="flex flex-col gap-3 bg-white/40 border border-pink-100 p-4 rounded-2xl text-xs">
                    {/* Song file input */}
                    <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-pink-400 to-purple-400 text-white rounded-xl text-xs font-bold cursor-pointer hover:opacity-90 active:scale-95 transition shadow-sm">
                      <UploadCloud className="w-4.5 h-4.5" />
                      Tải lên tệp nhạc MP3 (Cloudinary)
                      <input
                        type="file"
                        accept="audio/mp3,audio/*"
                        onChange={handleSongUpload}
                        className="hidden"
                        disabled={songUploading}
                      />
                    </label>

                    {songUploading && (
                      <div className="flex items-center gap-2 text-purple-600 text-[11px] font-bold justify-center">
                        <span className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin shrink-0" />
                        <span>Đang cưỡi gió bay lên... ☁️🎵</span>
                      </div>
                    )}
                    {songUploadError && <p className="text-[10px] text-red-500 font-bold text-center">{songUploadError}</p>}

                    {/* Preview or direct fields */}
                    {songUrl && (
                      <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-pink-100/50 animate-fadeIn">
                        <p className="text-[10px] text-emerald-600 font-bold">✓ Tệp nhạc tải lên thành công!</p>
                        
                        <div className="flex flex-col gap-1">
                          <label className="font-bold text-pink-700">Tên bài hát</label>
                          <input
                            type="text"
                            value={songTitle}
                            onChange={(e) => setSongTitle(e.target.value)}
                            placeholder="Tên bài nhạc..."
                            className="w-full bg-white/60 border border-pink-200 rounded-lg px-2.5 py-1 focus:outline-none"
                            required
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="font-bold text-pink-700">Nghệ sĩ / Thể loại</label>
                          <input
                            type="text"
                            value={songArtist}
                            onChange={(e) => setSongArtist(e.target.value)}
                            placeholder="Tên nghệ sĩ..."
                            className="w-full bg-white/60 border border-pink-200 rounded-lg px-2.5 py-1 focus:outline-none"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white font-bold rounded-xl transition shadow-sm cursor-pointer"
                        >
                          Lưu bài hát vào Firestore ✦
                        </button>
                      </div>
                    )}
                  </form>
                </div>

              </div>
            </motion.div>
          )}

        </div>
      )}

      {/* ----------------- SOCIAL MEDIA CONNECTIONS ----------------- */}
      {activeTab === "social" && (
        <div className="flex flex-col gap-10">
          
          {/* Header */}
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-dancing font-bold text-pink-700 text-glow-pearl mb-2">
              Lối Liên Kết Thần Kỳ
            </h2>
            <p className="text-xs md:text-sm text-pink-600/80 italic font-sans-dreamy max-w-md mx-auto">
              "Tìm thấy bóng dáng tụi mình ở bất kỳ hành tinh, vùng trời nào khác nhé..."
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SOCIALS.map((soc) => (
              <a
                key={soc.name}
                href={soc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group glass-panel rounded-3xl p-6 border border-white/60 text-center flex flex-col items-center justify-center hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg hover:shadow-2xl"
              >
                {/* Custom glowing sphere with social icon */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-100 to-purple-100 flex items-center justify-center border border-white/60 text-2xl mb-4 group-hover:rotate-12 transition-transform duration-500 shadow-inner group-hover:shadow-[0_0_15px_rgba(240,190,210,0.5)]">
                  {soc.icon}
                </div>
                
                <h3 className="text-lg font-bold text-pink-800 font-sans-dreamy group-hover:text-pink-600 transition-colors">
                  {soc.name}
                </h3>
                
                <p className="text-xs text-pink-950/60 italic mt-1 font-medium">
                  {soc.description}
                </p>

                {/* Arrow indicator */}
                <span className="text-[10px] uppercase font-bold text-purple-600 mt-4 group-hover:translate-x-1 transition-transform">
                  Ghé chơi ➔
                </span>
              </a>
            ))}
          </div>

        </div>
      )}

    </div>
  );
}
