import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface BackgroundEffectsProps {
  customBgUrl?: string | null;
}

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
}

interface Petal {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
}

interface FloatHeart {
  id: number;
  x: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
}

export default function BackgroundEffects({ customBgUrl }: BackgroundEffectsProps) {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const [petals, setPetals] = useState<Petal[]>([]);
  const [hearts, setHearts] = useState<FloatHeart[]>([]);

  useEffect(() => {
    // Generate twinkling sparkles
    const newSparkles = Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 6 + 4,
      delay: Math.random() * 5,
    }));
    setSparkles(newSparkles);

    // Generate falling petals
    const newPetals = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 10,
      duration: Math.random() * 10 + 10,
      size: Math.random() * 12 + 8,
    }));
    setPetals(newPetals);

    // Generate floating hearts
    const colors = ["#FFD1DC", "#E6E6FA", "#BCECAC", "#FFF0F5"];
    const newHearts = Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: Math.random() * 20 + 15,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 8,
      duration: Math.random() * 15 + 15,
    }));
    setHearts(newHearts);
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full -z-50 overflow-hidden pointer-events-none select-none">
      {/* Base Layer Gradient or Custom Background Image */}
      {customBgUrl ? (
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center transition-all duration-1000 ease-in-out"
          style={{ backgroundImage: `url(${customBgUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-tr from-[#E6E6FA] via-[#FFD1DC] to-[#BCECAC] animate-pulse-slow opacity-95" />
      )}

      {/* Cloud Corner Overlays */}
      {/* Top Left Cloud */}
      <div className="absolute top-[-5%] left-[-10%] w-[45%] h-[35%] opacity-60 filter blur-[40px] rounded-full bg-white" />
      <div className="absolute top-[-10%] left-[-5%] w-[35%] h-[30%] opacity-40 filter blur-[30px] rounded-full bg-[#FFD1DC]" />

      {/* Top Right Cloud */}
      <div className="absolute top-[-5%] right-[-10%] w-[40%] h-[30%] opacity-55 filter blur-[45px] rounded-full bg-white" />
      <div className="absolute top-[5%] right-[-5%] w-[30%] h-[25%] opacity-35 filter blur-[35px] rounded-full bg-[#BCECAC]" />

      {/* Bottom Left Cloud */}
      <div className="absolute bottom-[-10%] left-[-8%] w-[45%] h-[35%] opacity-65 filter blur-[40px] rounded-full bg-white" />
      <div className="absolute bottom-[-5%] left-[-2%] w-[30%] h-[25%] opacity-45 filter blur-[30px] rounded-full bg-[#E6E6FA]" />

      {/* Bottom Right Cloud */}
      <div className="absolute bottom-[-8%] right-[-10%] w-[50%] h-[40%] opacity-60 filter blur-[50px] rounded-full bg-white" />
      <div className="absolute bottom-[-2%] right-[-5%] w-[35%] h-[30%] opacity-40 filter blur-[35px] rounded-full bg-[#FFD1DC]" />

      {/* Twinkling Stars */}
      {sparkles.map((sparkle) => (
        <div
          key={`sparkle-${sparkle.id}`}
          className="absolute rounded-full"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            width: `${sparkle.size}px`,
            height: `${sparkle.size}px`,
            backgroundColor: "#FAFAD2",
            boxShadow: "0 0 10px #FFF, 0 0 4px #FAFAD2",
            animation: `float-sparkle 4s ease-in-out infinite`,
            animationDelay: `${sparkle.delay}s`,
            opacity: 0.6,
          }}
        />
      ))}

      {/* Floating 3D Pastel Hearts */}
      {hearts.map((heart) => (
        <motion.div
          key={`heart-${heart.id}`}
          className="absolute"
          initial={{ y: "110%", x: `${heart.x}vw`, opacity: 0, scale: 0.8 }}
          animate={{
            y: "-15%",
            opacity: [0, 0.6, 0.6, 0],
            scale: [0.8, 1.1, 1, 0.9],
            rotate: [0, 15, -15, 0],
          }}
          transition={{
            duration: heart.duration,
            delay: heart.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            width: `${heart.size}px`,
            height: `${heart.size}px`,
            color: heart.color,
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full drop-shadow-[0_4px_8px_rgba(255,182,193,0.3)]">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </motion.div>
      ))}

      {/* Falling Cherry Blossom Petals */}
      {petals.map((petal) => (
        <motion.div
          key={`petal-${petal.id}`}
          className="absolute petal"
          initial={{ y: "-10%", x: `${petal.x}vw`, rotate: 0, opacity: 0 }}
          animate={{
            y: "110vh",
            x: [`${petal.x}vw`, `${petal.x + 15}vw`, `${petal.x - 5}vw`, `${petal.x + 10}vw`],
            rotate: [0, 180, 360, 540],
            opacity: [0, 0.8, 0.8, 0],
          }}
          transition={{
            duration: petal.duration,
            delay: petal.delay,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            width: `${petal.size}px`,
            height: `${petal.size * 1.3}px`,
          }}
        />
      ))}
    </div>
  );
}
