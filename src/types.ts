export type TabType = "home" | "characters" | "confession" | "notes" | "socials";

export interface UserProfile {
  username: string;
  passcode: string;
  currentStreak: number;
  lastManifestDate?: string | null; // Format: YYYY-MM-DD or ISO
  createdAt?: any;
}

export interface Character {
  id: string;
  name: string;
  role: string;
  avatar: string;
  plot: string;
  tags: string[];
  likes: number;
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
