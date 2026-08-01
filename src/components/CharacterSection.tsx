import React, { useState, useEffect } from "react";
import { collection, doc, onSnapshot, updateDoc, setDoc, deleteDoc, addDoc, query, orderBy } from "firebase/firestore";
import { db } from "../config/firebase";
import { Character, UserProfile, KeyTier, UserKeys } from "../types";
// Đã sửa lại tên thư viện chuẩn để Vercel không báo lỗi
import { motion, AnimatePresence } from "motion/react";
import {
  Heart, Plus, Trash2, Edit2, X, Eye, Sparkles, Upload, Loader2, Save,
  Lock, Unlock, Clock, BookOpen, Images, Maximize2, ExternalLink, Backpack,
} from "lucide-react";

interface CharacterSectionProps {
  isAdmin: boolean;
  currentUser: UserProfile | null;
  onUpdateUser: (updatedUser: UserProfile) => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

// --- (1) Trạng thái tiến độ của nhân vật (admin gán thủ công, hiển thị ngay trên profile) ---
type CharacterStatus = "in-progress" | "unlocked" | "locked";

const CHARACTER_STATUS_META: Record<
  CharacterStatus,
  { label: string; shortLabel: string; badge: string; icon: typeof Lock }
> = {
  "in-progress": {
    label: "Đang tiến hành",
    shortLabel: "Đang tiến hành",
    badge: "text-amber-600 bg-amber-50 border-amber-200",
    icon: Clock,
  },
  unlocked: {
    label: "Đã mở khoá (vui lòng tham gia Discord để nhận)",
    shortLabel: "Đã mở khoá",
    badge: "text-emerald-600 bg-emerald-50 border-emerald-200",
    icon: Unlock,
  },
  locked: {
    label: "Đã khoá",
    shortLabel: "Đã khoá",
    badge: "text-slate-500 bg-slate-100 border-slate-200",
    icon: Lock,
  },
};

// --- (2) Mạch truyện bổ sung / ngoại truyện — chỉ gồm tên + nội dung, KHÔNG có trạng thái riêng ---
interface StoryArc {
  id: string;
  title: string;
  content: string;
}

// --- (3) Vibe Gallery — bộ ảnh phong cách Instagram để thể hiện "vibe" của nhân vật ---
interface GalleryImage {
  id: string;
  url: string;
  caption?: string;
}

// --- (4) Hệ thống Chìa Khoá — đổi từ streak Manifest (xem Manifestation.tsx), dùng để mở khoá nhân vật ---
// NOTE: metadata này lặp lại giống hệt bên Manifestation.tsx để 2 nơi luôn khớp mốc ngày/tên gọi.
const KEY_TIER_META: Record<
  KeyTier,
  { label: string; threshold: number; emoji: string; badge: string }
> = {
  bronze: { label: "Đồng", threshold: 10, emoji: "🥉", badge: "text-orange-700 bg-orange-50 border-orange-200" },
  silver: { label: "Bạc", threshold: 20, emoji: "🥈", badge: "text-slate-600 bg-slate-100 border-slate-300" },
  gold: { label: "Vàng", threshold: 30, emoji: "🥇", badge: "text-amber-600 bg-amber-50 border-amber-300" },
  diamond: { label: "Kim Cương", threshold: 40, emoji: "💎", badge: "text-cyan-600 bg-cyan-50 border-cyan-300" },
};
const KEY_TIER_ORDER: KeyTier[] = ["bronze", "silver", "gold", "diamond"];
const EMPTY_KEYS: UserKeys = { bronze: 0, silver: 0, gold: 0, diamond: 0 };

// Type mở rộng CharacterExt - khớp với các field đã có trong types.ts hiện tại
type CharacterExt = Character & {
  status?: CharacterStatus;
  statusReason?: string;
  storyArcs?: StoryArc[];
  gallery?: GalleryImage[];
  requiredKeyTier?: KeyTier | null;
  unlockRewardLink?: string;
};

// Đã làm trống danh sách mặc định để vườn chỉ hiện nhân vật do admin tạo
const DEFAULT_CHARACTERS: Character[] = [];

export default function CharacterSection({ isAdmin, currentUser, onUpdateUser, showToast }: CharacterSectionProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [showInventory, setShowInventory] = useState(false);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  // Create / Edit Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formPlot, setFormPlot] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formAvatar, setFormAvatar] = useState("");
  const [uploading, setUploading] = useState(false);

  // (1) Trạng thái tiến độ của nhân vật
  const [formStatus, setFormStatus] = useState<CharacterStatus>("in-progress");
  const [formStatusReason, setFormStatusReason] = useState("");

  // (2) Mạch truyện bổ sung (ngoại truyện) - danh sách riêng biệt
  const [formStoryArcs, setFormStoryArcs] = useState<StoryArc[]>([]);
  const [arcTitle, setArcTitle] = useState("");
  const [arcContent, setArcContent] = useState("");

  // (3) Vibe Gallery - bộ ảnh phong cách Instagram
  const [formGallery, setFormGallery] = useState<GalleryImage[]>([]);
  const [galleryCaption, setGalleryCaption] = useState("");
  const [galleryUploading, setGalleryUploading] = useState(false);

  // (4) Yêu cầu Chìa Khoá để mở khoá nhân vật
  const [formRequiredKeyTier, setFormRequiredKeyTier] = useState<KeyTier | "">("");
  const [formUnlockRewardLink, setFormUnlockRewardLink] = useState("");

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

  const userKeys = currentUser?.keys || EMPTY_KEYS;
  const unlockedIds = currentUser?.unlockedCharacterIds || [];

  // Like interaction with realtime Firestore sync and bouncy pop
  const handleLike = async (character: Character, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      const isDefaultStatic = character.id.startsWith("default-");
      const ext = character as CharacterExt;

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
          status: ext.status || "in-progress",
          statusReason: ext.statusReason || "",
          storyArcs: ext.storyArcs || [],
          gallery: ext.gallery || [],
          requiredKeyTier: ext.requiredKeyTier || null,
          unlockRewardLink: ext.unlockRewardLink || "",
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

  // Cloudinary Secure Media Upload (avatar)
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

  // Thêm ảnh vào Vibe Gallery (upload Cloudinary, giữ chú thích tuỳ chọn kèm theo)
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setGalleryUploading(true);
    showToast("Đang thêm ảnh vào vibe board... ☁", "info");

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
      const newImage: GalleryImage = {
        id: `gallery-${Date.now()}`,
        url: data.secure_url,
        ...(galleryCaption.trim() ? { caption: galleryCaption.trim() } : {}),
      };
      setFormGallery((prev) => [...prev, newImage]);
      setGalleryCaption("");
      showToast("Đã thêm ảnh vào vibe board! ✨", "success");
    } catch (err) {
      console.error(err);
      showToast("Tải ảnh lên thất bại. Vui lòng kiểm tra upload_preset!", "error");
    } finally {
      setGalleryUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveGalleryImage = (id: string) => {
    setFormGallery((prev) => prev.filter((img) => img.id !== id));
  };

  const handleAddStoryArc = () => {
    if (!arcTitle.trim() || !arcContent.trim()) {
      showToast("Vui lòng nhập đủ tên và nội dung mạch truyện!", "error");
      return;
    }

    const newArc: StoryArc = {
      id: `arc-${Date.now()}`,
      title: arcTitle.trim(),
      content: arcContent.trim(),
    };

    setFormStoryArcs((prev) => [...prev, newArc]);
    setArcTitle("");
    setArcContent("");
  };

  const handleRemoveStoryArc = (id: string) => {
    setFormStoryArcs((prev) => prev.filter((a) => a.id !== id));
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
        status: formStatus,
        statusReason: formStatus === "locked" ? formStatusReason.trim() : "",
        storyArcs: formStoryArcs,
        gallery: formGallery,
        requiredKeyTier: formRequiredKeyTier || null,
        unlockRewardLink: formRequiredKeyTier ? formUnlockRewardLink.trim() : "",
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
      setFormStatus("in-progress");
      setFormStatusReason("");
      setFormStoryArcs([]);
      setArcTitle("");
      setArcContent("");
      setFormGallery([]);
      setGalleryCaption("");
      setFormRequiredKeyTier("");
      setFormUnlockRewardLink("");
      setEditingId(null);
      setShowForm(false);
    } catch (err) {
      console.error(err);
      showToast("Không thể lưu nhân vật!", "error");
    }
  };

  // Delete Character from Firestore
  const handleDeleteCharacter = async (id: string, name: string) => {
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
    const ext = char as CharacterExt;
    setEditingId(char.id);
    setFormName(char.name);
    setFormRole(char.role);
    setFormPlot(char.plot);
    setFormTags(char.tags.join(", "));
    setFormAvatar(char.avatar);
    setFormStatus(ext.status || "in-progress");
    setFormStatusReason(ext.statusReason || "");
    setFormStoryArcs(ext.storyArcs || []);
    setArcTitle("");
    setArcContent("");
    setFormGallery(ext.gallery || []);
    setGalleryCaption("");
    setFormRequiredKeyTier(ext.requiredKeyTier || "");
    setFormUnlockRewardLink(ext.unlockRewardLink || "");
    setShowForm(true);
  };

  // Dùng 1 chìa khoá trong túi đồ để mở khoá vĩnh viễn 1 nhân vật
  const handleUnlockWithKey = async (character: Character) => {
    if (!currentUser) {
      showToast("Vui lòng đăng nhập để dùng chìa khoá mở khoá nhân vật!", "info");
      return;
    }
    const ext = character as CharacterExt;
    const tier = ext.requiredKeyTier;
    if (!tier) return;

    const availableCount = userKeys[tier] || 0;
    if (availableCount < 1) {
      showToast(
        `Bạn chưa có Khoá ${KEY_TIER_META[tier].label}. Hãy giữ chuỗi Manifest ${KEY_TIER_META[tier].threshold} ngày rồi đổi khoá nhé! 🔑`,
        "error"
      );
      return;
    }

    setUnlockingId(character.id);
    const updatedKeys: UserKeys = { ...userKeys, [tier]: availableCount - 1 };
    const updatedUnlockedIds = [...unlockedIds, character.id];

    try {
      const userId = currentUser.username?.toLowerCase() || currentUser.uid || currentUser.id || "unknown_user";
      const userRef = doc(db, "users", userId);
      await setDoc(userRef, { keys: updatedKeys, unlockedCharacterIds: updatedUnlockedIds }, { merge: true });

      const updatedUser: UserProfile = {
        ...currentUser,
        keys: updatedKeys,
        unlockedCharacterIds: updatedUnlockedIds,
      };
      onUpdateUser(updatedUser);
      showToast(`Đã dùng Khoá ${KEY_TIER_META[tier].emoji} ${KEY_TIER_META[tier].label} mở khoá ${character.name}! 🎉`, "success");
    } catch (err) {
      console.error(err);
      showToast("Mở khoá thất bại, thử lại nhé!", "error");
    } finally {
      setUnlockingId(null);
    }
  };

  const unlockedCharacterNames = characters
    .filter((c) => unlockedIds.includes(c.id))
    .map((c) => c.name);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 z-10 flex flex-col gap-6 relative">

      {/* Header with Admin Creation Trigger + Túi Đồ */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-2xl font-display text-white text-glow-pearl flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-pink-400 animate-spin-slow" />
          Nhân Vật Nhiệm Màu
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInventory(true)}
            className="px-4 py-2 bg-white/40 hover:bg-white/60 text-slate-700 rounded-full text-xs font-bold shadow-sm hover:scale-105 transition-all flex items-center gap-1.5 border border-white/50"
          >
            <Backpack className="w-3.5 h-3.5 text-purple-500" />
            Túi Đồ
          </button>
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

              {/* ---- (1) Trạng thái tiến độ của nhân vật ---- */}
              <div className="col-span-1 md:col-span-2 flex flex-col gap-2 pt-3 border-t border-pink-100">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  Trạng Thái Tiến Độ Nhân Vật
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as CharacterStatus)}
                  className="bg-white/50 border border-pink-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white"
                >
                  <option value="in-progress">Đang tiến hành</option>
                  <option value="unlocked">Đã mở khoá</option>
                  <option value="locked">Đã khoá</option>
                </select>

                {formStatus === "locked" && (
                  <input
                    type="text"
                    placeholder="Lý do khoá (ví dụ: chưa đủ điều kiện mở khoá...)"
                    value={formStatusReason}
                    onChange={(e) => setFormStatusReason(e.target.value)}
                    className="bg-white/50 border border-pink-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white"
                  />
                )}
              </div>

              {/* ---- (4) Yêu cầu Chìa Khoá để mở khoá (key economy) ---- */}
              <div className="col-span-1 md:col-span-2 flex flex-col gap-2 pt-3 border-t border-pink-100">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-purple-400" />
                  Yêu Cầu Chìa Khoá Để Mở (tuỳ chọn)
                </label>
                <select
                  value={formRequiredKeyTier}
                  onChange={(e) => setFormRequiredKeyTier(e.target.value as KeyTier | "")}
                  className="bg-white/50 border border-pink-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white"
                >
                  <option value="">Không yêu cầu (dùng Trạng Thái phía trên)</option>
                  {KEY_TIER_ORDER.map((tier) => (
                    <option key={tier} value={tier}>
                      {KEY_TIER_META[tier].emoji} Khoá {KEY_TIER_META[tier].label} ({KEY_TIER_META[tier].threshold} ngày streak)
                    </option>
                  ))}
                </select>

                {formRequiredKeyTier && (
                  <input
                    type="text"
                    placeholder="Link phần thưởng (Discord/Drive/...) khi user dùng khoá mở khoá"
                    value={formUnlockRewardLink}
                    onChange={(e) => setFormUnlockRewardLink(e.target.value)}
                    className="bg-white/50 border border-pink-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white"
                  />
                )}
              </div>

              {/* ---- (2) Mạch truyện bổ sung (ngoại truyện) - phần riêng biệt ---- */}
              <div className="col-span-1 md:col-span-2 flex flex-col gap-2 pt-3 border-t border-pink-100">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                  Mạch Truyện Bổ Sung (Ngoại truyện)
                </label>

                <input
                  type="text"
                  placeholder="Tên mạch truyện / ngoại truyện"
                  value={arcTitle}
                  onChange={(e) => setArcTitle(e.target.value)}
                  className="bg-white/50 border border-pink-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white"
                />
                <textarea
                  rows={3}
                  placeholder="Nội dung ngoại truyện..."
                  value={arcContent}
                  onChange={(e) => setArcContent(e.target.value)}
                  className="bg-white/50 border border-pink-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white resize-none"
                />
                <button
                  type="button"
                  onClick={handleAddStoryArc}
                  className="self-start px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thêm mạch truyện
                </button>

                {formStoryArcs.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-1">
                    {formStoryArcs.map((arc) => (
                      <div
                        key={arc.id}
                        className="flex items-start gap-2 px-3 py-2 rounded-xl border border-purple-100 bg-purple-50/50 text-[11px]"
                      >
                        <BookOpen className="w-3 h-3 flex-shrink-0 mt-0.5 text-purple-400" />
                        <div className="flex-1">
                          <p className="font-bold text-slate-700">{arc.title}</p>
                          <p className="text-slate-500 line-clamp-2">{arc.content}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveStoryArc(arc.id)}
                          className="hover:scale-110 transition-transform text-slate-400 hover:text-rose-500"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ---- (3) Vibe Gallery - bộ ảnh phong cách Instagram ---- */}
              <div className="col-span-1 md:col-span-2 flex flex-col gap-2 pt-3 border-t border-pink-100">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                  <Images className="w-3.5 h-3.5 text-purple-400" />
                  Vibe Gallery (Bộ Ảnh Phong Cách)
                </label>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Chú thích cho ảnh (tuỳ chọn)"
                    value={galleryCaption}
                    onChange={(e) => setGalleryCaption(e.target.value)}
                    className="bg-white/50 border border-pink-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white flex-1"
                  />
                  <label className="bg-pink-100 hover:bg-pink-200 text-pink-700 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1 whitespace-nowrap">
                    <Upload className="w-3.5 h-3.5" />
                    Thêm ảnh
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleGalleryUpload}
                      className="hidden"
                      disabled={galleryUploading}
                    />
                  </label>
                </div>

                {galleryUploading && (
                  <div className="flex items-center gap-2 text-pink-600 text-xs font-bold animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang tải ảnh lên... ☁
                  </div>
                )}

                {formGallery.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-1">
                    {formGallery.map((img) => (
                      <div
                        key={img.id}
                        className="relative aspect-square rounded-lg overflow-hidden border border-pink-200 group"
                      >
                        <img
                          src={img.url}
                          alt={img.caption || "vibe"}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryImage(img.id)}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                  disabled={uploading || galleryUploading}
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
          {filteredCharacters.map((char) => {
            const ext = char as CharacterExt;
            const hasKeyGate = !!ext.requiredKeyTier;
            const isKeyUnlocked = hasKeyGate && unlockedIds.includes(char.id);

            return (
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
                  <div className="absolute top-4 right-4 flex gap-1.5 z-10">
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
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Avatar with Wavy Gradient liquid border rotating continually */}
                <div className="relative w-32 h-32 mb-4 select-none">
                  <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-green-300 via-pink-300 to-purple-300 blur-sm animate-wave-rotate opacity-75" />
                  <div className="absolute -inset-1 rounded-full liquid-border opacity-90" />
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
                <p className="text-[11px] text-slate-600 font-medium px-4 mt-1 mb-2 h-8 overflow-hidden line-clamp-2">
                  {char.role}
                </p>

                {/* Badge: Nếu có Key Gate thì ưu tiên hiện badge khoá, ngược lại hiện Trạng Thái thủ công */}
                {hasKeyGate ? (
                  <div
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[9px] font-bold mb-3 max-w-full ${
                      isKeyUnlocked
                        ? "text-emerald-600 bg-emerald-50 border-emerald-200"
                        : KEY_TIER_META[ext.requiredKeyTier!].badge
                    }`}
                  >
                    {isKeyUnlocked ? <Unlock className="w-3 h-3 flex-shrink-0" /> : <Lock className="w-3 h-3 flex-shrink-0" />}
                    <span className="truncate">
                      {isKeyUnlocked
                        ? "Đã mở khoá"
                        : `${KEY_TIER_META[ext.requiredKeyTier!].emoji} Cần Khoá ${KEY_TIER_META[ext.requiredKeyTier!].label}`}
                    </span>
                  </div>
                ) : (
                  ext.status && (() => {
                    const meta = CHARACTER_STATUS_META[ext.status!];
                    const Icon = meta.icon;
                    return (
                      <div
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[9px] font-bold mb-3 max-w-full ${meta.badge}`}
                      >
                        <Icon className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{meta.shortLabel}</span>
                      </div>
                    );
                  })()
                )}

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
            );
          })}
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

              {(() => {
                const ext = selectedCharacter as CharacterExt;
                const hasKeyGate = !!ext.requiredKeyTier;

                // --- Ưu tiên hiện khối Key Gate nếu nhân vật này yêu cầu khoá ---
                if (hasKeyGate) {
                  const tier = ext.requiredKeyTier!;
                  const meta = KEY_TIER_META[tier];
                  const isUnlocked = unlockedIds.includes(selectedCharacter.id);
                  const availableCount = userKeys[tier] || 0;

                  return (
                    <div className={`rounded-2xl border p-4 mb-4 ${isUnlocked ? "border-emerald-200 bg-emerald-50/60" : meta.badge}`}>
                      {isUnlocked ? (
                        <div className="flex flex-col gap-2 items-center text-center">
                          <span className="text-xs font-bold text-emerald-700">
                            🎉 Đã mở khoá bằng {meta.emoji} Khoá {meta.label}
                          </span>
                          {ext.unlockRewardLink && (
                            <a
                              href={ext.unlockRewardLink}
                              target="_blank"
                              rel="noreferrer"
                              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Nhận Link Ngay
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 items-center text-center">
                          <span className="text-xs font-bold">
                            {meta.emoji} Cần Khoá {meta.label} để mở khoá nhân vật này
                          </span>
                          <span className="text-[10px] opacity-80">
                            Bạn đang có: {availableCount} Khoá {meta.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUnlockWithKey(selectedCharacter)}
                            disabled={availableCount < 1 || unlockingId === selectedCharacter.id}
                            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            {unlockingId === selectedCharacter.id ? "Đang mở..." : "Dùng Khoá Mở Khoá"}
                          </button>
                          {availableCount < 1 && (
                            <span className="text-[10px] opacity-70 italic">
                              Giữ chuỗi Manifest {meta.threshold} ngày rồi đổi khoá ở trang Manifest nhé!
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }

                // --- Nếu không có key gate, hiện Trạng Thái tiến độ thủ công như cũ ---
                if (ext.status) {
                  const meta = CHARACTER_STATUS_META[ext.status];
                  const Icon = meta.icon;
                  return (
                    <div
                      className={`self-center md:self-start inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold mb-4 ${meta.badge}`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{meta.label}</span>
                      {ext.status === "locked" && ext.statusReason && (
                        <span className="font-normal italic opacity-80">· {ext.statusReason}</span>
                      )}
                    </div>
                  );
                }

                return null;
              })()}

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
                <div className="text-sm leading-loose whitespace-pre-line text-slate-700/90 font-medium">
                  {selectedCharacter.plot}
                </div>
              </div>

              {/* (3) Vibe Board - lưới ảnh phong cách Instagram */}
              {(selectedCharacter as CharacterExt).gallery &&
                (selectedCharacter as CharacterExt).gallery!.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-pink-100">
                    <h4 className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-3 flex items-center gap-1.5">
                      <Images className="w-3.5 h-3.5 text-purple-400" />
                      Vibe Board
                    </h4>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(selectedCharacter as CharacterExt).gallery!.map((img) => (
                        <div
                          key={img.id}
                          className="relative aspect-square rounded-lg overflow-hidden group"
                        >
                          <img
                            src={img.url}
                            alt={img.caption || selectedCharacter.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* (2) Mạch Truyện Bổ Sung (Ngoại truyện) - ngay dưới Tiểu Sử, không có trạng thái riêng */}
              {(selectedCharacter as CharacterExt).storyArcs &&
                (selectedCharacter as CharacterExt).storyArcs!.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-pink-100 text-slate-700">
                    <h4 className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-3 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                      Mạch Truyện Bổ Sung
                    </h4>
                    <div className="flex flex-col gap-3">
                      {(selectedCharacter as CharacterExt).storyArcs!.map((arc) => (
                        <div
                          key={arc.id}
                          className="px-3.5 py-3 rounded-2xl border border-purple-100 bg-purple-50/40"
                        >
                          <p className="text-xs font-bold text-purple-700 mb-1">{arc.title}</p>
                          <p className="text-xs leading-relaxed text-slate-600 whitespace-pre-line">
                            {arc.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Túi Đồ Modal */}
      <AnimatePresence>
        {showInventory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md"
            onClick={() => setShowInventory(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white/80 backdrop-blur-xl border border-white/60 p-6 rounded-[32px] shadow-2xl max-w-md w-full text-slate-800 relative max-h-[85vh] overflow-y-auto custom-scroll"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowInventory(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/50 hover:bg-white text-slate-700 transition-all hover:scale-110 shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-1">
                <Backpack className="w-5 h-5 text-purple-500" />
                Túi Đồ Của Bạn
              </h3>

              {!currentUser ? (
                <p className="text-xs text-slate-500 mt-4">Vui lòng đăng nhập để xem túi đồ và tích luỹ chìa khoá nhé!</p>
              ) : (
                <>
                  <p className="text-[10px] text-slate-500 mb-4">
                    Đổi thêm chìa khoá tại trang Manifest bằng cách giữ chuỗi manifest.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {KEY_TIER_ORDER.map((tier) => {
                      const meta = KEY_TIER_META[tier];
                      const count = userKeys[tier] || 0;
                      return (
                        <div
                          key={tier}
                          className={`rounded-2xl border p-3 flex flex-col items-center gap-1 ${meta.badge}`}
                        >
                          <span className="text-2xl">{meta.emoji}</span>
                          <span className="text-[11px] font-bold">Khoá {meta.label}</span>
                          <span className="text-lg font-bold">x{count}</span>
                        </div>
                      );
                    })}
                  </div>

                  {unlockedCharacterNames.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-slate-200">
                      <h4 className="text-xs font-bold text-slate-600 mb-2">Nhân vật đã mở khoá bằng chìa khoá</h4>
                      <ul className="flex flex-col gap-1">
                        {unlockedCharacterNames.map((name) => (
                          <li key={name} className="text-xs text-slate-600 flex items-center gap-1.5">
                            <Unlock className="w-3 h-3 text-emerald-500" />
                            {name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
