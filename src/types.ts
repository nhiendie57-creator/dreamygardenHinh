export type TabType = "home" | "characters" | "confession" | "notes" | "manifestation" | "socials";

export interface UserProfile {
  username: string;
  passcode: string;
  currentStreak: number;
  lastManifestDate?: string | null; // Format: YYYY-MM-DD or ISO
  createdAt?: any;
}

export interface StoryArc {
  id: string;
  title: string;
  content: string;
}

export interface GalleryImage {
  id: string;
  url: string;
  caption?: string;
}

export interface Character {
  id: string;
  name: string;
  role: string;
  avatar: string;
  plot: string;
  tags: string[];
  likes: number;
  status?: "in-progress" | "unlocked" | "locked"; // Trạng thái tiến độ nhân vật
  statusReason?: string; // Lý do khi status = "locked"
  storyArcs?: StoryArc[]; // Mạch truyện bổ sung (ngoại truyện)
  gallery?: GalleryImage[]; // Vibe Gallery - bộ ảnh phong cách nhân vật
  createdAt?: any;
}

export interface ConfessionNote {
  id: string;
  author: string;
  content: string;
  color: string;
  createdAt: any;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  url: string;
  createdAt?: any;
}

export interface AppSettings {
  backgroundImage: string | null;
}
