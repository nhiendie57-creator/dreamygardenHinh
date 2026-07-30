import React, { useState } from "react";
// Đã xóa bớt các icon không dùng tới để Vercel không báo lỗi
import { Key, User, Loader2 } from "lucide-react"; 
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { UserProfile } from "../types";
// Sửa thành framer-motion chuẩn
import { motion } from "framer-motion";

interface AuthGateProps {
  onLogin: (user: UserProfile & { isAdmin: boolean }) => void;
  onLogout: () => void;
  currentUser: (UserProfile & { isAdmin: boolean }) | null;
}

export default function AuthGate({ onLogin, onLogout, currentUser }: AuthGateProps) {
  const [username, setUsername] = useState("");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanUsername = username.trim().toLowerCase();
    const cleanPasscode = passcode.trim();

    if (!cleanUsername || !cleanPasscode) {
      setError("Hãy nhập đủ tên và passcode nhé! 💕");
      setLoading(false);
      return;
    }

    // Tài khoản Super Admin
    if (cleanUsername === "nguhinh2026" && cleanPasscode === "30081997") {
      const adminUser = {
        username: "nguhinh2026",
        passcode: "30081997",
        currentStreak: 777, 
        lastManifestDate: new Date().toISOString().split("T")[0],
        isAdmin: true,
      };
      onLogin(adminUser);
      setLoading(false);
      return;
    }

    if (cleanPasscode.length !== 8 || isNaN(Number(cleanPasscode))) {
      setError("Mã bí mật (passcode) phải gồm đúng 8 số nha! ⭐");
      setLoading(false);
      return;
    }

    try {
      const userDocRef = doc(db, "users", cleanUsername);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        if (userData.passcode === cleanPasscode) {
          // Đăng nhập thành công
          onLogin({ ...userData, isAdmin: false });
        } else {
          setError("Passcode không đúng rồi. Thử lại nhé! 🥺");
        }
      } else {
        // Tự động đăng ký nếu chưa có tài khoản
        const newUser: UserProfile = {
          username: cleanUsername,
          passcode: cleanPasscode,
          currentStreak: 0,
          lastManifestDate: "",
        };
        await setDoc(userDocRef, {
          ...newUser,
          createdAt: serverTimestamp()
        });
        onLogin({ ...newUser, isAdmin: false });
      }
    } catch (err) {
      console.error("Lỗi đăng nhập:", err);
      setError("Có lỗi kết nối, hãy thử lại sau nha! 🌧️");
    } finally {
      setLoading(false);
    }
  };

  // Nếu đã đăng nhập thì ẩn khung này đi
  if (currentUser) return null; 

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="absolute top-20 left-8 w-80 bg-white/40 backdrop-blur-md rounded-2xl p-6 shadow-[0_8px_32px_rgba(255,182,193,0.3)] border border-white/50"
    >
      <h2 className="text-xl font-bold text-gray-700 mb-6 uppercase tracking-wider text-center">
        Cổng đăng nhập
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="relative">
            <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/60 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white transition-all text-gray-700"
              maxLength={20}
            />
          </div>
        </div>

        <div>
          <div className="relative">
            <Key className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="password"
              placeholder="Passcode (8 số/ký tự)"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/60 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white transition-all text-gray-700"
              maxLength={8}
            />
          </div>
        </div>

        {error && (
          <p className="text-pink-600 text-sm text-center font-medium bg-pink-100/50 py-2 rounded-lg">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Bước vào vườn"}
        </button>
      </form>
    </motion.div>
  );
}
