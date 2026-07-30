import React, { useState, useEffect, useRef } from "react";
import { collection, getDocs, addDoc, query, orderBy } from "firebase/firestore";
import { db } from "../config/firebase";
import { Song } from "../types";
import { Plus, Volume2, VolumeX, Music, Trash, Loader2 } from "lucide-react";

interface MusicPlayerProps {
  isAdmin: boolean;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

const DEFAULT_SONGS: Song[] = [
  {
    id: "default-1",
    title: "Lover's Whisper - Soft Acoustic Beats",
    artist: "Dreamy Beats",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  },
  {
    id: "default-2",
    title: "Midnight Dream - Lofi Piano Garden",
    artist: "Ngu Hinh",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  },
];

export default function MusicPlayer({ isAdmin, showToast }: MusicPlayerProps) {
  const [songs, setSongs] = useState<Song[]>(DEFAULT_SONGS);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // New Song Form State
  const [songTitle, setSongTitle] = useState("");
  const [songArtist, setSongArtist] = useState("");
  const [mp3File, setMp3File] = useState<File | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load songs from Firestore
  useEffect(() => {
    async function fetchSongs() {
      try {
        const q = query(collection(db, "songs"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const fetchedSongs: Song[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Song[];

        if (fetchedSongs.length > 0) {
          setSongs([...fetchedSongs, ...DEFAULT_SONGS]);
        }
      } catch (err) {
        console.error("Error fetching songs:", err);
      }
    }
    fetchSongs();
  }, []);

  // Update audio source when song changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = songs[currentSongIndex]?.url;
      if (isPlaying) {
        audioRef.current.play().catch((err) => {
          console.log("Auto play prevented:", err);
          setIsPlaying(false);
        });
      }
    }
  }, [currentSongIndex, songs]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      showToast("Đã tạm dừng âm nhạc 🌸", "info");
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        showToast(`Đang phát: ${songs[currentSongIndex].title} 🎵`, "success");
      }).catch((err) => {
        console.error(err);
        showToast("Không thể phát bài hát này. Hãy thử lại!", "error");
      });
    }
  };

  const handleNext = () => {
    setCurrentSongIndex((prevIndex) => (prevIndex + 1) % songs.length);
  };

  const handleAudioEnded = () => {
    handleNext();
  };

  // Upload to Cloudinary & Save to Firestore
  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!songTitle || !songArtist || !mp3File) {
      showToast("Vui lòng nhập đầy đủ thông tin và chọn file MP3!", "error");
      return;
    }

    setLoading(true);
    showToast("Đang cưỡi mây tải nhạc lên... ☁", "info");

    try {
      // 1. Cloudinary upload
      const formData = new FormData();
      formData.append("file", mp3File);
      formData.append("upload_preset", "dreamy_garden_preset");

      const response = await fetch("https://api.cloudinary.com/v1_1/i7upt5gk/auto/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload MP3 to Cloudinary");
      }

      const data = await response.json();
      const secureUrl = data.secure_url;

      // 2. Save metadata to Firestore
      const newSongData = {
        title: songTitle.trim(),
        artist: songArtist.trim(),
        url: secureUrl,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, "songs"), newSongData);
      const newSong: Song = { id: docRef.id, ...newSongData };

      // Update Local State
      setSongs((prev) => [newSong, ...prev]);
      showToast("Bài hát mới đã được gieo mầm thành công! 🌱🎵", "success");

      // Reset fields
      setSongTitle("");
      setSongArtist("");
      setMp3File(null);
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
      showToast("Có lỗi xảy ra khi tải nhạc lên!", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute bottom-8 left-8 z-[100] flex flex-col gap-2">
      {/* Admin Add Music Button */}
      {isAdmin && (
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-8 h-8 rounded-full bg-white/40 border border-white/60 flex items-center justify-center hover:bg-white/70 hover:scale-110 transition-all text-pink-600 shadow-md self-start"
          title="Tải lên nhạc MP3 mới"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}

      {/* Upload Music Form */}
      {showAddForm && isAdmin && (
        <form
          onSubmit={handleAddSong}
          className="p-4 rounded-2xl glass-panel-ultra shadow-xl w-64 text-slate-800 border border-pink-200 flex flex-col gap-2 mb-2"
        >
          <div className="text-[11px] uppercase tracking-wider font-bold text-pink-600">
            Thêm nhạc vào vườn 🎵
          </div>
          <input
            type="text"
            placeholder="Tên bài hát"
            value={songTitle}
            onChange={(e) => setSongTitle(e.target.value)}
            className="w-full bg-white/50 border border-pink-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:bg-white"
          />
          <input
            type="text"
            placeholder="Nghệ sĩ"
            value={songArtist}
            onChange={(e) => setSongArtist(e.target.value)}
            className="w-full bg-white/50 border border-pink-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:bg-white"
          />
          <div className="relative">
            <input
              type="file"
              accept="audio/mp3, audio/*"
              onChange={(e) => setMp3File(e.target.files?.[0] || null)}
              className="text-[10px] text-slate-600 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:bg-pink-100 file:text-pink-700 hover:file:bg-pink-200 cursor-pointer"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pink-400 hover:bg-pink-500 text-white font-bold py-1 rounded-lg text-xs transition-colors flex items-center justify-center gap-1"
          >
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Đang cưỡi mây...
              </>
            ) : (
              "Lưu vào vườn"
            )}
          </button>
        </form>
      )}

      <div className="flex items-center gap-3">
        {/* Tulip Playback Button */}
        <div
          onClick={togglePlay}
          className={`w-12 h-12 bg-white/30 rounded-full flex items-center justify-center shadow-lg border border-white/50 cursor-pointer transition-all duration-500 hover:scale-110 active:scale-95 select-none ${
            isPlaying ? "tulip-glow bg-pink-100/50" : "bg-white/30"
          }`}
          title={isPlaying ? "Tạm dừng" : "Phát nhạc"}
        >
          <span className="text-2xl filter drop-shadow-sm transform active:scale-125 transition-transform">
            🌷
          </span>
        </div>

        {/* Song Marquee Capsule */}
        <div 
          onClick={handleNext}
          className="bg-white/30 backdrop-blur-md border border-white/40 px-5 py-1.5 rounded-full flex flex-col cursor-pointer hover:bg-white/40 transition-colors shadow-sm max-w-[170px] md:max-w-[200px]"
          title="Bấm để chuyển bài tiếp theo"
        >
          <div className="flex items-center gap-1">
            <Music className="w-2.5 h-2.5 text-pink-500 animate-bounce" />
            <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500">
              {isPlaying ? "Playing" : "Paused"}
            </span>
          </div>
          <div className="overflow-hidden w-28 md:w-36 whitespace-nowrap relative">
            <span 
              className={`text-[11px] font-bold text-slate-700 inline-block ${
                isPlaying ? "animate-marquee" : ""
              }`}
              style={{
                animationDuration: "12s",
                animationIterationCount: "infinite",
                animationTimingFunction: "linear"
              }}
            >
              {songs[currentSongIndex]?.title} - {songs[currentSongIndex]?.artist}
            </span>
          </div>
        </div>
      </div>

      {/* Hidden Audio Ref */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        style={{ display: "none" }}
      />

      {/* Audio style tag for Marquee */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 12s linear infinite;
          display: inline-block;
          padding-left: 100%;
        }
      `}</style>
    </div>
  );
}
