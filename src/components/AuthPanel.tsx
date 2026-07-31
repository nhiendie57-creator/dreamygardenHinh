import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { UserProfile } from "../types";
import { Key, User, Shield, LogOut, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AuthPanelProps {
  currentUser: UserProfile | null;
  isAdmin: boolean;
  onLogin: (user: UserProfile, isAdmin: boolean) => void;
  onLogout: () => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function AuthPanel({
  currentUser,
  isAdmin,
  onLogin,
  onLogout,
  showToast,
}: AuthPanelProps) {
  // Modal States
  const [isOpen, setIsOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  
  // Form States
  const [username, setUsername] = useState("");
  const [passcode, setPasscode] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-login from localStorage if exists
  useEffect(() => {
    const savedUser = localStorage.getItem("dreamy_user");
    const savedAdmin = localStorage.getItem("dreamy_admin") === "true";
    if (savedUser) {
      try {
        onLogin(JSON.parse(savedUser), savedAdmin);
      } catch (error) {
        console.error("Lỗi đọc dữ liệu user:", error);
        localStorage.removeItem("dreamy_user");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !passcode.trim()) {
      showToast("Vui lòng điền đầy đủ Username và Passcode!", "error");
      return;
    }

    // Kiểm tra bắt buộc đủ 8 ký tự khi đăng ký mới (trừ tài khoản admin nguhinh2026)
    if (authMode === "register" && passcode.trim().length !== 8 && username.trim() !== "nguhinh2026") {
      showToast("Passcode phải đúng đủ 8 số/ký tự!", "error");
      return;
    }

    setLoading(true);

    // 1. Super Admin check
    if (username.trim() === "nguhinh2026" && passcode.trim() === "30081997") {
      const adminProfile: UserProfile = {
        username: "nguhinh2026",
        passcode: "30081997",
        currentStreak: 999,
        lastManifestDate: new Date().toISOString().split("T")[0],
      };
      localStorage.setItem("dreamy_user", JSON.stringify(adminProfile));
      localStorage.setItem("dreamy_admin", "true");
      onLogin(adminProfile, true);
      showToast("Chào mừng Ngu Hinh trở lại Khu Vườn Thơ Mộng! ✨", "success");
      setLoading(false);
      setUsername("");
      setPasscode("");
      setIsOpen(false);
      return;
    }

    // 2. User Database Auth
    try {
      const sanitizedUsername = username.trim().toLowerCase();
      const userRef = doc(db, "users", sanitizedUsername);
      const userSnap = await getDoc(userRef);

      if (authMode === "login") {
        // --- XỬ LÝ ĐĂNG NHẬP ---
        if (userSnap.exists()) {
          const userData = userSnap.data() as UserProfile;
          if (userData.passcode === passcode.trim()) {
            // Check streak
            let updatedStreak = userData.currentStreak || 0;
            const todayStr = new Date().toISOString().split("T")[0];
            const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];

            if (userData.lastManifestDate) {
              const lastDate = userData.lastManifestDate.split("T")[0];
              if (lastDate !== todayStr && lastDate !== yesterdayStr) {
                updatedStreak = 0;
                await setDoc(userRef, { ...userData, currentStreak: 0 }, { merge: true });
                userData.currentStreak = 0;
              }
            }

            localStorage.setItem("dreamy_user", JSON.stringify(userData));
            localStorage.setItem("dreamy_admin", "false");
            onLogin(userData, false);
            showToast(`Chào mừng bạn trở lại, ${userData.username}! 🌸`, "success");
            setIsOpen(false);
          } else {
            showToast("Mật mã passcode không chính xác!", "error");
          }
        } else {
          showToast("Tài khoản không tồn tại. Vui lòng chuyển sang Đăng ký!", "error");
        }
      } else {
        // --- XỬ LÝ ĐĂNG KÝ ---
        if (userSnap.exists()) {
          showToast("Tên người dùng đã được sử dụng. Vui lòng chọn tên khác!", "error");
        } else {
          const newUser: UserProfile = {
            username: username.trim(),
            passcode: passcode.trim(),
            currentStreak: 0,
            lastManifestDate: null,
            createdAt: new Date().toISOString(),
          };

          await setDoc(userRef, newUser);
          localStorage.setItem("dreamy_user", JSON.stringify(newUser));
          localStorage.setItem("dreamy_admin", "false");
          onLogin(newUser, false);
          showToast(`Đăng ký thành công! Chào mừng ${newUser.username} ✨`, "success");
          setIsOpen(false);
        }
      }
    } catch (err) {
      console.error(err);
      showToast("Có lỗi xảy ra khi kết nối hệ thống!", "error");
    } finally {
      setLoading(false);
      setUsername("");
      setPasscode("");
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("dreamy_user");
    localStorage.removeItem("dreamy_admin");
    onLogout();
    showToast("Đã đăng xuất khỏi tài khoản.", "info");
  };

  return (
    <>
      {/* NÚT HOẶC WIDGET LUÔN HIỂN THỊ TRÊN MÀN HÌNH (GÓC TRÁI TRÊN) */}
      <div className="absolute top-3 left-3 sm:top-6 sm:left-6 z-[90]">
        {currentUser ? (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-2.5 sm:p-3.5 rounded-2xl glass-panel text-slate-800 w-auto min-w-[150px] sm:min-w-[200px] max-w-[180px] sm:max-w-[260px] shadow-lg transition-all duration-300 hover:shadow-pink-100/50"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[9px] sm:text-[10px] uppercase tracking-[1.5px] sm:tracking-[2px] opacity-70 font-bold flex items-center gap-1.5">
                {isAdmin ? <Shield className="w-3 h-3 text-pink-500 animate-pulse" /> : <User className="w-3 h-3 text-pink-400" />}
                {isAdmin ? "Admin Portal" : "Dreamer"}
              </span>
              <button
                onClick={handleSignOut}
                className="text-slate-500 hover:text-rose-500 transition-colors p-1.5 rounded-full hover:bg-white/60 bg-white/30"
                title="Đăng xuất"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
            <p className="text-xs sm:text-sm font-semibold truncate text-slate-800 mt-1">
              Hi, <span className="text-pink-600 font-bold">{currentUser.username}</span>
            </p>
            {!isAdmin && (
              <p className="text-[10px] sm:text-[11px] text-slate-600 mt-0.5">
                Streak: <span className="font-bold text-pink-500">✨ {currentUser.currentStreak} ngày</span>
              </p>
            )}
            {isAdmin && (
              <div className="mt-1">
                <span className="text-[9px] bg-pink-100 text-pink-700 font-bold px-2 py-0.5 rounded-full">
                  Full Privileges
                </span>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="px-3 sm:px-5 py-2.5 rounded-full glass-panel flex items-center gap-0 sm:gap-2 text-pink-600 font-bold text-xs shadow-md border border-white/50 hover:bg-white/60 transition-colors"
          >
            <User className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Đăng nhập / Đăng ký</span>
          </motion.button>
        )}
      </div>

      {/* CỬA SỔ POPUP (MODAL) ĐĂNG NHẬP / ĐĂNG KÝ */}
      <AnimatePresence>
        {isOpen && !currentUser && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/30 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white/80 backdrop-blur-xl border border-white/60 p-6 rounded-[32px] shadow-2xl w-full max-w-sm relative"
            >
              {/* Nút Đóng */}
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-100/50 hover:bg-slate-200 text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-center mb-6">
                <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mb-2 shadow-inner">
                  <Sparkles className="w-6 h-6 text-pink-500 animate-pulse" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 font-display">
                  Cổng Không Gian
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">Bước vào thế giới mộng mơ</p>
              </div>

              {/* Tabs chuyển đổi Đăng nhập / Đăng ký */}
              <div className="flex bg-slate-100/50 p-1 rounded-xl mb-5">
                <button
                  type="button"
                  onClick={() => setAuthMode("login")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    authMode === "login" ? "bg-white text-pink-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Đăng Nhập
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode("register")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    authMode === "register" ? "bg-white text-pink-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Đăng Ký Mới
                </button>
              </div>

              {/* Form nhập liệu */}
              <form onSubmit={handleAuth} className="flex flex-col gap-3">
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Tên người dùng (Username)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    className="bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs placeholder-slate-400 outline-none w-full focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all"
                  />
                </div>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    maxLength={8}
                    placeholder={authMode === "login" ? "Mật mã (Passcode)" : "Mật mã (Đủ 8 số/ký tự)"}
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    disabled={loading}
                    className="bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs placeholder-slate-400 outline-none w-full focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all tracking-widest"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-gradient-to-r from-pink-400 to-purple-400 text-white font-bold py-3 rounded-xl text-xs hover:from-pink-500 hover:to-purple-500 transition-all duration-300 shadow-lg shadow-pink-200 disabled:opacity-50"
                >
                  {loading 
                    ? "Đang xử lý..." 
                    : (authMode === "login" ? "Tiến Vào Khu Vườn" : "Khởi Tạo Tài Khoản")
                  }
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
