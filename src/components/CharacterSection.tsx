import React, { useState, useEffect, useRef } from "react";
import { collection, doc, onSnapshot, updateDoc, setDoc, deleteDoc, addDoc, query, orderBy, increment } from "firebase/firestore";
import { db } from "../config/firebase";
import { Character, UserProfile, KeyTier, UserKeys } from "../types";
import { motion, AnimatePresence } from "motion/react";
import {
  Heart, Plus, Trash2, Edit2, X, Eye, Sparkles, Upload, Save,
  Lock, Unlock, Clock, BookOpen, Images, ExternalLink, Backpack, Milestone,
  MousePointerClick, KeyRound, FileLock2, HelpCircle, ArrowLeft, ChevronDown
} from "lucide-react";
import ImageCropModal from "./ImageCropModal";
// Dùng lại hook isMobile sẵn có của project để tắt animation vô hạn trên mobile.
// LƯU Ý: chỉnh lại đường dẫn import bên dưới cho khớp vị trí thật của
// useIsMobile.ts trong project nếu khác (hiện đang giả định "../hooks/useIsMobile").
import { useIsMobile } from "../hooks/useIsMobile";

interface CharacterSectionProps {
  isAdmin: boolean;
  currentUser: UserProfile | null;
  onUpdateUser: (updatedUser: UserProfile) => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

// --- Trạng thái tiến độ của nhân vật ---
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
    label: "Đã hoàn thành",
    shortLabel: "Đã hoàn thành",
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

interface StoryArc {
  id: string;
  title: string;
  content: string;
}

interface GalleryImage {
  id: string;
  url: string;
  caption?: string;
}

// --- File Ẩn: yêu cầu nhập mật khẩu/đáp án để xem nội dung ---
interface HiddenFile {
  question?: string;
  password: string;
  content: string;
}

// --- Hệ thống Key ---
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

// Bộ ba màu thương hiệu (xanh lá / hồng / tím) — lấy đúng từ .liquid-border
// trong index.css để mọi mảng màu mới thêm vào đều đồng bộ với web.
const BRAND_GREEN = "#BCECAC";
const BRAND_PINK = "#FFD1DC";
const BRAND_LAVENDER = "#E6E6FA";

// Vòng lặp màu cho tag/nhãn để tạo cảm giác ombre thay vì một màu hồng cố định
const TAG_STYLES = [
  "bg-emerald-50/70 text-emerald-700 border-emerald-200/70",
  "bg-pink-50/70 text-pink-700 border-pink-200/70",
  "bg-purple-50/70 text-purple-700 border-purple-200/70",
];

// Màu icon Key theo từng bậc, dùng riêng cho viên thuốc Mở Khoá trong trang chi tiết
const KEY_TIER_ICON_COLOR: Record<KeyTier, string> = {
  bronze: "#b45309",
  silver: "#64748b",
  gold: "#c99a1f",
  diamond: "#0891b2",
};

type CharacterExt = Character & {
  status?: CharacterStatus;
  statusReason?: string;
  storyArcs?: StoryArc[];
  gallery?: GalleryImage[];
  requiredKeyTier?: KeyTier | "public-link" | null;
  unlockRewardLink?: string;
  views?: number;
  linkClicks?: number;
  keyRedeemCount?: number;
  hiddenFile?: HiddenFile | null;
};

const DEFAULT_CHARACTERS: Character[] = [];

export default function CharacterSection({ isAdmin, currentUser, onUpdateUser, showToast }: CharacterSectionProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [showInventory, setShowInventory] = useState(false);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  // Cờ isMobile dùng để tắt các animation vô hạn (wave-rotate + liquid-border)
  // trên avatar — đây là 2 animation gây lag nặng nhất khi nhân bản theo số
  // lượng nhân vật hiển thị cùng lúc.
  const isMobile = useIsMobile();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formPlot, setFormPlot] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formAvatar, setFormAvatar] = useState("");

  const [formStatus, setFormStatus] = useState<CharacterStatus>("in-progress");
  const [formStatusReason, setFormStatusReason] = useState("");

  const [formStoryArcs, setFormStoryArcs] = useState<StoryArc[]>([]);
  const [arcTitle, setArcTitle] = useState("");
  const [arcContent, setArcContent] = useState("");

  const [formGallery, setFormGallery] = useState<GalleryImage[]>([]);
  const [galleryCaption, setGalleryCaption] = useState("");

  const [formRequiredKeyTier, setFormRequiredKeyTier] = useState<KeyTier | "public-link" | "">("");
  const [formUnlockRewardLink, setFormUnlockRewardLink] = useState("");

  // --- File Ẩn (form admin) ---
  const [formHiddenQuestion, setFormHiddenQuestion] = useState("");
  const [formHiddenPassword, setFormHiddenPassword] = useState("");
  const [formHiddenContent, setFormHiddenContent] = useState("");

  // --- Cắt ảnh trực tiếp từ máy (canvas) ---
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<"avatar" | "gallery" | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingGalleryImage, setUploadingGalleryImage] = useState(false);

  // --- Trạng thái giải mã File Ẩn trong trang chi tiết nhân vật ---
  const [showHiddenUnlock, setShowHiddenUnlock] = useState(false);
  const [hiddenPasswordInput, setHiddenPasswordInput] = useState("");
  const [hiddenUnlocked, setHiddenUnlocked] = useState(false);
  const [hiddenError, setHiddenError] = useState(false);

  // --- Danh sách id mạch truyện đang mở (thẻ washi-tape bấm để xoè nội dung) ---
  const [openArcIds, setOpenArcIds] = useState<string[]>([]);

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

  const allTags = ["All", ...Array.from(new Set(characters.flatMap((c) => c.tags)))];
  const filteredCharacters = activeFilter === "All" ? characters : characters.filter((c) => c.tags.includes(activeFilter));

  const userKeys = currentUser?.keys || EMPTY_KEYS;
  const unlockedIds = currentUser?.unlockedCharacterIds || [];

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
          hiddenFile: ext.hiddenFile || null,
          createdAt: new Date().toISOString(),
        });
        showToast(`Đã thả tim cho ${character.name}! 💕`, "success");
      } else {
        const charRef = doc(db, "characters", character.id);
        await updateDoc(charRef, { likes: character.likes + 1 });
        showToast(`Đã thả tim cho ${character.name}! 💕`, "success");
      }
    } catch (err) {
      console.error(err);
      showToast("Có lỗi khi thả tim!", "error");
    }
  };

  const handleViewCharacter = async (character: Character) => {
    setSelectedCharacter(character);
    // Reset trạng thái giải mã File Ẩn + mạch truyện đang mở mỗi lần mở 1 nhân vật khác
    setShowHiddenUnlock(false);
    setHiddenPasswordInput("");
    setHiddenUnlocked(false);
    setHiddenError(false);
    setOpenArcIds([]);
    if (character.id.startsWith("default-")) return;
    try {
      const charRef = doc(db, "characters", character.id);
      await updateDoc(charRef, { views: increment(1) });
    } catch (err) {
      console.error(err);
    }
  };

  const handleLinkClick = async (character: Character) => {
    if (character.id.startsWith("default-")) return;
    try {
      const charRef = doc(db, "characters", character.id);
      await updateDoc(charRef, { linkClicks: increment(1) });
    } catch (err) {
      console.error(err);
    }
  };

  const handleTryHiddenPassword = () => {
    const ext = selectedCharacter as CharacterExt | null;
    if (!ext?.hiddenFile) return;
    if (hiddenPasswordInput.trim() === ext.hiddenFile.password) {
      setHiddenUnlocked(true);
      setHiddenError(false);
    } else {
      setHiddenError(true);
    }
  };

  const toggleStoryArc = (id: string) => {
    setOpenArcIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const uploadBlobToCloudinary = async (blob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append("file", blob, "cropped.jpg");
    formData.append("upload_preset", "dreamy_garden_preset");

    const response = await fetch("https://api.cloudinary.com/v1_1/i7upt5gk/auto/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Cloudinary upload failed");
    }

    const data = await response.json();
    return data.secure_url as string;
  };

  const handlePickAvatarFile = () => avatarFileInputRef.current?.click();
  const handleAvatarFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setCropTarget("avatar");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handlePickGalleryFile = () => galleryFileInputRef.current?.click();
  const handleGalleryFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setCropTarget("gallery");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropDone = async (blob: Blob) => {
    if (cropTarget === "avatar") {
      setUploadingAvatar(true);
      showToast("Đang tải Avatar đã cắt lên... ☁", "info");
      try {
        const url = await uploadBlobToCloudinary(blob);
        setFormAvatar(url);
        showToast("Đã cắt & tải Avatar thành công! ✨", "success");
      } catch (err) {
        console.error(err);
        showToast("Tải avatar thất bại, thử lại nhé!", "error");
      } finally {
        setUploadingAvatar(false);
        setCropSrc(null);
        setCropTarget(null);
      }
    } else if (cropTarget === "gallery") {
      setUploadingGalleryImage(true);
      showToast("Đang thêm ảnh vào vibe board... ☁", "info");
      try {
        const url = await uploadBlobToCloudinary(blob);
        const newImage: GalleryImage = {
          id: `gallery-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          url,
          ...(galleryCaption.trim() ? { caption: galleryCaption.trim() } : {}),
        };
        setFormGallery((prev) => [...prev, newImage]);
        showToast("Một kiệt tác vừa được thêm vào Vibe Board! ✨", "success");
      } catch (err) {
        console.error(err);
        showToast("Tải ảnh thất bại, thử lại nhé!", "error");
      } finally {
        setUploadingGalleryImage(false);
        setCropSrc(null);
        setCropTarget(null);
      }
    }
  };

  const handleCropCancel = () => {
    setCropSrc(null);
    setCropTarget(null);
  };

  const handleRemoveGalleryImage = (id: string) => setFormGallery((prev) => prev.filter((img) => img.id !== id));

  const handleAddStoryArc = () => {
    if (!arcTitle.trim() || !arcContent.trim()) return showToast("Vui lòng nhập đủ tên và nội dung mạch truyện!", "error");
    setFormStoryArcs((prev) => [...prev, { id: `arc-${Date.now()}`, title: arcTitle.trim(), content: arcContent.trim() }]);
    setArcTitle(""); setArcContent("");
  };

  const handleRemoveStoryArc = (id: string) => setFormStoryArcs((prev) => prev.filter((a) => a.id !== id));

  const handleSaveCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formRole || !formPlot || !formAvatar) return showToast("Vui lòng điền đầy đủ các thông tin nhân vật!", "error");

    try {
      const parsedTags = formTags.split(",").map((t) => t.trim()).filter((t) => t.length > 0);
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
        hiddenFile: formHiddenPassword.trim()
          ? {
              question: formHiddenQuestion.trim(),
              password: formHiddenPassword.trim(),
              content: formHiddenContent.trim(),
            }
          : null,
      };

      if (editingId) {
        await setDoc(doc(db, "characters", editingId), characterData, { merge: true });
        showToast(`Cập nhật nhân vật ${formName} thành công!`, "success");
      } else {
        await addDoc(collection(db, "characters"), { ...characterData, createdAt: new Date().toISOString() });
        showToast(`Gieo mầm nhân vật ${formName} thành công! 🌱`, "success");
      }

      setFormName(""); setFormRole(""); setFormPlot(""); setFormTags(""); setFormAvatar("");
      setFormStatus("in-progress"); setFormStatusReason(""); setFormStoryArcs([]); setArcTitle(""); setArcContent("");
      setFormGallery([]); setGalleryCaption(""); setFormRequiredKeyTier(""); setFormUnlockRewardLink("");
      setFormHiddenQuestion(""); setFormHiddenPassword(""); setFormHiddenContent("");
      setEditingId(null); setShowForm(false);
    } catch (err) {
      console.error(err);
      showToast("Không thể lưu nhân vật!", "error");
    }
  };

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

  const handleStartEdit = (char: Character) => {
    const ext = char as CharacterExt;
    setEditingId(char.id); setFormName(char.name); setFormRole(char.role); setFormPlot(char.plot);
    setFormTags(char.tags.join(", ")); setFormAvatar(char.avatar); setFormStatus(ext.status || "in-progress");
    setFormStatusReason(ext.statusReason || ""); setFormStoryArcs(ext.storyArcs || []); setArcTitle(""); setArcContent("");
    setFormGallery(ext.gallery || []); setGalleryCaption(""); setFormRequiredKeyTier(ext.requiredKeyTier || "");
    setFormUnlockRewardLink(ext.unlockRewardLink || "");
    setFormHiddenQuestion(ext.hiddenFile?.question || "");
    setFormHiddenPassword(ext.hiddenFile?.password || "");
    setFormHiddenContent(ext.hiddenFile?.content || "");
    setShowForm(true);
  };

  const handleUnlockWithKey = async (character: Character) => {
    if (!currentUser) return showToast("Vui lòng đăng nhập để dùng Key mở khoá nhân vật!", "info");
    const ext = character as CharacterExt;
    const tier = ext.requiredKeyTier;
    if (!tier || tier === "public-link") return;

    const availableCount = userKeys[tier] || 0;
    if (availableCount < 1) return showToast(`Bạn chưa có Key ${KEY_TIER_META[tier].label}. Hãy giữ chuỗi Manifest ${KEY_TIER_META[tier].threshold} ngày rồi đổi Key nhé! 🔑`, "error");

    setUnlockingId(character.id);
    const updatedKeys: UserKeys = { ...userKeys, [tier]: availableCount - 1 };
    const updatedUnlockedIds = [...unlockedIds, character.id];

    try {
      const userId = currentUser.username?.toLowerCase() || currentUser.uid || currentUser.id || "unknown_user";
      await setDoc(doc(db, "users", userId), { keys: updatedKeys, unlockedCharacterIds: updatedUnlockedIds }, { merge: true });
      onUpdateUser({ ...currentUser, keys: updatedKeys, unlockedCharacterIds: updatedUnlockedIds });
      try {
        await updateDoc(doc(db, "characters", character.id), { keyRedeemCount: increment(1) });
      } catch (err) {
        console.error(err);
      }
      showToast(`Đã dùng Key ${KEY_TIER_META[tier].emoji} ${KEY_TIER_META[tier].label} mở khoá ${character.name}! 🎉`, "success");
    } catch (err) {
      console.error(err);
      showToast("Mở khoá thất bại, thử lại nhé!", "error");
    } finally {
      setUnlockingId(null);
    }
  };

  const handleAdminGrantKey = async (tier: KeyTier) => {
    if (!currentUser || !isAdmin) return;
    const updatedKeys: UserKeys = { ...userKeys, [tier]: (userKeys[tier] || 0) + 1 };
    try {
      const userId = currentUser.username?.toLowerCase() || currentUser.uid || currentUser.id || "unknown_user";
      await setDoc(doc(db, "users", userId), { keys: updatedKeys }, { merge: true });
      onUpdateUser({ ...currentUser, keys: updatedKeys });
      showToast(`[Test] Đã cấp 1 Key ${KEY_TIER_META[tier].emoji} ${KEY_TIER_META[tier].label} vào túi đồ!`, "success");
    } catch (err) {
      console.error(err);
      showToast("Cấp Key test thất bại!", "error");
    }
  };

  const unlockedCharacterNames = characters.filter((c) => unlockedIds.includes(c.id)).map((c) => c.name);

  // --- TÁCH ARRAY ĐỂ HIỂN THỊ 2 KHU VỰC RIÊNG BIỆT ---
  const inProgressChars = filteredCharacters.filter(c => (c as CharacterExt).status === "in-progress");
  const regularChars = filteredCharacters.filter(c => (c as CharacterExt).status !== "in-progress");

  // --- HÀM RENDER CHUNG CHO THẺ NHÂN VẬT ---
  const renderCharacterCard = (char: Character) => {
    const ext = char as CharacterExt;
    const hasKeyGate = !!ext.requiredKeyTier && ext.requiredKeyTier !== "public-link";
    const isPublicLink = ext.requiredKeyTier === "public-link";
    const isKeyUnlocked = hasKeyGate && unlockedIds.includes(char.id);

    return (
      <motion.div
        key={char.id}
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.4 }}
        className="relative p-6 rounded-[32px] character-card-panel hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 flex flex-col items-center text-center group"
      >
        {isAdmin && (
          <div className="absolute top-4 right-4 flex gap-1.5 z-10">
            <button onClick={() => handleStartEdit(char)} className="p-1.5 rounded-full bg-white/60 hover:bg-white text-purple-600 transition-colors shadow-sm" title="Chỉnh sửa">
              <Edit2 className="w-3 h-3" />
            </button>
            <button onClick={() => handleDeleteCharacter(char.id, char.name)} className="p-1.5 rounded-full bg-white/60 hover:bg-rose-50 text-rose-600 transition-colors shadow-sm" title="Xóa">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="relative w-32 h-32 mb-4 select-none">
          {/* 2 animation vô hạn (wave-rotate blur + liquid-border) — nhân theo
              số lượng thẻ hiển thị cùng lúc, đây là điểm gây lag nặng nhất trên
              mobile. Tắt hẳn trên mobile, thay bằng viền tĩnh đơn giản. */}
          {!isMobile && (
            <>
              <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-green-300 via-pink-300 to-purple-300 blur-sm animate-wave-rotate opacity-75" />
              <div className="absolute -inset-1 rounded-full liquid-border opacity-90" />
            </>
          )}
          {isMobile && (
            <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-green-300 via-pink-300 to-purple-300 opacity-70" />
          )}
          <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-white bg-slate-100 z-10 shadow-inner">
            <img src={char.avatar} alt={char.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
          </div>
        </div>

        <h3 className="text-lg font-bold text-slate-800 font-display group-hover:text-pink-600 transition-colors">{char.name}</h3>
        <p className="text-[11px] text-slate-600 font-medium px-4 mt-1 mb-2 h-8 overflow-hidden line-clamp-2">{char.role}</p>

        <div className="flex flex-col items-center gap-1.5 mb-3 max-w-full">
          {ext.status && (() => {
            const meta = CHARACTER_STATUS_META[ext.status!];
            const Icon = meta.icon;
            return (
              <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[9px] font-bold max-w-full ${meta.badge}`}>
                <Icon className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{meta.shortLabel}</span>
              </div>
            );
          })()}

          {hasKeyGate && (
            <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[9px] font-bold max-w-full ${isKeyUnlocked ? "text-emerald-600 bg-emerald-50 border-emerald-200" : KEY_TIER_META[ext.requiredKeyTier as KeyTier].badge}`}>
              {isKeyUnlocked ? <Unlock className="w-3 h-3 flex-shrink-0" /> : <Lock className="w-3 h-3 flex-shrink-0" />}
              <span className="truncate">
                {isKeyUnlocked ? "Đã mở khoá" : `${KEY_TIER_META[ext.requiredKeyTier as KeyTier].emoji} Cần Key ${KEY_TIER_META[ext.requiredKeyTier as KeyTier].label}`}
              </span>
            </div>
          )}

          {isPublicLink && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[9px] font-bold max-w-full text-indigo-600 bg-indigo-50 border-indigo-200">
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">ĐÃ CÓ LINK</span>
            </div>
          )}

          {ext.hiddenFile && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[9px] font-bold max-w-full text-slate-600 bg-slate-100 border-slate-300">
              <FileLock2 className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">CÓ FILE ẨN</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1 justify-center mb-4">
          {char.tags.map((t, i) => (
            <span
              key={t}
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                i % 2 === 0
                  ? "bg-white/70 text-pink-700 border-pink-200/70"
                  : "bg-white/70 text-purple-700 border-purple-200/70"
              }`}
            >
              #{t}
            </span>
          ))}
        </div>

        <div className="flex w-full justify-between items-center mt-auto pt-3 border-t border-white/20">
          <button onClick={() => handleViewCharacter(char)} className="text-[10px] font-bold px-4 py-2 bg-white/30 hover:bg-white/60 rounded-full uppercase tracking-wider text-slate-700 transition-colors flex items-center gap-1 border border-white/50">
            <Eye className="w-3 h-3 text-pink-400" />
            Chi tiết
          </button>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-slate-400" title="Lượt xem Chi tiết">
              <Eye className="w-3 h-3" />
              <span className="text-xs font-bold">{ext.views || 0}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <motion.button onClick={(e) => handleLike(char, e)} className="text-pink-500 hover:text-pink-600 hover:scale-125 transition-transform" whileTap={{ scale: 1.5, rotate: [0, -15, 15, 0] }}>
                <Heart className="w-4 h-4 fill-pink-500 hover:fill-pink-600 filter drop-shadow-sm" />
              </motion.button>
              <span className="text-xs font-bold text-pink-600">{char.likes >= 1000 ? `${(char.likes / 1000).toFixed(1)}k` : char.likes}</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // ==================================================================
  // TRANG CHI TIẾT NHÂN VẬT — "BENTO SCRAPBOOK"
  // Không có background màu riêng: dùng nền trắng/pastel sạch, các khối
  // hơi lệch góc như dán ảnh thủ công vào sổ tay. Khối Mở Khoá (Key/Public
  // Link/File Ẩn) hiện NGAY DƯỚI hồ sơ dạng viên thuốc bấm được, không còn
  // ẩn trong khung riêng hay nằm cuối trang.
  // ==================================================================
  if (selectedCharacter) {
    const ext = selectedCharacter as CharacterExt;
    const hasKeyGate = !!ext.requiredKeyTier && ext.requiredKeyTier !== "public-link";
    const isPublicLink = ext.requiredKeyTier === "public-link";
    const tier = hasKeyGate ? (ext.requiredKeyTier as KeyTier) : null;
    const tierMeta = tier ? KEY_TIER_META[tier] : null;
    const isKeyUnlocked = hasKeyGate && unlockedIds.includes(selectedCharacter.id);
    const availableCount = tier ? (userKeys[tier] || 0) : 0;
    const galleryImages = ext.gallery || [];
    const heroImage = galleryImages[0];
    const smallImages = galleryImages.slice(1, 3);
    const extraImages = galleryImages.slice(3);

    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-8 z-10 relative">
        {/* Nút quay về */}
        <button
          onClick={() => setSelectedCharacter(null)}
          className="mb-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-purple-100 text-slate-500 text-xs font-bold hover:bg-purple-50/70 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Quay về khu vườn
        </button>

        {isAdmin && (hasKeyGate || isPublicLink) && (
          <div className="flex items-center justify-center gap-4 mb-4 text-[10px] font-bold text-slate-500">
            <span className="flex items-center gap-1">
              <MousePointerClick className="w-3.5 h-3.5 text-purple-400" /> {ext.linkClicks || 0} lượt bấm link
            </span>
            {hasKeyGate && (
              <span className="flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-pink-400" /> {ext.keyRedeemCount || 0} lượt đổi Key
              </span>
            )}
          </div>
        )}

        {/* ---------- Hồ sơ: avatar tròn dán lệch góc + tên + trạng thái + tag + chỉ số ---------- */}
        <div className="pl-1.5 mb-4">
          <div className="flex items-end gap-3.5">
            <div className="relative w-[78px] h-[78px] min-w-[78px] rounded-full overflow-hidden border-[3px] border-white shadow-[0_10px_24px_rgba(150,120,180,0.25)] -rotate-[4deg]">
              <img src={selectedCharacter.avatar} alt={selectedCharacter.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="pb-1">
              <h1 className="font-display text-2xl font-bold text-[#3a3348] leading-tight">{selectedCharacter.name}</h1>
              <p className="text-[11px] text-[#8f88a0] mt-0.5">{selectedCharacter.role}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {ext.status && (() => {
              const meta = CHARACTER_STATUS_META[ext.status!];
              const Icon = meta.icon;
              return (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold ${meta.badge}`}>
                  <Icon className="w-3 h-3" />
                  <span>{meta.label}</span>
                  {ext.status === "locked" && ext.statusReason && (
                    <span className="font-normal italic opacity-80">· {ext.statusReason}</span>
                  )}
                </span>
              );
            })()}

            {selectedCharacter.tags.map((t, i) => (
              <span key={t} className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${TAG_STYLES[i % TAG_STYLES.length]}`}>
                #{t}
              </span>
            ))}

            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border bg-white text-slate-500 border-slate-200 flex items-center gap-1">
              <Eye className="w-3 h-3" /> {ext.views || 0} lượt ghé qua
            </span>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border bg-pink-50/70 text-pink-600 border-pink-200/70 flex items-center gap-1">
              <Heart className="w-3 h-3 fill-pink-500 text-pink-500" /> {selectedCharacter.likes} lượt thích
            </span>
          </div>
        </div>

        {/* ---------- MỞ KHOÁ — viên thuốc ngang, không khung, ngay dưới hồ sơ ---------- */}
        {(hasKeyGate || isPublicLink || !!ext.hiddenFile) && (
          <div className="flex flex-wrap gap-2 justify-center mb-2">
            {isPublicLink && ext.unlockRewardLink && (
              <a
                href={ext.unlockRewardLink}
                target="_blank"
                rel="noreferrer"
                onClick={() => handleLinkClick(selectedCharacter)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[11px] font-extrabold text-slate-700 bg-[#F8F5FC] hover:bg-purple-100 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-purple-500" />
                Nhận Link Ngay
              </a>
            )}

            {hasKeyGate && tierMeta && (
              isKeyUnlocked ? (
                <>
                  <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[11px] font-extrabold text-slate-700 bg-[#F8F5FC]">
                    <KeyRound className="w-3.5 h-3.5" style={{ color: KEY_TIER_ICON_COLOR[tier as KeyTier] }} />
                    {tierMeta.emoji} Key {tierMeta.label} · Đã mở khoá
                  </span>
                  {ext.unlockRewardLink && (
                    <a
                      href={ext.unlockRewardLink}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => handleLinkClick(selectedCharacter)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[11px] font-extrabold text-slate-700 bg-[#F8F5FC] hover:bg-purple-100 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-purple-500" />
                      Nhận Link Ngay
                    </a>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => handleUnlockWithKey(selectedCharacter)}
                  disabled={availableCount < 1 || unlockingId === selectedCharacter.id}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[11px] font-extrabold text-slate-700 bg-[#F8F5FC] hover:bg-purple-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5" style={{ color: KEY_TIER_ICON_COLOR[tier as KeyTier] }} />
                  {unlockingId === selectedCharacter.id
                    ? "Đang mở..."
                    : `${tierMeta.emoji} Dùng Key ${tierMeta.label} (${availableCount})`}
                </button>
              )
            )}

            {ext.hiddenFile && (
              <button
                type="button"
                onClick={() => setShowHiddenUnlock((v) => !v)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[11px] font-extrabold text-white bg-[#3a3348] hover:opacity-90 transition-opacity"
              >
                <FileLock2 className="w-3.5 h-3.5" />
                {hiddenUnlocked ? "File Ẩn (đã giải mã)" : "File Ẩn — Giải mã"}
              </button>
            )}
          </div>
        )}

        {hasKeyGate && !isKeyUnlocked && availableCount < 1 && tierMeta && (
          <p className="text-center text-[10px] text-slate-400 italic mb-3">
            Giữ chuỗi Manifest {tierMeta.threshold} ngày rồi đổi Key ở trang Manifest nhé!
          </p>
        )}

        {/* Khung nhập mật khẩu File Ẩn — hiện khi bấm viên thuốc, ẩn khi đã giải mã */}
        <AnimatePresence>
          {ext.hiddenFile && showHiddenUnlock && !hiddenUnlocked && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="rounded-2xl border border-purple-200/50 bg-white p-4 flex flex-col gap-2.5 max-w-sm mx-auto">
                {ext.hiddenFile.question && (
                  <p className="text-xs text-slate-600 flex items-start gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-purple-400" />
                    <span>{ext.hiddenFile.question}</span>
                  </p>
                )}
                <input
                  type="password"
                  value={hiddenPasswordInput}
                  onChange={(e) => { setHiddenPasswordInput(e.target.value); setHiddenError(false); }}
                  onKeyDown={(e) => e.key === "Enter" && handleTryHiddenPassword()}
                  placeholder="Nhập đáp án / mật khẩu..."
                  className={`bg-white border rounded-xl px-3 py-2 text-xs outline-none ${hiddenError ? "border-rose-300" : "border-purple-200"}`}
                />
                {hiddenError && <span className="text-[10px] text-rose-500 font-bold">Sai mật khẩu, thử lại nhé!</span>}
                <button
                  type="button"
                  onClick={handleTryHiddenPassword}
                  className="self-end px-4 py-1.5 rounded-full text-[10px] font-bold text-white transition-transform hover:scale-105"
                  style={{ background: `linear-gradient(90deg, ${BRAND_GREEN}, ${BRAND_PINK}, ${BRAND_LAVENDER})`, color: "#3f2d45" }}
                >
                  Giải Mã
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {ext.hiddenFile && hiddenUnlocked && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-purple-200/50 bg-white p-4 mb-4 max-w-sm mx-auto">
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">Nội dung File Ẩn</p>
              <p className="text-sm leading-loose whitespace-pre-line text-slate-700 font-medium">{ext.hiddenFile.content}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------- LƯỚI BENTO: ảnh vibe to/nhỏ dán lệch góc ---------- */}
        {galleryImages.length > 0 && (
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            {heroImage && (
              <div className={`${smallImages.length > 0 ? "row-span-2" : "col-span-2"} rounded-[24px] overflow-hidden -rotate-[1.5deg] shadow-[0_10px_26px_rgba(150,120,180,0.18)]`}>
                <img src={heroImage.url} alt={heroImage.caption || selectedCharacter.name} className="w-full h-full object-cover aspect-square" referrerPolicy="no-referrer" />
              </div>
            )}

            {smallImages.map((img, i) => (
              <div
                key={img.id}
                className={`aspect-square rounded-[20px] overflow-hidden shadow-[0_8px_20px_rgba(150,120,180,0.15)] ${i % 2 === 0 ? "rotate-[2deg]" : "-rotate-[2deg]"}`}
              >
                <img src={img.url} alt={img.caption || selectedCharacter.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            ))}

            {extraImages.length > 0 && (
              <div className="col-span-2 grid grid-cols-4 gap-2">
                {extraImages.map((img, i) => (
                  <div key={img.id} className={`aspect-square rounded-2xl overflow-hidden shadow-sm ${i % 2 === 0 ? "rotate-1" : "-rotate-1"}`}>
                    <img src={img.url} alt={img.caption || selectedCharacter.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---------- PLOT ---------- */}
        <div className="bg-white border border-[#EFE8F5] rounded-[22px] p-5 md:p-6 rotate-[0.5deg] shadow-[0_8px_22px_rgba(150,120,180,0.12)] mb-3">
          <h4 className="text-[10px] uppercase tracking-widest font-bold text-purple-400 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            PLOT: CỐT TRUYỆN CHÍNH
          </h4>
          <div className="text-sm leading-loose whitespace-pre-line text-[#4a4356] font-medium">
            {selectedCharacter.plot}
          </div>
        </div>

        {/* ---------- Mạch truyện bổ sung — thẻ washi-tape, bấm để xoè từng mục ---------- */}
        {ext.storyArcs && ext.storyArcs.length > 0 && (
          <div className="bg-white border border-[#EFE8F5] rounded-[22px] p-4 -rotate-[0.5deg] shadow-[0_8px_22px_rgba(150,120,180,0.12)] mb-3">
            <p className="text-[11px] font-extrabold text-[#3a3348] flex items-center gap-1.5 mb-1">
              <BookOpen className="w-3.5 h-3.5 text-purple-400" />
              Mạch Truyện Bổ Sung
            </p>
            <div className="flex flex-col">
              {ext.storyArcs.map((arc) => {
                const isOpen = openArcIds.includes(arc.id);
                return (
                  <div key={arc.id}>
                    <button
                      type="button"
                      onClick={() => toggleStoryArc(arc.id)}
                      className="w-full flex items-center justify-between py-2.5 border-t border-dashed border-[#EFE8F5] first:border-t-0"
                    >
                      <span className="text-xs font-bold text-slate-700 text-left">{arc.title}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isOpen && (
                      <p className="text-xs leading-relaxed text-slate-500 pb-3 whitespace-pre-line">{arc.content}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 z-10 flex flex-col gap-6 relative">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-2xl font-display text-white text-glow-pearl flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-pink-400 animate-spin-slow" />
          Bản Thảo Đang Chờ Bạn
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
            <button onClick={() => { setShowForm(!showForm); if (showForm) setEditingId(null); }} className="px-4 py-2 bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 text-white rounded-full text-xs font-bold shadow-md hover:scale-105 transition-all flex items-center gap-1.5">
              {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {showForm ? "Đóng Form" : "Gieo mầm nhân vật"}
            </button>
          )}
        </div>
      </div>

      <div id="filter-tags-container" className="w-full overflow-x-auto hide-scrollbar flex gap-2 pb-2 border-b border-white/20">
        {allTags.map((tag) => (
          <button key={tag} onClick={() => setActiveFilter(tag)} className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all whitespace-nowrap ${activeFilter === tag ? "bg-pink-400 text-white shadow-md shadow-pink-100" : "bg-white/20 hover:bg-white/40 text-slate-700"}`}>
            #{tag}
          </button>
        ))}
      </div>

      {/* ========================================================= */}
      {/* KHU VỰC 1: ĐANG TIẾN HÀNH (SNEAK PEEK)                    */}
      {/* ========================================================= */}
      {inProgressChars.length > 0 && (
        <div className="mb-10 w-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-indigo-400/70" />
            <h3 className="text-lg md:text-xl font-display font-extrabold bg-gradient-to-r from-indigo-700 via-purple-700 to-blue-800 bg-clip-text text-transparent flex items-center gap-2 drop-shadow-[0_2px_4px_rgba(255,255,255,0.8)] uppercase tracking-wider">
              <Milestone className="w-5 h-5 text-indigo-700 animate-bounce" />
              Đang Thai Nghén Plot
            </h3>
            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-indigo-400/70" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence>
              {inProgressChars.map(renderCharacterCard)}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* KHU VỰC 2: DÀN NHÂN VẬT CHÍNH (HOÀN THÀNH / ĐÃ KHOÁ)      */}
      {/* ========================================================= */}
      <div className="w-full">
        {inProgressChars.length > 0 && regularChars.length > 0 && (
          <div className="flex items-center gap-3 mb-6 mt-4">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-indigo-400/70" />
            <h3 className="text-lg md:text-xl font-display font-extrabold bg-gradient-to-r from-indigo-700 via-purple-700 to-blue-800 bg-clip-text text-transparent flex items-center gap-2 drop-shadow-[0_2px_4px_rgba(255,255,255,0.8)] uppercase tracking-wider">
              <Sparkles className="w-5 h-5 text-indigo-700" />
              Dàn Con Cưng Chính thức
            </h3>
            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-indigo-400/70" />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence>
            {regularChars.map(renderCharacterCard)}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showForm && isAdmin && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => { setShowForm(false); setEditingId(null); }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white/95 backdrop-blur-xl border border-white/60 p-6 md:p-8 rounded-[32px] shadow-2xl max-w-2xl w-full text-slate-800 relative max-h-[90vh] overflow-y-auto custom-scroll" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all hover:scale-110 shadow-sm">
                <X className="w-4 h-4" />
              </button>

              <form onSubmit={handleSaveCharacter} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2 text-center border-b border-pink-100 pb-3">
                  <h3 className="text-lg font-bold text-pink-600 flex items-center justify-center gap-1.5 font-display pr-6">
                    🌸 {editingId ? "Hiệu Chỉnh Nhân Vật" : "Tạo Nhân Vật Mới"}
                  </h3>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600">Tên Nhân Vật</label>
                  <input type="text" required placeholder="Ví dụ: Aria Moonlight" value={formName} onChange={(e) => setFormName(e.target.value)} className="bg-slate-50 border border-pink-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600">Danh Hiệu / Vai Trò</label>
                  <input type="text" required placeholder="Ví dụ: Guardian of soft dreams" value={formRole} onChange={(e) => setFormRole(e.target.value)} className="bg-slate-50 border border-pink-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600">Thẻ Nhận Diện (ngăn cách bằng dấu phẩy)</label>
                  <input type="text" placeholder="Ví dụ: Luna, Whisper, Dream" value={formTags} onChange={(e) => setFormTags(e.target.value)} className="bg-slate-50 border border-pink-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white" />
                </div>

                <div className="flex flex-col gap-1.5 relative">
                  <label className="text-xs font-bold text-slate-600">Avatar đại diện (cắt tỉa khung tròn)</label>
                  <div className="flex gap-2">
                    <input type="text" placeholder="URL ảnh hoặc tải lên file" value={formAvatar} onChange={(e) => setFormAvatar(e.target.value)} className="bg-slate-50 border border-pink-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white flex-1" />
                    <button type="button" onClick={handlePickAvatarFile} disabled={uploadingAvatar} className="bg-pink-100 hover:bg-pink-200 text-pink-700 px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 shadow-sm disabled:opacity-50 whitespace-nowrap">
                      <Upload className="w-3.5 h-3.5" /> {uploadingAvatar ? "Đang tải..." : "Tải & Cắt ảnh"}
                    </button>
                    <input ref={avatarFileInputRef} type="file" accept="image/*" onChange={handleAvatarFileChosen} className="hidden" />
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600">Cốt truyện phiêu lưu (Plot)</label>
                  <textarea required rows={4} placeholder="Kể chi tiết về câu chuyện, tiểu sử kỳ diệu của nhân vật..." value={formPlot} onChange={(e) => setFormPlot(e.target.value)} className="bg-slate-50 border border-pink-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white resize-none" />
                </div>

                <div className="col-span-1 md:col-span-2 flex flex-col gap-2 pt-3 border-t border-pink-100">
                  <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-400" /> Trạng Thái Tiến Độ Nhân Vật
                  </label>
                  <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as CharacterStatus)} className="bg-slate-50 border border-pink-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white">
                    <option value="in-progress">Đang tiến hành</option>
                    <option value="unlocked">Đã hoàn thành</option>
                    <option value="locked">Đã khoá</option>
                  </select>
                  {formStatus === "locked" && (
                    <input type="text" placeholder="Lý do khoá (ví dụ: đang cập nhật...)" value={formStatusReason} onChange={(e) => setFormStatusReason(e.target.value)} className="bg-slate-50 border border-pink-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white" />
                  )}
                </div>

                {/* Yêu cầu Key hoặc Public Link */}
                <div className="col-span-1 md:col-span-2 flex flex-col gap-2 pt-3 border-t border-pink-100">
                  <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-purple-400" /> Cài đặt Mở Khoá / Public Link
                  </label>
                  <select value={formRequiredKeyTier} onChange={(e) => setFormRequiredKeyTier(e.target.value as KeyTier | "public-link" | "")} className="bg-slate-50 border border-pink-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white">
                    <option value="">Không yêu cầu (Mở tự do / Bình thường)</option>
                    <option value="public-link">🌐 Public Link (Không cần Key - Hiện nút Nhận Link ở Profile)</option>
                    {KEY_TIER_ORDER.map((tier) => (
                      <option key={tier} value={tier}>🔒 Cần Key {KEY_TIER_META[tier].label} ({KEY_TIER_META[tier].threshold} ngày streak)</option>
                    ))}
                  </select>
                  {formRequiredKeyTier && (
                    <input type="text" placeholder={formRequiredKeyTier === "public-link" ? "Nhập link trỏ tới character (Google Drive, Byvn, Discord,...)" : "Link phần thưởng khi user dùng Key mở khoá..."} value={formUnlockRewardLink} onChange={(e) => setFormUnlockRewardLink(e.target.value)} className="bg-slate-50 border border-pink-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white" />
                  )}
                </div>

                {/* File Ẩn — yêu cầu mật khẩu/đáp án để xem nội dung */}
                <div className="col-span-1 md:col-span-2 flex flex-col gap-2 pt-3 border-t border-pink-100">
                  <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                    <FileLock2 className="w-3.5 h-3.5 text-purple-400" /> File Ẩn (yêu cầu mật khẩu để xem)
                  </label>
                  <p className="text-[9px] text-slate-400 -mt-1">Để trống mật khẩu = nhân vật này không có File Ẩn.</p>
                  <input type="text" placeholder="Câu hỏi gợi ý (tuỳ chọn, vd: Đáp án là ngày sinh nhân vật?)" value={formHiddenQuestion} onChange={(e) => setFormHiddenQuestion(e.target.value)} className="bg-slate-50 border border-pink-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white" />
                  <input type="text" placeholder="Mật khẩu / đáp án" value={formHiddenPassword} onChange={(e) => setFormHiddenPassword(e.target.value)} className="bg-slate-50 border border-pink-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white" />
                  <textarea rows={4} placeholder="Nội dung truyện ẩn..." value={formHiddenContent} onChange={(e) => setFormHiddenContent(e.target.value)} className="bg-slate-50 border border-pink-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white resize-none" />
                </div>

                <div className="col-span-1 md:col-span-2 flex flex-col gap-2 pt-3 border-t border-pink-100">
                  <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-purple-400" /> Mạch Truyện Bổ Sung (Ngoại truyện)
                  </label>
                  <input type="text" placeholder="Tên mạch truyện / ngoại truyện" value={arcTitle} onChange={(e) => setArcTitle(e.target.value)} className="bg-slate-50 border border-pink-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white" />
                  <textarea rows={3} placeholder="Nội dung ngoại truyện..." value={arcContent} onChange={(e) => setArcContent(e.target.value)} className="bg-slate-50 border border-pink-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white resize-none" />
                  <button type="button" onClick={handleAddStoryArc} className="self-start px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Thêm mạch truyện
                  </button>
                  {formStoryArcs.length > 0 && (
                    <div className="flex flex-col gap-1.5 mt-1">
                      {formStoryArcs.map((arc) => (
                        <div key={arc.id} className="flex items-start gap-2 px-3 py-2 rounded-xl border border-purple-100 bg-purple-50/50 text-[11px]">
                          <BookOpen className="w-3 h-3 flex-shrink-0 mt-0.5 text-purple-400" />
                          <div className="flex-1">
                            <p className="font-bold text-slate-700">{arc.title}</p>
                            <p className="text-slate-500 line-clamp-2">{arc.content}</p>
                          </div>
                          <button type="button" onClick={() => handleRemoveStoryArc(arc.id)} className="hover:scale-110 transition-transform text-slate-400 hover:text-rose-500">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="col-span-1 md:col-span-2 flex flex-col gap-2 pt-3 border-t border-pink-100">
                  <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                    <Images className="w-3.5 h-3.5 text-purple-400" /> Vibe Gallery (Bộ Ảnh Phong Cách)
                  </label>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Chú thích cho ảnh chuẩn bị up (tuỳ chọn)" value={galleryCaption} onChange={(e) => setGalleryCaption(e.target.value)} className="bg-slate-50 border border-pink-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white flex-1" />
                    <button type="button" onClick={handlePickGalleryFile} disabled={uploadingGalleryImage} className="bg-pink-100 hover:bg-pink-200 text-pink-700 px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 whitespace-nowrap shadow-sm disabled:opacity-50">
                      <Upload className="w-3.5 h-3.5" /> {uploadingGalleryImage ? "Đang tải..." : "Thêm ảnh & Cắt"}
                    </button>
                    <input ref={galleryFileInputRef} type="file" accept="image/*" onChange={handleGalleryFileChosen} className="hidden" />
                  </div>
                  <p className="text-[9px] text-slate-400 -mt-1">Thêm từng ảnh một để tự cắt riêng cho mỗi tấm nhé.</p>
                  {formGallery.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-1">
                      {formGallery.map((img) => (
                        <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border border-pink-200 group">
                          <img src={img.url} alt={img.caption || "vibe"} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <button type="button" onClick={() => handleRemoveGalleryImage(img.id)} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Trash2 className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {formAvatar && (
                  <div className="col-span-1 md:col-span-2 flex flex-col items-center justify-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Preview Avatar</span>
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-pink-300">
                      <img src={formAvatar} alt="preview" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}

                <div className="col-span-1 md:col-span-2 flex gap-3 justify-end mt-2">
                  <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all">
                    Hủy bỏ
                  </button>
                  <button type="submit" className="px-5 py-2 bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md">
                    <Save className="w-3.5 h-3.5" /> Lưu Nhân Vật
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Túi Đồ Modal */}
      <AnimatePresence>
        {showInventory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md" onClick={() => setShowInventory(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white/80 backdrop-blur-xl border border-white/60 p-6 rounded-[32px] shadow-2xl max-w-md w-full text-slate-800 relative max-h-[85vh] overflow-y-auto custom-scroll" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowInventory(false)} className="absolute top-4 right-4 p-2 rounded-full bg-white/50 hover:bg-white text-slate-700 transition-all hover:scale-110 shadow-sm">
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-1">
                <Backpack className="w-5 h-5 text-purple-500" /> Túi Đồ Của Bạn
              </h3>

              {!currentUser ? (
                <p className="text-xs text-slate-500 mt-4">Vui lòng đăng nhập để xem túi đồ và tích luỹ Key nhé!</p>
              ) : (
                <>
                  <p className="text-[10px] text-slate-500 mb-4">Đổi thêm Key tại trang Manifest bằng cách giữ chuỗi manifest.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {KEY_TIER_ORDER.map((tier) => {
                      const meta = KEY_TIER_META[tier];
                      const count = userKeys[tier] || 0;
                      return (
                        <div key={tier} className={`rounded-2xl border p-3 flex flex-col items-center gap-1 ${meta.badge}`}>
                          <span className="text-2xl">{meta.emoji}</span>
                          <span className="text-[11px] font-bold">Key {meta.label}</span>
                          <span className="text-lg font-bold">x{count}</span>
                        </div>
                      );
                    })}
                  </div>

                  {isAdmin && (
                    <div className="mt-5 pt-4 border-t border-dashed border-purple-200">
                      <h4 className="text-xs font-bold text-purple-600 mb-1 flex items-center gap-1.5">🛠️ Cấp Key Test (Chỉ Admin)</h4>
                      <p className="text-[10px] text-slate-500 mb-2">Dùng để tự test, không cần giữ streak thật.</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {KEY_TIER_ORDER.map((tier) => (
                          <button key={tier} type="button" onClick={() => handleAdminGrantKey(tier)} className="flex flex-col items-center gap-0.5 px-1.5 py-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[9px] font-bold transition-colors">
                            <span className="text-base">{KEY_TIER_META[tier].emoji}</span>+1 {KEY_TIER_META[tier].label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {unlockedCharacterNames.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-slate-200">
                      <h4 className="text-xs font-bold text-slate-600 mb-2">Nhân vật đã mở khoá bằng Key</h4>
                      <ul className="flex flex-col gap-1">
                        {unlockedCharacterNames.map((name) => (
                          <li key={name} className="text-xs text-slate-600 flex items-center gap-1.5">
                            <Unlock className="w-3 h-3 text-emerald-500" /> {name}
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

      <AnimatePresence>
        {cropSrc && (
          <ImageCropModal
            imageSrc={cropSrc}
            aspect={1}
            cropShape="round"
            onCancel={handleCropCancel}
            onCropDone={handleCropDone}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
