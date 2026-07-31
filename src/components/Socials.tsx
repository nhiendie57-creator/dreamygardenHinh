import React, { useState, useEffect } from "react";
import { Heart, Sparkles, Facebook, MessageCircle, Star, Instagram, Twitter, Globe, Link as LinkIcon, Edit3, Trash2, Plus, Save, X, Image as ImageIcon, AlignLeft } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";

const IconMap: Record<string, React.ElementType> = {
  Facebook, MessageCircle, Star, Instagram, Twitter, Globe, Link: LinkIcon,
};

interface SocialLink {
  id: string;
  name: string;
  handle: string;
  url: string;
  color: string;
  iconName: string;
}

export default function Socials({ currentUser }: { currentUser?: any }) {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // State quản lý Avatar và Bio
  const [creatorInfo, setCreatorInfo] = useState({
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    bio: `"Chào bạn mộng mơ! Cảm ơn bạn đã ghé thăm thế giới nhỏ bé chứa đựng toàn bộ sự kì diệu của tớ. Hy vọng vườn cây này có thể mang lại cho bạn sự yên bình và dũng khí."`
  });
  
  const [newLink, setNewLink] = useState({
    name: "", handle: "", url: "", iconName: "Link", color: "from-pink-400 to-purple-400"
  });

  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const docRef = doc(db, "settings", "socials");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.links) setLinks(data.links);
          if (data.creatorInfo) setCreatorInfo(data.creatorInfo);
        } else {
          const defaultLinks = [
            { id: "1", name: "Facebook", handle: "Ngu Hinh (Dreamy Garden)", url: "https://facebook.com", color: "from-blue-400 to-indigo-500", iconName: "Facebook" },
            { id: "2", name: "Discord", handle: "Cộng đồng mộng mơ", url: "https://discord.com", color: "from-indigo-400 to-purple-500", iconName: "MessageCircle" },
          ];
          setLinks(defaultLinks);
          await setDoc(docRef, { links: defaultLinks, creatorInfo });
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu Socials:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLinks();
  }, []);

  const saveToFirebase = async (updatedLinks: SocialLink[], updatedCreatorInfo = creatorInfo) => {
    try {
      await setDoc(doc(db, "settings", "socials"), { 
        links: updatedLinks, 
        creatorInfo: updatedCreatorInfo 
      }, { merge: true });
      setLinks(updatedLinks);
      setCreatorInfo(updatedCreatorInfo);
    } catch (error) {
      alert("Có lỗi khi lưu lên hệ thống mây trời ☁️");
    }
  };

  const handleDelete = (id: string) => {
    const updated = links.filter(link => link.id !== id);
    saveToFirebase(updated);
  };

  const handleAddLink = () => {
    if (!newLink.name || !newLink.url) {
      alert("Hãy nhập ít nhất tên và đường link nhé! 🌸");
      return;
    }
    const updated = [...links, { ...newLink, id: Date.now().toString() }];
    saveToFirebase(updated);
    setNewLink({ name: "", handle: "", url: "", iconName: "Link", color: "from-pink-400 to-purple-400" });
  };

  const handleSaveCreatorInfo = () => {
    saveToFirebase(links, creatorInfo);
    alert("Đã lưu Avatar và Lời dẫn thành công! ✨");
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 z-10 flex flex-col gap-6 relative text-slate-800">
      
      <div className="text-center relative">
        <h2 className="text-3xl font-display text-white text-glow-pearl flex items-center justify-center gap-2">
          <Heart className="w-6 h-6 text-pink-400 fill-pink-400 animate-pulse" />
          Kênh Truyền Thông Mơ Mộng
        </h2>
        <p className="text-xs text-slate-700/80 font-medium mt-1">
          Theo dõi bước chân của Ngu Hinh bên ngoài ranh giới của khu vườn kẹo ngọt...
        </p>

        {currentUser?.isAdmin && (
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={`absolute top-0 right-0 md:-right-8 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${isEditing ? 'bg-pink-500 text-white shadow-lg' : 'bg-white/50 text-pink-600 hover:bg-white/80'}`}
          >
            {isEditing ? <X className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
            {isEditing ? "Đóng" : "Sửa"}
          </button>
        )}
      </div>

      <div className="bg-white/20 backdrop-blur-lg border border-white/40 p-6 md:p-8 rounded-[36px] shadow-2xl flex flex-col items-center gap-6">
        
        {/* Creator Info */}
        <div className="flex flex-col items-center text-center gap-2 w-full">
          <div className="relative w-24 h-24 select-none">
            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-green-300 via-pink-300 to-purple-300 blur-sm animate-wave-rotate opacity-75" />
            <div className="absolute -inset-1 rounded-full liquid-border" />
            <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-white bg-slate-100 z-10">
              <img
                src={creatorInfo.avatar}
                alt="Ngu Hinh"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <h3 className="text-xl font-bold font-display text-slate-900 flex items-center gap-1.5">
            Ngu Hinh <Sparkles className="w-4 h-4 text-pink-400" />
          </h3>
          <p className="text-xs italic text-slate-600 font-semibold uppercase tracking-wider">
            @nguhinh_2026 • CREATOR OF DREAMY GARDEN
          </p>
          <div className="max-w-md text-xs text-slate-700 leading-relaxed font-semibold">
            {creatorInfo.bio}
          </div>
        </div>

        {/* Khung chỉnh sửa Avatar & Bio (Dành cho Admin) */}
        {isEditing && currentUser?.isAdmin && (
          <div className="w-full max-w-md bg-white/50 border border-pink-200 p-4 rounded-2xl flex flex-col gap-3">
            <h4 className="text-xs font-bold text-pink-700 flex items-center gap-1.5"><ImageIcon className="w-4 h-4"/> Chỉnh sửa Profile</h4>
            <input 
              type="text" 
              placeholder="Link ảnh Avatar (URL)..." 
              value={creatorInfo.avatar} 
              onChange={e => setCreatorInfo({...creatorInfo, avatar: e.target.value})} 
              className="p-2 text-xs rounded-lg bg-white/80 border-none outline-pink-300 w-full"
            />
            <textarea 
              placeholder="Lời dẫn (Bio)..." 
              value={creatorInfo.bio} 
              onChange={e => setCreatorInfo({...creatorInfo, bio: e.target.value})} 
              className="p-2 text-xs rounded-lg bg-white/80 border-none outline-pink-300 w-full resize-none h-20"
            />
            <button onClick={handleSaveCreatorInfo} className="w-full p-2 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-colors">
              <Save className="w-4 h-4"/> Lưu Profile
            </button>
          </div>
        )}

        {/* Khung hiển thị Links */}
        <div className="w-full">
          {isLoading ? (
            <div className="flex justify-center p-4"><span className="w-6 h-6 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {links.map((link) => {
                const Icon = IconMap[link.iconName] || IconMap.Link;
                return (
                  <div key={link.id} className="relative group">
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className={`p-4 rounded-2xl bg-white/40 hover:bg-white/70 border border-white/50 transition-all duration-300 flex items-center gap-4 ${!isEditing && 'hover:scale-[1.03] hover:shadow-lg'}`}>
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${link.color} text-white flex items-center justify-center shadow-md transform group-hover:rotate-6 transition-transform`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="text-left overflow-hidden">
                        <h4 className="text-sm font-bold text-slate-800 group-hover:text-pink-600 transition-colors truncate">{link.name}</h4>
                        <p className="text-[10px] text-slate-500 font-bold tracking-wide truncate">{link.handle}</p>
                      </div>
                    </a>
                    {isEditing && (
                      <button onClick={() => handleDelete(link.id)} className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 animate-pulse">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Form thêm Link */}
        {isEditing && currentUser?.isAdmin && (
           /* ... (Giữ nguyên form thêm link của chị ở đây) ... */
           <div className="w-full mt-4 p-4 bg-white/50 border border-pink-200 rounded-2xl flex flex-col gap-3">
             <h4 className="text-xs font-bold text-pink-700 flex items-center gap-1.5"><Plus className="w-4 h-4"/> Thêm liên kết mới</h4>
             {/* Các input thêm link y hệt như code cũ của chị */}
             <div className="grid grid-cols-2 gap-3 text-xs">
              <input type="text" placeholder="Tên (VD: Facebook)" value={newLink.name} onChange={e => setNewLink({...newLink, name: e.target.value})} className="p-2 rounded-lg bg-white/80 border-none outline-pink-300"/>
              <input type="text" placeholder="Mô tả (VD: Vũ trụ nhân vật)" value={newLink.handle} onChange={e => setNewLink({...newLink, handle: e.target.value})} className="p-2 rounded-lg bg-white/80 border-none outline-pink-300"/>
              <input type="text" placeholder="Đường link URL..." value={newLink.url} onChange={e => setNewLink({...newLink, url: e.target.value})} className="p-2 rounded-lg bg-white/80 border-none outline-pink-300 col-span-2"/>
              
              <select value={newLink.iconName} onChange={e => setNewLink({...newLink, iconName: e.target.value})} className="p-2 rounded-lg bg-white/80 border-none outline-pink-300 text-slate-600">
                <option value="Facebook">Icon: Facebook</option>
                <option value="MessageCircle">Icon: Discord / Nhắn tin</option>
                <option value="Star">Icon: Ngôi sao</option>
                <option value="Instagram">Icon: Instagram</option>
                <option value="Globe">Icon: Quả địa cầu</option>
                <option value="Link">Icon: Mắt xích (Mặc định)</option>
              </select>
              
              <select value={newLink.color} onChange={e => setNewLink({...newLink, color: e.target.value})} className="p-2 rounded-lg bg-white/80 border-none outline-pink-300 text-slate-600">
                <option value="from-blue-400 to-indigo-500">Màu: Xanh Dương (FB)</option>
                <option value="from-indigo-400 to-purple-500">Màu: Tím (Discord)</option>
                <option value="from-amber-300 to-orange-400">Màu: Vàng Cam (Star)</option>
                <option value="from-pink-400 to-rose-400">Màu: Hồng (Insta)</option>
                <option value="from-slate-700 to-slate-900">Màu: Đen Xám</option>
              </select>
            </div>
            <button onClick={handleAddLink} className="w-full p-2 mt-2 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors">
              <Save className="w-4 h-4"/> Lưu liên kết mới
            </button>
           </div>
        )}
      </div>
    </div>
  );
}
