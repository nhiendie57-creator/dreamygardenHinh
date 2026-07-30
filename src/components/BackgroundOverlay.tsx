import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

interface Petal {
  id: number;
  x: number;
  y: number;
  size: number;
  rotation: number;
  duration: number;
  delay: number;
}

interface FloatingHeart {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  duration: number;
}

interface BackgroundOverlayProps {
  customBgUrl: string | null;
}

export default function BackgroundOverlay({ customBgUrl }: BackgroundOverlayProps) {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const [petals, setPetals] = useState<Petal[]>([]);
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);

  useEffect(() => {
    // Generate static/dynamic sparkles
    const initialSparkles = Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 6 + 4,
      delay: Math.random() * 5,
      duration: Math.random() * 4 + 3,
    }));
    setSparkles(initialSparkles);

    // Generate falling petals
    const initialPetals = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * -20,
      size: Math.random() * 12 + 8,
      rotation: Math.random() * 360,
      duration: Math.random() * 8 + 8,
      delay: Math.random() * 5,
    }));
    setPetals(initialPetals);

    // Generate floating hearts
    const heartColors = [
      "rgba(255, 182, 193, 0.4)", // Pastel Pink
      "rgba(230, 230, 250, 0.4)", // Pastel Lavender
      "rgba(188, 236, 172, 0.4)", // Pastel Mint Green
      "rgba(173, 216, 230, 0.4)", // Baby Blue
    ];
    const initialHearts = Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 20 + 15,
      color: heartColors[Math.floor(Math.random() * heartColors.length)],
      duration: Math.random() * 12 + 10,
    }));
    setHearts(initialHearts);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Base Layer Gradient or Custom Admin Image */}
      {customBgUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out scale-105"
          style={{ backgroundImage: `url(${customBgUrl})` }}
        />
      ) : (
        <div 
          className="absolute inset-0 transition-all duration-1000 ease-in-out"
          style={{
            background: "linear-gradient(135deg, #E6E6FA 0%, #FFD1DC 50%, #BCECAC 100%)"
          }}
        />
      )}

      {/* Cloud Shapes overlay around corners */}
      <div className="absolute -top-12 -left-12 w-96 h-48 bg-white/40 blur-3xl rounded-full" />
      <div className="absolute top-24 -right-16 w-[450px] h-64 bg-pink-100/40 blur-3xl rounded-full" />
      <div className="absolute -bottom-20 left-1/4 w-[500px] h-64 bg-blue-100/40 blur-3xl rounded-full" />
      <div className="absolute bottom-1/3 -left-16 w-80 h-48 bg-purple-100/30 blur-3xl rounded-full" />

      {/* Sparkling light particles */}
      {sparkles.map((s) => (
        <motion.div
          key={`sparkle-${s.id}`}
          className="absolute rounded-full"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            background: "#FAFAD2", // Light golden yellow
            boxShadow: "0 0 8px #FAFAD2",
          }}
          animate={{
            opacity: [0.1, 0.9, 0.1],
            scale: [0.7, 1.3, 0.7],
          }}
          transition={{
            duration: s.duration,
            delay: s.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Floating 3D-like hearts in the background */}
      {hearts.map((h) => (
        <motion.div
          key={`heart-${h.id}`}
          className="absolute text-center select-none"
          style={{
            left: `${h.x}%`,
            top: `${h.y}%`,
            fontSize: h.size,
            color: h.color,
            filter: "drop-shadow(0 4px 6px rgba(255, 182, 193, 0.2)) blur(1px)",
          }}
          animate={{
            y: [0, -40, 0],
            x: [0, Math.sin(h.id) * 15, 0],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: h.duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          ❤
        </motion.div>
      ))}

      {/* Falling petals */}
      {petals.map((p) => (
        <motion.div
          key={`petal-${p.id}`}
          className="petal"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size * 1.2,
            rotate: p.rotation,
          }}
          animate={{
            y: ["-10vh", "110vh"],
            x: [
              `${p.x}%`, 
              `${p.x + Math.sin(p.id) * 15}%`, 
              `${p.x + Math.sin(p.id + 1) * 8}%`
            ],
            rotate: [p.rotation, p.rotation + 360],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}
