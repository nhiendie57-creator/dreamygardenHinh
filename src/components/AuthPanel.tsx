import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { UserProfile } from "../types";
import { Key, User, Shield, LogOut, CheckCircle, AlertCircle } from "lucide-react";

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
      } catch (e) {
        localStorage.removeItem("dreamy_user");
      }
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !passcode.trim()) {
      showToast("Vui lòng điền đầy đủ Username và Passcode!", "error");
      return;
    }

    setLoading(true);

    // 1. Super Admin Easter Egg check (hardcoded as requested)
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
      return;
    }

    // 2. Regular User Database Auth
    try {
      const sanitizedUsername = username.trim().toLowerCase();
      const userRef = doc(db, "users", sanitizedUsername);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data() as UserProfile;
        if (userData.passcode === passcode) {
          // Check last manifestation date to update streak
          let updatedStreak = userData.currentStreak;
          const todayStr = new Date().toISOString().split("T")[0];
          const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];

          if (userData.lastManifestDate) {
            const lastDate = userData.lastManifestDate.split("T")[0];
            if (lastDate !== todayStr && lastDate !== yesterdayStr) {
              // Streak missed
              updatedStreak = 0;
              await setDoc(userRef, { ...userData, currentStreak: 0 }, { merge: true });
              userData.currentStreak = 0;
            }
          }

          localStorage.setItem("dreamy_user", JSON.stringify(userData));
          localStorage.setItem("dreamy_admin", "false");
          onLogin(userData, false);
          showToast(`Chào mừng bạn trở lại, ${userData.username}! 🌸`, "success");
        } else {
          showToast("Mật mã passcode không chính xác!", "error");
        }
      } else {
        // Register new user automatically
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
        showToast(`Đăng ký thành công! Chào mừng ${newUser.username} đến với khu vườn.`, "success");
      }
    } catch (err) {
      console.error(err);
      showToast("Có lỗi xảy ra khi kết nối cơ sở dữ liệu!", "error");
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
    <div 
      id="auth-panel" 
      className="absolute top-6 left-6 z-[100] p-4 rounded-2xl glass-panel text-slate-800 w-64 shadow-lg transition-all duration-300 hover:shadow-pink-100/50"
    >
      {currentUser ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[2px] opacity-70 font-bold flex items-center gap-1">
              {isAdmin ? <Shield className="w-3 h-3 text-pink-500 animate-pulse" /> : <User className="w-3 h-3 text-pink-400" />}
              {isAdmin ? "Admin Portal" : "Dreamer"}
            </span>
            <button
              onClick={handleSignOut}
              className="text-slate-500 hover:text-pink-600 transition-colors p-1 rounded-full hover:bg-white/40"
              title="Đăng xuất"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-sm font-semibold truncate text-slate-800">
            Hi, <span className="text-pink-600 font-bold">{currentUser.username}</span>
          </p>
          {!isAdmin && (
            <p className="text-[11px] text-slate-600">
              Streak: <span className="font-bold text-pink-500">✨ {currentUser.currentStreak} ngày</span>
            </p>
          )}
          {isAdmin && (
            <span className="text-[9px] bg-pink-100 text-pink-700 font-semibold px-2 py-0.5 rounded-full w-max">
              Full Privileges
            </span>
          )}
        </div>
      ) : (
        <form onSubmit={handleAuth} className="flex flex-col gap-2">
          <div className="text-[10px] uppercase tracking-[2px] opacity-70 font-semibold text-slate-600">
            Cổng Đăng Nhập
          </div>
          <div className="relative">
            <User className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              className="bg-white/40 border border-white/50 rounded-lg pl-8 pr-3 py-1.5 text-xs placeholder-slate-500 outline-none w-full focus:bg-white/60 transition-colors focus:border-pink-300"
            />
          </div>
          <div className="relative">
            <Key className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="password"
              placeholder="Passcode (8 số/ký tự)"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              disabled={loading}
              className="bg-white/40 border border-white/50 rounded-lg pl-8 pr-3 py-1.5 text-xs placeholder-slate-500 outline-none w-full focus:bg-white/60 transition-colors focus:border-pink-300"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-pink-400 to-purple-400 text-white font-bold py-1.5 rounded-lg text-xs hover:from-pink-500 hover:to-purple-500 transition-all duration-300 shadow-md shadow-pink-100 disabled:opacity-50"
          >
            {loading ? "Đang xử lý..." : "Bước vào vườn"}
          </button>
        </form>
      )}
    </div>
  );
}
