import React, { useState, useEffect, useRef, memo } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { Character, UserProfile, KeyTier, UserKeys } from "../types";
import { Sparkles, Flower2, Lock, ShoppingBag, X, Clock, Star, Info, Gift } from "lucide-react";

// ============================================================================
// GHI CHÚ RÁP FIRESTORE:
// - Component này giả định UserProfile CHƯA có sẵn field `petals` (Cánh Hoa)
//   và `garden` (trạng thái vườn) trong types.ts, nên em mở rộng cục bộ bằng
//   `UserProfileExt` (giống hệt cách CharacterSection.tsx mở rộng CharacterExt).
// - Lưu trực tiếp vào users/{userId} bằng setDoc({ merge: true })
//
// GHI CHÚ MÃ QUÀ TẶNG:
// - Đọc từ collection Firestore riêng `giftCodes/{code}` (không hard-code
//   trong source) để chị tự tạo/đổi mã ngay trên Firebase Console. Cấu trúc
//   1 document mẫu cho mã chào mừng user mới:
//     Collection: giftCodes
//     Document ID: WELCOME   (chị đặt tên mã tuỳ ý, viết hoa cho đồng nhất)
//     Fields: streak: 15 (number) · petals: 8 (number) · active: true (boolean)
// - Mỗi user chỉ đổi được 1 mã 1 lần, lưu vết qua `redeemedGiftCodes` trên
//   chính user doc.
// ============================================================================

interface GardenPlotState {
  seedType: "common" | "rare" | "epic";
  plantedAt: number;
}

interface GardenState {
  commonPlot: GardenPlotState | null;
  shopPlots: (GardenPlotState | null)[];
  lastFreeSeedDate: string; // "YYYY-MM-DD"
}

type UserProfileExt = UserProfile & {
  petals?: number;
  garden?: GardenState;
  streak?: number;
  redeemedGiftCodes?: string[];
};

interface FlowerGardenSectionProps {
  currentUser: UserProfile | null;
  onUpdateUser: (updatedUser: UserProfile) => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

const EMPTY_GARDEN: GardenState = {
  commonPlot: null,
  shopPlots: [null, null],
  lastFreeSeedDate: "",
};

const SEED_TYPES: Record<
  "common" | "rare" | "epic",
  { label: string; subLabel: string; cost: number; duration: number; stemColor: string; petalColor: string }
> = {
  common: {
    label: "Hạt Thường",
    subLabel: "Miễn phí · 1 lượt/ngày",
    cost: 0,
    duration: 6000,
    stemColor: "#86efac",
    petalColor: "#f9a8d4",
  },
  rare: {
    label: "Hoa Hiếm",
    subLabel: "Cơ hội nhận Key Bạc & Vàng", // Đã ẩn phần trăm
    cost: 3,
    duration: 10000,
    stemColor: "#93c5fd",
    petalColor: "#c4b5fd",
  },
  epic: {
    label: "Hoa Cực Hiếm",
    subLabel: "Cơ hội nhận Key Vàng & Kim Cương", // Đã ẩn phần trăm
    cost: 4,
    duration: 13000,
    stemColor: "#fda4af",
    petalColor: "#f4436c",
  },
};

const PETAL_ANGLES = [0, 60, 120, 180, 240, 300];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function rollHarvest(seedType: "common" | "rare" | "epic") {
  const r = Math.random() * 100;
  if (seedType === "common") return { streak: 1, petals: 1, key: null as KeyTier | null };
  if (seedType === "rare") {
    if (r < 15) return { streak: 0, petals: 0, key: "silver" as KeyTier | null };
    if (r < 20) return { streak: 0, petals: 0, key: "gold" as KeyTier | null };
    return { streak: 2, petals: 0, key: null as KeyTier | null };
  }
  if (r < 20) return { streak: 0, petals: 0, key: "gold" as KeyTier | null };
  if (r < 25) return { streak: 0, petals: 0, key: "diamond" as KeyTier | null };
  return { streak: 2, petals: 0, key: null as KeyTier | null };
}

const KEY_META: Record<KeyTier, { label: string; emoji: string; color: string }> = {
  bronze: { label: "Key Đồng", emoji: "🥉", color: "text-orange-700" },
  silver: { label: "Key Bạc", emoji: "🥈", color: "text-slate-600" },
  gold: { label: "Key Vàng", emoji: "🥇", color: "text-amber-600" },
  diamond: { label: "Key Kim Cương", emoji: "💎", color: "text-cyan-600" },
};

// ---- Cây hoa "sống" — animation hoàn toàn bằng CSS transition ----
const LivingPlant = memo(function LivingPlant({
  seedType,
  grown,
  ready,
}: {
  seedType: "common" | "rare" | "epic";
  grown: boolean;
  ready: boolean;
}) {
  const meta = SEED_TYPES[seedType];
  const stemDuration = meta.duration;
  const petalDuration = Math.round(meta.duration * 0.35);
  const petalDelay = Math.round(meta.duration * 0.6);

  return (
    <div className="relative flex flex-col items-center justify-end" style={{ width: 84, height: 100 }}>
      {/* Hoa / nụ ở đỉnh thân */}
      <div className="relative" style={{ marginBottom: -4, width: 60, height: 60 }}>
        {PETAL_ANGLES.map((angle, i) => (
          <div
            key={i}
            className="absolute top-1/2 left-1/2 rounded-full will-change-transform"
            style={{
              width: 15,
              height: 21,
              background: meta.petalColor,
              borderRadius: "50% 50% 50% 50% / 65% 65% 35% 35%",
              opacity: grown ? 1 : 0,
              transform: `translate(-50%, -50%) rotate(${angle}deg) ${
                grown ? "translateY(-18px) scale(1.15)" : "translateY(-4px) scale(0.25)"
              }`,
              transition: `transform ${petalDuration}ms ease-out ${petalDelay}ms, opacity ${petalDuration}ms ease-out ${petalDelay}ms`,
              boxShadow: ready ? `0 0 10px ${meta.petalColor}55` : "none",
            }}
          />
        ))}
        {/* Nhuỵ hoa */}
        <div
          className="absolute top-1/2 left-1/2 rounded-full bg-amber-300 will-change-transform"
          style={{
            width: 14,
            height: 14,
            transform: `translate(-50%, -50%) scale(${grown ? 1 : 0})`,
            opacity: grown ? 1 : 0,
            transition: `transform ${petalDuration}ms ease-out ${petalDelay}ms, opacity ${petalDuration}ms ease-out ${petalDelay}ms`,
          }}
        />
        {/* Nụ khép */}
        <div
          className="absolute top-1/2 left-1/2 will-change-transform"
          style={{
            width: 16,
            height: 22,
            background: meta.petalColor,
            borderRadius: "50% 50% 50% 50% / 65% 65% 35% 35%",
            transform: `translate(-50%, -60%) scale(${grown ? 1.1 : 0.45})`,
            opacity: grown ? 0 : 1,
            transition: `transform ${stemDuration}ms ease-out, opacity ${Math.round(stemDuration * 0.25)}ms ease-in ${petalDelay}ms`,
          }}
        />
      </div>

      {/* Thân */}
      <div className="relative flex items-end justify-center" style={{ height: 60, width: 4 }}>
        <div
          className="w-[3px] rounded-full origin-bottom will-change-transform"
          style={{
            height: 60,
            background: `linear-gradient(to top, ${meta.stemColor}, ${meta.stemColor}cc)`,
            transform: `scaleY(${grown ? 1 : 0.22})`,
            transition: `transform ${stemDuration}ms ease-out`,
          }}
        />
        <div
          className="absolute rounded-full origin-right will-change-transform"
          style={{
            left: -1,
            bottom: 20,
            width: 16,
            height: 8,
            background: meta.stemColor,
            borderRadius: "0% 100% 0% 100%",
            transform: `rotate(20deg) scale(${grown ? 1 : 0})`,
            opacity: grown ? 1 : 0,
            transition: `transform ${Math.round(stemDuration * 0.4)}ms ease-out ${Math.round(stemDuration * 0.2)}ms, opacity ${Math.round(stemDuration * 0.4)}ms ease-out ${Math.round(stemDuration * 0.2)}ms`,
          }}
        />
        <div
          className="absolute rounded-full origin-left will-change-transform"
          style={{
            right: -1,
            bottom: 34,
            width: 16,
            height: 8,
            background: meta.stemColor,
            borderRadius: "100% 0% 100% 0%",
            transform: `rotate(-20deg) scale(${grown ? 1 : 0})`,
            opacity: grown ? 1 : 0,
            transition: `transform ${Math.round(stemDuration * 0.4)}ms ease-out ${Math.round(stemDuration * 0.3)}ms, opacity ${Math.round(stemDuration * 0.4)}ms ease-out ${Math.round(stemDuration * 0.3)}ms`,
          }}
        />
      </div>

      <div className="w-9 h-2.5 rounded-full bg-gradient-to-b from-amber-800/70 to-amber-900/70 mt-0.5" />
    </div>
  );
});

const CountdownLabel = memo(function CountdownLabel({ plantedAt, duration }: { plantedAt: number; duration: number }) {
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.ceil((plantedAt + duration - Date.now()) / 1000)));

  useEffect(() => {
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((plantedAt + duration - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [plantedAt, duration]);

  return (
    <span className="relative text-[9px] font-bold text-slate-500 flex items-center gap-1">
      <Clock className="w-2.5 h-2.5" />
      {secondsLeft}s
    </span>
  );
});

function GardenPlot({
  plot,
  onPlant,
  onHarvest,
  canPlantHere,
  locked,
  label,
}: {
  plot: GardenPlotState | null;
  onPlant: () => void;
  onHarvest: () => void;
  canPlantHere: boolean;
  locked?: boolean;
  label: string;
}) {
  const [grown, setGrown] = useState(false);
  const [ready, setReady] = useState(false);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setGrown(false);
    setReady(false);
    if (!plot) return;

    rafRef.current = requestAnimationFrame(() => setGrown(true));

    const meta = SEED_TYPES[plot.seedType];
    const remain = plot.plantedAt + meta.duration - Date.now();
    if (remain <= 0) {
      setReady(true);
    } else {
      timeoutRef.current = setTimeout(() => setReady(true), remain);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [plot?.plantedAt, plot?.seedType]);

  if (locked) {
    return (
      <div className="rounded-[28px] border-2 border-dashed border-white/30 bg-white/10 flex flex-col items-center justify-center gap-1.5 text-white/40 py-6">
        <Lock className="w-5 h-5" />
        <span className="text-[10px] font-bold">Mở sau</span>
      </div>
    );
  }

  if (!plot) {
    return (
      <button
        onClick={onPlant}
        disabled={!canPlantHere}
        className="rounded-[28px] border-2 border-dashed border-pink-200/70 bg-white/30 hover:bg-white/50 disabled:opacity-40 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-1.5 text-pink-500 hover:text-pink-600 transition-colors group py-6"
      >
        <div className="w-9 h-9 rounded-full bg-pink-100 group-hover:bg-pink-200 flex items-center justify-center transition-colors">
          <span className="text-lg leading-none">+</span>
        </div>
        <span className="text-[10px] font-bold">{label}</span>
      </button>
    );
  }

  const meta = SEED_TYPES[plot.seedType];

  return (
    <div
      className={`relative rounded-[28px] overflow-hidden flex flex-col items-center justify-center gap-1 border py-4 ${
        ready ? "border-pink-300 bg-white/60 shadow-md cursor-pointer active:scale-[0.97]" : "border-white/50 bg-white/30"
      }`}
      onClick={() => ready && onHarvest()}
    >
      {ready && <div className="absolute -inset-6 bg-gradient-to-tr from-pink-300 to-purple-300 opacity-25 blur-xl pointer-events-none" />}
      <div className="relative">
        <LivingPlant seedType={plot.seedType} grown={grown} ready={ready} />
      </div>
      {ready ? (
        <span className="relative text-[10px] font-bold text-pink-600">Chạm để hái 🌸</span>
      ) : (
        <CountdownLabel plantedAt={plot.plantedAt} duration={meta.duration} />
      )}
    </div>
  );
}

function HarvestResultModal({
  result,
  onClose,
}: {
  result: { streak: number; petals: number; key: KeyTier | null };
  onClose: () => void;
}) {
  const keyMeta = result.key ? KEY_META[result.key] : null;
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative bg-white/90 backdrop-blur-xl rounded-[32px] shadow-2xl p-8 max-w-xs w-full text-center border border-white/60"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
        <div className="text-4xl mb-2">{keyMeta ? keyMeta.emoji : "🌸"}</div>
        {keyMeta ? (
          <>
            <p className="text-sm font-bold text-slate-800 mb-1">Trúng lớn rồi!</p>
            <p className={`text-lg font-bold ${keyMeta.color} font-display`}>{keyMeta.label}</p>
            <p className="text-[11px] text-slate-500 mt-2">Key đã được thêm vào Túi Đồ của bạn ✨</p>
          </>
        ) : (
          <>
            <p className="text-sm font-bold text-slate-800 mb-1">Hái hoa thành công!</p>
            <p className="text-lg font-bold text-pink-500 font-display">+{result.streak} ngày streak</p>
            {result.petals > 0 && <p className="text-[11px] text-purple-500 font-bold mt-1">+{result.petals} 🌸 Cánh Hoa</p>}
            <p className="text-[11px] text-slate-400 mt-2 italic">Không trúng Key lần này, quay lại mai nhé!</p>
          </>
        )}
      </div>
    </div>
  );
}

// ---- Trang chính: Vườn Hoa ----
export default function FlowerGardenSection({ currentUser, onUpdateUser, showToast }: FlowerGardenSectionProps) {
  const ext = currentUser as UserProfileExt | null;
  const garden = ext?.garden || EMPTY_GARDEN;
  const petals = ext?.petals || 0;
  const streak = ext?.streak || 0;
  const userKeys: UserKeys = currentUser?.keys || { bronze: 0, silver: 0, gold: 0, diamond: 0 };

  const [showShop, setShowShop] = useState(false);
  const [harvestResult, setHarvestResult] = useState<{ streak: number; petals: number; key: KeyTier | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [giftCodeInput, setGiftCodeInput] = useState("");
  const [redeemingCode, setRedeemingCode] = useState(false);

  const freeUsedToday = garden.lastFreeSeedDate === todayStr();

  const getUserRef = () => {
    if (!currentUser) return null;
    const userId = currentUser.username?.toLowerCase() || currentUser.uid || currentUser.id || "unknown_user";
    return doc(db, "users", userId);
  };

  const persistAndSync = async (partial: Partial<UserProfileExt>) => {
    const userRef = getUserRef();
    if (!userRef || !currentUser) return;
    try {
      await setDoc(userRef, partial, { merge: true });
      onUpdateUser({ ...currentUser, ...partial } as UserProfile);
    } catch (err) {
      console.error(err);
      showToast("Có lỗi khi lưu vườn hoa, thử lại nhé!", "error");
    }
  };

  // Đổi mã quà tặng (vd mã chào mừng user mới: +15 streak, +8 Cánh Hoa).
  // Đọc trực tiếp từ Firestore collection `giftCodes/{code}` — xem ghi chú cấu
  // trúc ở đầu file. Mỗi user chỉ đổi được 1 mã đúng 1 lần.
  const handleRedeemGiftCode = async () => {
    if (!currentUser) {
      showToast("Vui lòng đăng nhập để đổi mã quà tặng nhé!", "info");
      return;
    }
    const code = giftCodeInput.trim().toUpperCase();
    if (!code) return;

    const redeemed = ext?.redeemedGiftCodes || [];
    if (redeemed.includes(code)) {
      showToast("Bạn đã dùng mã này rồi nhé!", "error");
      return;
    }

    setRedeemingCode(true);
    try {
      const codeRef = doc(db, "giftCodes", code);
      const codeSnap = await getDoc(codeRef);

      if (!codeSnap.exists() || codeSnap.data()?.active === false) {
        showToast("Mã quà tặng không hợp lệ hoặc đã hết hạn!", "error");
        setRedeemingCode(false);
        return;
      }

      const data = codeSnap.data() as { streak?: number; petals?: number };
      const bonusStreak = data.streak || 0;
      const bonusPetals = data.petals || 0;

      await persistAndSync({
        streak: streak + bonusStreak,
        petals: petals + bonusPetals,
        redeemedGiftCodes: [...redeemed, code],
      });

      showToast(`Đổi mã thành công! +${bonusStreak} ngày streak, +${bonusPetals} 🌸 Cánh Hoa`, "success");
      setGiftCodeInput("");
    } catch (err) {
      console.error(err);
      showToast("Có lỗi khi đổi mã, thử lại nhé!", "error");
    } finally {
      setRedeemingCode(false);
    }
  };

  const plantCommon = async () => {
    if (!currentUser) {
      showToast("Vui lòng đăng nhập để trồng hoa nhé!", "info");
      return;
    }
    if (freeUsedToday || busy) return;
    setBusy(true);
    const newGarden: GardenState = {
      ...garden,
      commonPlot: { seedType: "common", plantedAt: Date.now() },
      lastFreeSeedDate: todayStr(),
    };
    await persistAndSync({ garden: newGarden });
    setBusy(false);
  };

  const plantShop = async (idx: number, seedType: "rare" | "epic") => {
    if (!currentUser) {
      showToast("Vui lòng đăng nhập để mua hạt giống nhé!", "info");
      return;
    }
    const meta = SEED_TYPES[seedType];
    if (petals < meta.cost || busy) return;
    setBusy(true);
    const newShopPlots = [...garden.shopPlots];
    newShopPlots[idx] = { seedType, plantedAt: Date.now() };
    const newGarden: GardenState = { ...garden, shopPlots: newShopPlots };
    await persistAndSync({ garden: newGarden, petals: petals - meta.cost });
    setShowShop(false);
    setBusy(false);
  };

  const harvestCommon = async () => {
    if (!currentUser || busy) return;
    setBusy(true);
    const result = rollHarvest("common");
    const newGarden: GardenState = { ...garden, commonPlot: null };
    await persistAndSync({
      garden: newGarden,
      streak: streak + result.streak,
      petals: petals + result.petals,
    });
    setHarvestResult(result);
    showToast(`Đã hái hoa! +${result.streak} ngày streak 🌸`, "success");
    setBusy(false);
  };

  const harvestShop = async (idx: number) => {
    if (!currentUser || busy) return;
    const plot = garden.shopPlots[idx];
    if (!plot) return;
    setBusy(true);
    const result = rollHarvest(plot.seedType);
    const newShopPlots = [...garden.shopPlots];
    newShopPlots[idx] = null;
    const newGarden: GardenState = { ...garden, shopPlots: newShopPlots };

    const updates: Partial<UserProfileExt> = { garden: newGarden, streak: streak + result.streak };
    if (result.key) {
      updates.keys = { ...userKeys, [result.key]: (userKeys[result.key] || 0) + 1 };
    }
    await persistAndSync(updates);
    setHarvestResult(result);
    if (result.key) {
      showToast(`Trúng ${KEY_META[result.key].label}! 🎉`, "success");
    } else {
      showToast(`Không trúng Key, nhưng vẫn +${result.streak} ngày streak nhé!`, "info");
    }
    setBusy(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 z-10 flex flex-col gap-6 relative">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-2xl font-display text-white text-glow-pearl flex items-center gap-2">
          <Flower2 className="w-5 h-5 text-pink-400" />
          Vườn Hoa
        </h2>
        <button
          onClick={() => setShowShop(true)}
          className="px-4 py-2 bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 text-white rounded-full text-xs font-bold shadow-md active:scale-95 transition-transform flex items-center gap-1.5"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          Shop Hạt Giống
        </button>
      </div>

      {!currentUser ? (
        <div className="rounded-[32px] glass-panel p-8 text-center">
          <p className="text-xs text-slate-500">Vui lòng đăng nhập để trồng hoa và tích luỹ streak/Key nhé!</p>
        </div>
      ) : (
        <>
          <div className="flex gap-3">
            <div className="flex-1 rounded-[24px] glass-panel px-4 py-3 flex items-center gap-2.5">
              <Star className="w-4 h-4 text-pink-400 fill-pink-300 flex-shrink-0" />
              <div>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">Streak Manifest</p>
                <p className="text-base font-bold text-slate-700">{streak} ngày</p>
              </div>
            </div>
            <div className="flex-1 rounded-[24px] glass-panel px-4 py-3 flex items-center gap-2.5">
              <span className="text-base">🌸</span>
              <div>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">Cánh Hoa</p>
                <p className="text-base font-bold text-slate-700">{petals}</p>
              </div>
            </div>
          </div>

          {/* Mã Quà Tặng — vd tặng user mới +15 streak / +8 Cánh Hoa, xem ghi chú
              cấu trúc Firestore `giftCodes/{code}` ở đầu file */}
          <div className="rounded-[24px] glass-panel px-4 py-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-300 to-purple-300 flex items-center justify-center flex-shrink-0">
              <Gift className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={giftCodeInput}
                onChange={(e) => setGiftCodeInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRedeemGiftCode()}
                placeholder="Nhập mã quà tặng..."
                className="flex-1 min-w-0 bg-white/60 border border-pink-100 rounded-full px-3.5 py-2 text-xs outline-none focus:bg-white placeholder:text-slate-400"
              />
              <button
                onClick={handleRedeemGiftCode}
                disabled={redeemingCode || !giftCodeInput.trim()}
                className="px-4 py-2 bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 text-white rounded-full text-xs font-bold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform whitespace-nowrap"
              >
                {redeemingCode ? "Đang đổi..." : "Đổi Mã"}
              </button>
            </div>
          </div>

          <div className="rounded-[32px] glass-panel p-6">
            <div className="grid grid-cols-3 gap-4">
              <GardenPlot plot={garden.commonPlot} onPlant={plantCommon} onHarvest={harvestCommon} canPlantHere={!freeUsedToday} label="Gieo hạt free" />
              <GardenPlot plot={garden.shopPlots[0]} onPlant={() => setShowShop(true)} onHarvest={() => harvestShop(0)} canPlantHere={true} label="Trồng hoa Shop" />
              <GardenPlot plot={garden.shopPlots[1]} onPlant={() => setShowShop(true)} onHarvest={() => harvestShop(1)} canPlantHere={true} label="Trồng hoa Shop" />
            </div>

            {/* Sổ Tay Trồng Hoa — hướng dẫn chi tiết cho user mới */}
            <div className="mt-6 pt-5 border-t border-white/40">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-3">
                <Info className="w-4 h-4 text-pink-500" />
                Sổ Tay Trồng Hoa
              </h3>
              <ul className="text-xs text-slate-600 space-y-2.5">
                <li className="flex items-start gap-2">
                  <span className="text-lg leading-none mt-0.5">🌱</span>
                  <p><strong>Gieo hạt:</strong> Mỗi ngày bạn có 1 lượt gieo hạt miễn phí. Bạn cũng có thể dùng 🌸 Cánh Hoa để mua thêm hạt giống quý hiếm từ Shop.</p>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-lg leading-none mt-0.5">⏱️</span>
                  <p><strong>Chăm sóc:</strong> Đợi hoa trưởng thành và nở rộ. Mỗi loại hạt giống sẽ có thời gian sinh trưởng khác nhau.</p>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-lg leading-none mt-0.5">✨</span>
                  <p><strong>Thu hoạch:</strong> Hái hoa sẽ giúp bạn nhận được <strong>ngày Streak</strong> và <strong>🌸 Cánh Hoa</strong>. Đặc biệt, những nụ hoa kỳ diệu mua từ Shop còn mang theo cơ hội rơi ra các loại <strong>Key</strong>. Hoa càng quý, cơ hội nhận Key xịn càng cao!</p>
                </li>
              </ul>
            </div>
          </div>
        </>
      )}

      {showShop && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowShop(false)}>
          <div className="bg-white/90 backdrop-blur-xl rounded-[32px] shadow-2xl p-6 max-w-sm w-full border border-white/60" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Shop Hạt Giống
              </h3>
              <button onClick={() => setShowShop(false)} className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200">
                <X className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {(["rare", "epic"] as const).map((type) => {
                const meta = SEED_TYPES[type];
                const emptySlot = garden.shopPlots.findIndex((p) => p === null);
                const canBuy = petals >= meta.cost && emptySlot !== -1 && !busy;
                return (
                  <div key={type} className="rounded-2xl border border-pink-100 bg-pink-50/40 p-3.5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center text-lg flex-shrink-0">🌱</div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-800">{meta.label}</p>
                      <p className="text-[10px] text-slate-500">{meta.subLabel}</p>
                    </div>
                    <button
                      onClick={() => plantShop(emptySlot, type)}
                      disabled={!canBuy}
                      className="px-3 py-1.5 rounded-full bg-white text-slate-700 text-[10px] font-bold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform flex items-center gap-1"
                    >
                      🌸 {meta.cost}
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="text-[9px] text-slate-400 text-center mt-3">Không trúng Key vẫn được cộng ngày streak an ủi.</p>
          </div>
        </div>
      )}

      {harvestResult && <HarvestResultModal result={harvestResult} onClose={() => setHarvestResult(null)} />}
    </div>
  );
}
