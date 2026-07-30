import React, { useState, useEffect } from "react";
import { LogIn, LogOut, Sparkles, Key, User, ShieldAlert, Heart } from "lucide-react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { UserProfile } from "../types";
import { motion, AnimatePresence } from "motion/react";

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
  const [isRegistering, setIsRegistering] = useState(false);

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

    // Super Admin Easter Egg Bypass
    if (cleanUsername === "nguhinh2026" && cleanPasscode === "30081997") {
      const adminUser = {
        username: "nguhinh2026",
        passcode: "30081997",
        currentStreak: 777, // Special admin streak
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
          // Success Login
          onLogin({ ...userData, isAdmin: false });
ểt
