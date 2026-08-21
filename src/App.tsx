import React, { useState, useEffect } from "react";
import "./index.css"; 
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./config/firebase";
import { UserProfile, TabType } from "./types";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, CheckCircle, Info, Moon, Sun } from "lucide-react";
import { useIsMobile } from "./hooks/useIsMobile"; // ⚠️ chị check lại đúng path file hook

// Components
import BackgroundOverlay from "./components/BackgroundOverlay";
import Navbar from "./components/Navbar";
import AuthPanel from "./components/AuthPanel";
import MusicPlayer from "./components/MusicPlayer";
import Manifestation from "./components/Manifestation";
import Hero from "./components/Hero";
import CharacterSection from "./components/CharacterSection";
import ConfessionNotes from "./components/ConfessionNotes";
import FlowerGardenSection from "./components/FlowerGardenSection";
import Socials from "./components/Socials";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

// UserProfile hiện chưa có field darkMode trong types.ts, mở rộng cục bộ
// giống cách các component khác đã làm (CharacterExt, UserProfileExt...).
type UserProfileExt = UserProfile & { darkMode?: boolean };

// --- Đọc tab & id nhân vật từ URL lúc app vừa mở, để hỗ trợ link riêng
// cho từng nhân vật, ví dụ: ?tab=characters&character=abc123
const VALID_TABS: TabType[] = ["home", "characters", "confession", "manifestation", "garden", "socials"];

const getInitialTab = (): TabType => {
  if (typeof window === "undefined") return "home";
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");
  if (tab && (VALID_TABS as string[]).includes(tab)) return tab as TabType;
  if (params.get("character")) return "characters";
  return "home";
};

const getInitialCharacterId = (): string | null => {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("character");
};

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab);
  const [initialCharacterId] = useState<string | null>(getInitialCharacterId);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [customBgUrl, setCustomBgUrl] = useState<string | null>(null);
  const [darkBgUrl, setDarkBgUrl] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const isMobile = useIsMobile(); // true nếu màn nhỏ HOẶC CPU yếu (đã xử lý trong hook)

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    const fetchBackground = async () => {
      try {
        const docRef = doc(db, "settings", "app");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.backgroundImage !== undefined) {
            setCustomBgUrl(data.backgroundImage);
          }
          if (data && data.darkBackgroundImage !== undefined) {
            setDarkBgUrl(data.darkBackgroundImage);
          }
        }
      } catch (err) {
        console.warn("Could not load background custom settings, fallback to gradient:", err);
      }
    };

    fetchBackground();
  }, []);

  const handleLogin = (user: UserProfile, adminStatus: boolean) => {
    setCurrentUser(user);
    setIsAdmin(adminStatus);
    // Khôi phục đúng chế độ tối/sáng mà tài khoản này đã lưu trước đó
    setIsDarkMode(!!(user as UserProfileExt).darkMode);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAdmin(false);
    setIsDarkMode(false);
  };

  const handleUpdateUser = (updatedUser: UserProfile) => {
    setCurrentUser(updatedUser);
    localStorage.setItem("dreamy_user", JSON.stringify(updatedUser));
  };

  const toggleDarkMode = async () => {
    const next = !isDarkMode;
    setIsDarkMode(next);

    if (!currentUser) return; // Chưa đăng nhập thì chỉ đổi tạm trên phiên hiện tại

    try {
      const userId = currentUser.username?.toLowerCase() || currentUser.uid || currentUser.id || "unknown_user";
      await setDoc(doc(db, "users", userId), { darkMode: next }, { merge: true });
      handleUpdateUser({ ...currentUser, darkMode: next } as UserProfile);
    } catch (err) {
      console.error(err);
      showToast("Không thể lưu chế độ tối, thử lại nhé!", "error");
    }
  };

  return (
    <div
      className={`relative min-h-screen w-full select-none overflow-x-hidden flex flex-col font-sans-dreamy${
        isMobile ? " reduce-fx" : ""
      }${isDarkMode ? " dark-mode" : ""}`}
    >
      <BackgroundOverlay customBgUrl={customBgUrl} isDarkMode={isDarkMode} darkBgUrl={darkBgUrl} />

      <button
        onClick={toggleDarkMode}
        className="fixed right-3 md:right-5 top-1/2 -translate-y-1/2 z-110 p-2.5 rounded-full glass-panel-ultra border border-white/50 hover:scale-110 active:scale-95 transition-all shadow-md"
        title={isDarkMode ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
      >
        {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
      </button>

      <div className="fixed top-24 right-6 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="pointer-events-auto p-4 rounded-2xl glass-panel-ultra border border-white flex items-center gap-3 shadow-xl"
            >
              {t.type === "success" && <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
              {t.type === "error" && <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />}
              {t.type === "info" && <Info className="w-5 h-5 text-purple-500 flex-shrink-0" />}
              <span className="text-xs font-bold text-slate-800">{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {isAdmin && (
        <div className="fixed top-20 right-4 z-30 pointer-events-none">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-pink-100/90 backdrop-blur-md border border-pink-300 text-pink-700 pl-2 pr-3 py-1 rounded-full text-[10px] font-bold tracking-wide shadow-md flex items-center gap-1 shadow-pink-100/50"
            title="Bạn đang thao tác với vai trò là quản trị viên của Dreamy Garden"
          >
            <CheckCircle className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" />
            <span className="hidden sm:inline">Quản trị viên</span>
            <span className="sm:hidden">QTV</span>
          </motion.div>
        </div>
      )}

      <div className="flex-1 flex flex-col w-full relative min-h-screen">
        <AuthPanel
          currentUser={currentUser}
          isAdmin={isAdmin}
          onLogin={handleLogin}
          onLogout={handleLogout}
          showToast={showToast}
        />

        <Navbar activeTab={activeTab} onChangeTab={setActiveTab} />

        <MusicPlayer isAdmin={isAdmin} showToast={showToast} />

        <main className="flex-1 flex items-center justify-center pt-28 pb-32">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="relative z-[100] w-full h-full flex flex-col items-center justify-center"
            >
              {activeTab === "home" && (
                <Hero
                  isAdmin={isAdmin}
                  onChangeTab={setActiveTab}
                  showToast={showToast}
                  onUpdateBg={setCustomBgUrl}
                  customBgUrl={customBgUrl}
                  darkBgUrl={darkBgUrl}
                  onUpdateDarkBg={setDarkBgUrl}
                />
              )}
              {activeTab === "characters" && (
                <CharacterSection
                  isAdmin={isAdmin}
                  currentUser={currentUser}
                  onUpdateUser={handleUpdateUser}
                  showToast={showToast}
                  initialCharacterId={initialCharacterId}
                />
              )}
              {activeTab === "confession" && (
                <ConfessionNotes
                  currentUser={currentUser}
                  isAdmin={isAdmin}
                  showToast={showToast}
                />
              )}
              {activeTab === "manifestation" && (
                <Manifestation
                  currentUser={currentUser}
                  onUpdateUser={handleUpdateUser}
                  showToast={showToast}
                />
              )}
              {activeTab === "garden" && (
                <FlowerGardenSection
                  currentUser={currentUser}
                  onUpdateUser={handleUpdateUser}
                  showToast={showToast}
                />
              )}
              {activeTab === "socials" && (
                <Socials currentUser={currentUser ? { ...currentUser, isAdmin } : null} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="fixed right-4 bottom-24 md:bottom-4 md:right-6 flex flex-col md:flex-row items-end md:items-center gap-1.5 md:gap-2 text-[9px] md:text-[10px] text-white/80 select-none font-bold tracking-wider opacity-85 hover:opacity-100 transition-all duration-300 z-50">
          <span className="drop-shadow-md">
            © 2026 DREAMY GARDEN by Ngữ Hinh
          </span>
          <span className="hidden md:inline text-pink-300">
            •
          </span>
          <span className="bg-gradient-to-r from-pink-400/60 to-purple-400/60 text-white px-2.5 py-0.5 rounded-full border border-white/30 shadow-lg backdrop-blur-md uppercase text-[8px] md:text-[9px] tracking-widest">
            All Rights Reserved
          </span>
        </footer>
      </div>
    </div>
  );
}
