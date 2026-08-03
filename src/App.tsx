import React, { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./config/firebase";
import { UserProfile, TabType } from "./types";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, CheckCircle, Info } from "lucide-react";

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

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [customBgUrl, setCustomBgUrl] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

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
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAdmin(false);
  };

  const handleUpdateUser = (updatedUser: UserProfile) => {
    setCurrentUser(updatedUser);
    localStorage.setItem("dreamy_user", JSON.stringify(updatedUser));
  };

  return (
    <div className="relative min-h-screen w-full select-none overflow-x-hidden flex flex-col font-sans-dreamy">
      <BackgroundOverlay customBgUrl={customBgUrl} />

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
                />
              )}
              {activeTab === "characters" && (
                <CharacterSection
                  isAdmin={isAdmin}
                  currentUser={currentUser}
                  onUpdateUser={handleUpdateUser}
                  showToast={showToast}
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

        <footer className="fixed bottom-4 right-6 text-[10px] text-white-600/75 select-none font-bold tracking-wider opacity-85 hover:opacity-100 transition z-40">
          © 2026 DREAMY GARDEN by Ngữ Hinh • ALL RIGHTS RESERVED
        </footer>
      </div>
    </div>
  );
}
