export type TabType = "home" | "characters" | "confession" | "notes" | "manifestation" | "garden" | "socials";

// --- CÁC TYPE CHO TÍNH NĂNG VƯỜN HOA ---
export type KeyTier = "bronze" | "silver" | "gold" | "diamond";

export interface UserKeys {
  bronze: number;
  silver: number;
  gold: number;
  diamond: number;
}

export interface GardenPlotState {
  seedType: "common" | "rare" | "epic";
  plantedAt: number; // Lưu timestamp lúc gieo hạt
}

export interface GardenState {
  commonPlot: GardenPlotState | null;
  shopPlots: (GardenPlotState | null)[];
  lastFreeSeedDate: string; // Format: "YYYY-MM-DD"
}
// ----------------------------------------

export interface ManifestEntry {
  wish: string;
  date: string; // ISO string
}

export interface UserProfile {
  username: string;
  passcode: string;
  currentStreak: number;
  highestStreak?: number; // Kỷ lục streak cao nhất từng đạt được - không bao giờ giảm, dùng để mở khóa nhân vật theo mốc
  lastManifestDate?: string | null; // Format: YYYY-MM-DD or ISO
  manifestHistory?: ManifestEntry[]; // Lịch sử các điều ước đã gửi
  uid?: string;
  id?: string;
  createdAt?: any;
  
  // Các trường dữ liệu dành cho Sổ Tay Trồng Hoa
  petals?: number; // Số lượng cánh hoa đang có
  garden?: GardenState; // Trạng thái vườn hiện tại (các chậu cây)
  keys?: UserKeys; // Số lượng từng loại chìa khóa thu thập được
  streak?: number; // Đồng bộ streak nhận được từ vườn hoa
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
  requiredStreak?: number; // Mốc số ngày streak cần đạt để mở khóa link, do admin tự đặt riêng cho từng nhân vật (0/undefined = không yêu cầu)
  unlockLink?: string; // Link được mở ra khi user đạt đủ mốc requiredStreak
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
