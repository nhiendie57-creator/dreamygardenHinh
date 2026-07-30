import React, { useState, useEffect, useRef } from "react";
import { collection, getDocs, addDoc, query, orderBy } from "firebase/firestore";
import { db } from "../config/firebase";
import { Song } from "../types";
import { Plus, Loader2, Music, ListMusic, Link as LinkIcon, UploadCloud } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MusicPlayerProps {
  isAdmin: boolean;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

const DEFAULT_SONGS: Song[] = [];
export default function MusicPlayer({ isAdmin, showToast }: MusicPlayerProps) {
  const [songs, setSongs] = useState<Song[]>(DEFAULT_SONGS);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // UI States
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadMode, setUploadMode] = useState<"url" | "file">("file"); // Ưu tiên tab tải file

  // Form States
  const [songTitle, setSongTitle] = useState("");
  const [songArtist, setSongArtist] = useState("");
  const [songUrl, setSongUrl] = useState("");
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
        showToast("Không thể phát bài hát này. Hãy thử chọn bài khác!", "error");
      });
    }
  };

  const handleNext = () => {
    setCurrentSongIndex((prevIndex) => (prevIndex + 1) % songs.length);
  };

  const handleAudioEnded = () => {
    handleNext();
  };

  const playSpecificSong = (index: number) => {
    setCurrentSongIndex(index);
    setIsPlaying(true);
    setShowPlaylist(false);
  };

  // Tải nhạc: Kết hợp đúng chuẩn Cloudinary + Firebase giống web cũ
  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!songTitle || !songArtist) {
      showToast("Vui lòng nhập tên bài hát và nghệ sĩ!", "error");
      return;
    }

    setLoading(true);
    let finalUrl = "";

    try {
      if (uploadMode === "url") {
        if (!songUrl) {
          showToast("Vui lòng dán link MP3!", "error");
          setLoading(false);
          return;
        }
        finalUrl = songUrl;
      } else {
        if (!mp3File) {
          showToast("Vui lòng chọn file MP3!", "error");
          setLoading(false);
          return;
        }
        showToast("Đang tải file MP3 lên Cloudinary... ☁", "info");
        const formData = new FormData();
        formData.append("file", mp3File);
        formData.append("upload_preset", "dreamy_garden_preset");

        // Gọi thẳng vào endpoint 'video' vì Cloudinary xếp file âm thanh là video
        const response = await fetch("https://api.cloudinary.com/v1_1/i7upt5gk/video/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Lỗi tải MP3 lên Cloudinary");
        const data = await response.json();
        finalUrl = data.secure_url; // Lấy link Cloudinary trả về
      }

      // Lưu Link vừa lấy được vào Firestore Firebase
      const newSongData = {
        title: songTitle.trim(),
        artist: songArtist.trim(),
        url: finalUrl,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, "songs"), newSongData);
      const newSong: Song = { id: docRef.id, ...newSongData };

      // Update Local State
      setSongs((prev) => [newSong, ...prev]);
      showToast("Bài hát mới đã được thêm vào vườn! 🌱🎵", "success");

      // Reset fields
      setSongTitle("");
      setSongArtist("");
      setSongUrl("");
      setMp3File(null);
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
      showToast("Có lỗi xảy ra khi lưu nhạc!", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute bottom-8 left-8 z-[100] flex flex-col gap-3">
      
      {/* Admin Add Music Button */}
      {isAdmin && (
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-8 h-8 rounded-full bg-white/40 border border-white/60 flex items-center justify-center hover:bg-white/70 hover:scale-110 transition-all text-pink-600 shadow-md self-start"
          title="Thêm nhạc vào vườn"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}

      {/* Upload Music Form */}
      <AnimatePresence>
        {showAddForm && isAdmin && (
          <motion.form
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            onSubmit={handleAddSong}
            className="p-4 rounded-2xl glass-panel-ultra shadow-xl w-72 text-slate-800 border border-pink-200 flex flex-col gap-3 mb-2"
          >
            <div className="text-[11px] uppercase tracking-wider font-bold text-pink-600 border-b border-pink-100 pb-2">
              Thêm nhạc vào vườn 🎵
            </div>
            
            {/* Toggle Upload Mode */}
            <div className="flex bg-white/50 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setUploadMode("file")}
                className={`flex-1 text-[10px] font-bold py-1.5 rounded-md flex items-center justify-center gap-1 transition-colors ${uploadMode === "file" ? "bg-pink-100 text-pink-600 shadow-sm" : "text-slate-500 hover:bg-white/40"}`}
              >
                <UploadCloud className="w-3 h-3" /> Tải File MP3
              </button>
              <button
                type="button"
                onClick={() => setUploadMode("url")}
                className={`flex-1 text-[10px] font-bold py-1.5 rounded-md flex items-center justify-center gap-1 transition-colors ${uploadMode === "url" ? "bg-pink-100 text-pink-600 shadow-sm" : "text-slate-500 hover:bg-white/40"}`}
              >
                <LinkIcon className="w-3 h-3" /> Dán Link
              </button>
            </div>

            <input
              type="text"
              required
              placeholder="Tên bài hát"
              value={songTitle}
              onChange={(e) => setSongTitle(e.target.value)}
              className="w-full bg-white/60 border border-pink-200/50 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:bg-white"
            />
            <input
              type="text"
              required
              placeholder="Nghệ sĩ"
              value={songArtist}
              onChange={(e) => setSongArtist(e.target.value)}
              className="w-full bg-white/60 border border-pink-200/50 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:bg-white"
            />

            {uploadMode === "url" ? (
              <input
                type="url"
                required
                placeholder="Dán link nhạc vào đây"
                value={songUrl}
                onChange={(e) => setSongUrl(e.target.value)}
                className="w-full bg-white/60 border border-pink-200/50 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:bg-white"
              />
            ) : (
              <input
                type="file"
                accept="audio/mp3, audio/*"
                onChange={(e) => setMp3File(e.target.files?.[0] || null)}
                className="text-[10px] text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-pink-100 file:text-pink-700 hover:file:bg-pink-200 cursor-pointer w-full"
              />
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-1.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1 shadow-md"
            >
              {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang lưu...</> : "Lưu vào vườn"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3 relative">
        
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

        {/* Playlist Toggle Button */}
        <button
          onClick={() => setShowPlaylist(!showPlaylist)}
          className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-300 shadow-sm ${
            showPlaylist ? "bg-pink-400 border-pink-400 text-white" : "bg-white/30 border-white/40 text-slate-700 hover:bg-white/50"
          }`}
          title="Danh sách bài hát"
        >
          <ListMusic className="w-4 h-4" />
        </button>

        {/* Playlist Popup Menu */}
        <AnimatePresence>
          {showPlaylist && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              className="absolute bottom-16 left-16 w-64 bg-white/70 backdrop-blur-xl border border-white/60 rounded-3xl shadow-2xl p-4 flex flex-col gap-2 z-50 overflow-hidden"
            >
              <h3 className="text-xs font-bold text-pink-600 uppercase tracking-widest border-b border-pink-200/50 pb-2 mb-1 flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5" />
                Danh Sách Nhạc
              </h3>
              
              <div className="max-h-48 overflow-y-auto custom-scroll flex flex-col gap-1 pr-1">
                {songs.map((song, index) => (
                  <button
                    key={song.id}
                    onClick={() => playSpecificSong(index)}
                    className={`text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                      index === currentSongIndex 
                        ? "bg-pink-400 text-white shadow-md" 
                        : "text-slate-700 hover:bg-white/80"
                    }`}
                  >
                    {index === currentSongIndex ? (
                      <Music className="w-3.5 h-3.5 flex-shrink-0 animate-pulse" />
                    ) : (
                      <span className="w-3.5 h-3.5 flex-shrink-0 inline-block text-slate-400 text-[10px] text-center">
                        {index + 1}
                      </span>
                    )}
                    <span className="truncate flex-1">{song.title}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Song Marquee Capsule */}
        <div 
          onClick={handleNext}
          className="bg-white/30 backdrop-blur-md border border-white/40 px-5 py-2 rounded-full flex flex-col cursor-pointer hover:bg-white/40 transition-colors shadow-sm max-w-[150px] md:max-w-[200px]"
          title="Bấm để chuyển bài tiếp theo"
        >
          <div className="flex items-center gap-1">
            <Music className="w-2.5 h-2.5 text-pink-500 animate-bounce" />
            <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500">
              {isPlaying ? "Playing" : "Paused"}
            </span>
          </div>
          <div className="overflow-hidden w-24 md:w-36 whitespace-nowrap relative">
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

      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        style={{ display: "none" }}
      />

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
