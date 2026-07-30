import React, { useState, useEffect } from "react";
import { collection, doc, onSnapshot, updateDoc, setDoc, deleteDoc, addDoc, query, orderBy } from "firebase/firestore";
import { db } from "../config/firebase";
import { Character } from "../types";
// Đã sửa lại tên thư viện chuẩn để Vercel không báo lỗi
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Plus, Trash2, Edit2, X, Eye, Sparkles, Upload, Loader2, Save } from "lucide-react";

interface CharacterSectionProps {
  isAdmin: boolean;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

const DEFAULT_CHARACTERS: Character[] = [
  {
    id: "default-aria",
    name: "Aria Moonlight",
    role: "The guardian of soft dreams and midnight whispers.",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80",
    plot: "Nàng thơ gác đêm Aria Moonlight mang dòng máu của bộ tộc Mặt Trăng cổ xưa. Nàng dệt nên những dải mây lấp lánh để che chở cho những tâm hồn mỏi mệt tìm kiếm bến đỗ trong giấc ngủ say. Mỗi một lời thầm thì giữa màn đêm sẽ được nàng biến thành những vì sao lấp lánh soi sáng khu vườn.",
    tags: ["Dream", "Midnight", "Whisper", "Luna"],
    likes: 1204,
  },
  {
    id: "default-lyra",
    name: "Lyra Stardust",
    role: "Woven from the silk of distant galaxies.",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    plot: "Đến từ dải ngân hà xa xôi, Lyra Stardust mang trong mình luồng năng lượng thăng hoa của bụi vũ trụ lấp lánh. Chiếc váy của nàng dệt từ những sợi tơ ánh sáng, mỗi bước đi của nàng đều gieo xuống khu vườn những hạt mầm phép thuật rực rỡ, mang lại sự sống vĩnh cửu cho vạn vật.",
    tags: ["Star", "Galaxy", "Cosmic", "Astral"],
    likes: 4812,
  },
  {
    id: "default-elowen",
    name: "Elowen Grove",
    role: "Protector of the ancient pastel flora.",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80",
    plot: "Elowen Grove là linh hồn của những đóa hoa Tulip hồng phấn nở muộn. Nàng có khả năng trò chuyện với cỏ cây, cảm nhận từng hơi thở dịu nhẹ của đất trời. Nàng bảo vệ sự yên bình của Dreamy Garden trước những bão giông và nuôi dưỡng những mầm hoa căng tràn nhựa sống.",
    tags: ["Nature", "Pastel", "Flora", "Forest"],
    likes: 952,
  }
];

export default function CharacterSection({ isAdmin, showToast }: CharacterSectionProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  
  // Create / Edit Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formPlot, setFormPlot] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formAvatar, setFormAvatar] = useState("");
  const [uploading, setUploading] = useState(false);

  // Firestore Realtime Synchronization
  useEffect(() => {
    const q = query(collection(db, "characters"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Character[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Character);
      });

      if (list.length === 0) {
        setCharacters(DEFAULT_CHARACTERS);
      } else {
        setCharacters([...list, ...DEFAULT_CHARACTERS.filter(def => !list.some(l => l.name === def.name))]);
      }
    }, (err) => {
      console.error(err);
      setCharacters(DEFAULT_CHARACTERS);
    });

    return () => unsubscribe();
  }, []);

  // Collect all unique tags
  const allTags = ["All", ...Array.from(new Set(characters.flatMap((c) => c.tags)))];

  // Filtering Logic
  const filteredCharacters = activeFilter === "All"
    ? characters
    : characters.filter((c) => c.tags.includes(activeFilter));

  // Like interaction with realtime Firestore sync and bouncy pop
  const handleLike = async (character: Character, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      const isDefaultStatic = character.id.startsWith("default-");
      
      if (isDefaultStatic) {
        const targetId = character.id;
        const charRef = doc(db, "characters", targetId);
        await setDoc(charRef, {
          name: character.name,
          role: character.role,
          avatar: character.avatar,
          plot: character.plot,
          tags: character.tags,
          likes: character.likes + 1,
          createdAt: new Date().toISOString(),
        });
        showToast(`Đã thả tim cho ${character.name}! 💕`, "success");
      } else {
        const charRef = doc(db, "characters", character.id);
        await updateDoc(charRef, {
          likes: character.likes + 1,
        });
        showToast(`Đã thả tim cho ${character.name}! 💕`, "success");
      }
    } catch (err) {
      console.error(err);
      showToast("Có lỗi khi thả tim!", "error");
    }
  };

  // Cloudinary Secure Media Upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    showToast("Đang cưỡi mây bay lên... ☁", "info");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "dreamy_garden_preset");

      const response = await fetch("https://api.cloudinary.com/v1_1/i7upt5gk/auto/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Cloudinary upload failed");
      }

      const data = await response.json();
      setFormAvatar(data.secure_url);
      showToast("Tải ảnh lên thành công! ✨ Preview sẵn sàng.", "success");
    } catch (err) {
      console.error(err);
      showToast("Tải ảnh lên thất bại. Vui lòng kiểm tra upload_preset!", "error");
    } finally {
      setUploading(false);
    }
  };

  // Create or Update Character inside Firestore
  const handleSaveCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formRole || !formPlot || !formAvatar) {
      showToast("Vui lòng điền đầy đủ các thông tin nhân vật!", "error");
      return;
    }

    try {
      const parsedTags = formTags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const characterData = {
        name: formName.trim(),
        role: formRole.trim(),
        avatar: formAvatar,
        plot: formPlot.trim(),
        tags: parsedTags.length > 0 ? parsedTags : ["Dreamy"],
        likes: editingId ? (characters.find((c) => c.id === editingId)?.likes || 0) : 0,
        createdAt: new Date().toISOString(),
      };

      if (editingId) {
        await setDoc(doc(db, "characters", editingId), characterData, { merge: true });
        showToast(`Cập nhật nhân vật ${formName} thành công!`, "success");
      } else {
        await addDoc(collection(db, "characters"), characterData);
        showToast(`Gieo mầm nhân vật ${formName} thành công! 🌱`, "success");
      }

      // Reset Form
      setFormName("");
      setFormRole("");
      setFormPlot("");
      setFormTags("");
      setFormAvatar("");
      setEditingId(null);
      setShowForm(false);
    } catch (err) {
      console.error(err);
      showToast("Không thể lưu nhân vật!", "error");
    }
  };

  // Delete Character from Firestore
  const handleDeleteCharacter = async (id: string, name: string) => {
    if (id.startsWith("default-")) {
      showToast("Không thể xóa nhân vật mặc định!", "error");
      return;
    }
    // Sửa thêm chữ window. để Vercel không báo lỗi undefined confirm
    if (window.confirm(`Bạn có chắc chắn muốn xóa nhân vật ${name}?`)) {
      try {
        await deleteDoc(doc(db, "characters", id));
        showToast(`Đã xóa nhân vật ${name}.`, "info");
      } catch (err) {
        console.error(err);
        showToast("Xóa nhân vật thất bại!", "error");
      }
    }
  };

  // Edit Button Trigger
  const handleStartEdit = (char: Character) => {
    setEditingId(char.id);
    setFormName(char.name);
    setFormRole(char.role);
    setFormPlot(char.plot);
    setFormTags(char.tags.join(", "));
    setFormAvatar(char.avatar);
    setShowForm(true);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 z-10 flex flex-col gap-6 relative">
      
      {/* Header with Admin Creation Trigger */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-display text-white text-glow-pearl flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-pink-400 animate-spin-slow" />
          Nhân Vật Nhiệm Màu
        </h2>
        {isAdmin && (
          <button
            onClick={() => {
              setShowForm(!showForm);
              if (showForm) setEditingId(null);
            }}
            className="px-4 py-2 bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 text-white rounded-full text-xs font-bold shadow-md hover:scale-105 transition-all flex items-center gap-1.5"
          >
            {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showForm ? "Đóng Form" : "Gieo mầm nhân vật"}
          </button>
        )}
      </div>

      {/* Admin Character Creator Form */}
      <AnimatePresence>
        {showForm && isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-6 rounded-[32px] glass-panel border border-pink-200 shadow-xl max-w-2xl mx-auto w-full text-slate-800"
          >
            <form onSubmit={handleSaveCharacter} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1 md:col-span-2 text-center border-b border-pink-100 pb-3">
                <h3 className="text-lg font-bold text-pink-600 flex items-center justify-center gap-1.5 font-display">
                  🌸 {editingId ? "Hiệu Chỉnh Nhân Vật" : "Tạo Nhân Vật Mới"}
                </h3>
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Tên Nhân Vật</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Aria Moonlight"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="bg-white/50 border border-pink-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Danh Hiệu / Vai Trò</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Guardian of soft dreams"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="bg-white/50 border border-pink-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Thẻ Nhận Diện (ngăn cách bằng dấu phẩy)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Luna, Whisper, Dream"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  className="bg-white/50 border border-pink-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white"
                />
              </div>

              <div className="flex flex-col gap-1.5 relative">
                <label className="text-xs font-bold text-slate-600">Avatar đại diện</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="URL ảnh hoặc tải lên file"
                    value={formAvatar}
                    onChange={(e) => setFormAvatar(e.target.value)}
                    className="bg-white/50 border border-pink-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white flex-1"
                  />
                  <label className="bg-pink-100 hover:bg-pink-200 text-pink-700 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    Tải ảnh
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Cốt truyện phiêu lưu (Plot)</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Kể chi tiết về câu chuyện, tiểu sử kỳ diệu của nhân vật..."
                  value={formPlot}
                  onChange={(e) => setFormPlot(e.target.value)}
                  className="bg-white/50 border border-pink-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white resize-none"
                />
              </div>

              {uploading && (
                <div className="col-span-1 md:col-span-2 flex items-center justify-center gap-2 text-pink-600 text-xs font-bold animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang cưỡi mây bay lên... ☁
                </div>
              )}

              {formAvatar && (
                <div className="col-span-1 md:col-span-2 flex flex-col items-center justify-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Preview Avatar</span>
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-pink-300">
                    <img src={formAvatar} alt="preview" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}

              <div className="col-span-1 md:col-span-2 flex gap-3 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
                >
                  <Save className="w-3.5 h-3.5" />
                  Lưu Nhân Vật
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Tags (Horizontal, hide scrollbar) */}
      <div 
        id="filter-tags-container"
        className="w-full overflow-x-auto hide-scrollbar flex gap-2 pb-2 border-b border-white/20"
      >
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveFilter(tag)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all whitespace-nowrap ${
              activeFilter === tag
                ? "bg-pink-400 text-white shadow-md shadow-pink-100"
                : "bg-white/20 hover:bg-white/40 text-slate-700"
            }`}
          >
            #{tag}
          </button>
        ))}
      </div>

      {/* Characters Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence>
          {filteredCharacters.map((char) => (
            <motion.div
              key={char.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4 }}
              className="relative p-6 rounded-[32px] glass-panel hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 flex flex-col items-center text-center group"
            >
              
              {/* Admin actions (Edit/Delete icons) */}
              {isAdmin && (
                <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button
                    onClick={() => handleStartEdit(char)}
                    className="p-1.5 rounded-full bg-white/60 hover:bg-white text-purple-600 transition-colors shadow-sm"
                    title="Chỉnh sửa"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDeleteCharacter(char.id, char.name)}
                    className="p-1.5 rounded-full bg-white/60 hover:bg-rose-50 text-rose-600 transition-colors shadow-sm"
                    title="Xóa"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Avatar with Wavy Gradient liquid border rotating continually */}
              <div className="relative w-32 h-32 mb-4 select-none">
                {/* Spinning liquid gradient borders */}
                <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-green-300 via-pink-300 to-purple-300 blur-sm animate-wave-rotate opacity-75" />
                <div className="absolute -inset-1 rounded-full liquid-border opacity-90" />
                
                {/* Standard Avatar Image */}
                <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-white bg-slate-100 z-10 shadow-inner">
                  <img
                    src={char.avatar}
                    alt={char.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              {/* Name & Role */}
              <h3 className="text-lg font-bold text-slate-800 font-display group-hover:text-pink-600 transition-colors">
                {char.name}
              </h3>
              <p className="text-[11px] text-slate-600 font-medium px-4 mt-1 mb-4 h-8 overflow-hidden line-clamp-2">
                {char.role}
              </p>

              {/* Tag Capsules */}
              <div className="flex flex-wrap gap-1 justify-center mb-4">
                {char.tags.map((t) => (
                  <span
                    key={t}
                    className="text-[9px] bg-white/40 text-slate-600 font-bold px-2 py-0.5 rounded-full border border-white/40"
                  >
                    #{t}
                  </span>
                ))}
              </div>

              {/* Footer Controls with Interactive Bouncy heart liking */}
              <div className="flex w-full justify-between items-center mt-auto pt-3 border-t border-white/20">
                <button
                  onClick={() => setSelectedCharacter(char)}
                  className="text-[10px] font-bold px-4 py-2 bg-white/30 hover:bg-white/60 rounded-full uppercase tracking-wider text-slate-700 transition-colors flex items-center gap-1 border border-white/50"
                >
                  <Eye className="w-3 h-3 text-pink-400" />
                  Chi tiết
                </button>

                <div className="flex items-center gap-1.5">
                  <motion.button
                    onClick={(e) => handleLike(char, e)}
                    className="text-pink-500 hover:text-pink-600 hover:scale-125 transition-transform"
                    whileTap={{ scale: 1.5, rotate: [0, -15, 15, 0] }}
                  >
                    <Heart className="w-4 h-4 fill-pink-500 hover:fill-pink-600 filter drop-shadow-sm" />
                  </motion.button>
                  <span className="text-xs font-bold text-pink-600">
                    {char.likes >= 1000 ? `${(char.likes / 1000).toFixed(1)}k` : char.likes}
                  </span>
                </div>
              </div>

            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Character Detail Popup Modal */}
      <AnimatePresence>
        {selectedCharacter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md"
            onClick={() => setSelectedCharacter(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white/70 backdrop-blur-xl border border-white/60 p-6 md:p-8 rounded-[36px] shadow-2xl max-w-2xl w-full text-slate-800 relative max-h-[90vh] flex flex-col custom-scroll overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedCharacter(null)}
                className="absolute top-5 right-5 p-2 rounded-full bg-white/50 hover:bg-white text-slate-700 transition-all hover:scale-110 shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                {/* Large Avatar */}
                <div className="relative w-40 h-40 flex-shrink-0">
                  <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-green-300 via-pink-300 to-purple-400 blur-sm animate-wave-rotate opacity-75" />
                  <div className="absolute -inset-1 rounded-full liquid-border" />
                  <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-white bg-slate-100 z-10 shadow-lg">
                    <img
                      src={selectedCharacter.avatar}
                      alt={selectedCharacter.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                {/* Character Name and Role */}
                <div className="flex-1 text-center md:text-left">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-pink-500">
                    Cốt truyện nhân vật
                  </span>
                  <h3 className="text-2xl font-bold font-display text-slate-900 mt-1">
                    {selectedCharacter.name}
                  </h3>
                  <p className="text-xs italic text-slate-600 mt-0.5 font-medium">
                    {selectedCharacter.role}
                  </p>

                  <div className="flex flex-wrap gap-1 mt-2.5 justify-center md:justify-start">
                    {selectedCharacter.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[9px] bg-pink-50 text-pink-700 font-bold px-2.5 py-0.5 rounded-full border border-pink-100/50"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                  
                  {/* Hearts metrics */}
                  <div className="flex items-center justify-center md:justify-start gap-1 text-pink-600 mt-4 font-bold text-xs">
                    <Heart className="w-4 h-4 fill-pink-500 text-pink-500 animate-pulse" />
                    <span>{selectedCharacter.likes} lượt thích kì diệu</span>
                  </div>
                </div>
              </div>

              {/* Detailed Plot (Cốt truyện phiêu lưu) */}
              <div className="mt-6 pt-5 border-t border-pink-100 text-slate-700">
                <h4 className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-2">
                  Tiểu Sử Phiêu Lưu
                </h4>
                <div className="text-sm leading-relaxed custom-scroll pr-2 max-h-48 overflow-y-auto whitespace-pre-line text-slate-700/90 font-medium">
                  {selectedCharacter.plot}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
