import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { motion } from "motion/react";
import { Check, X, ZoomIn } from "lucide-react";

interface CropPixelArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageCropModalProps {
  imageSrc: string;
  aspect?: number; // 1 = vuông (mặc định)
  cropShape?: "rect" | "round";
  onCancel: () => void;
  onCropDone: (blob: Blob) => void;
}

// Tải ảnh gốc lên bộ nhớ để vẽ vào canvas
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (err) => reject(err));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

// Cắt đúng vùng user chọn ra thành 1 ảnh vuông mới (canvas), trả về Blob để upload
async function getCroppedImageBlob(
  imageSrc: string,
  area: CropPixelArea,
  outputSize = 800
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Không thể tạo canvas để cắt ảnh");

  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    outputSize,
    outputSize
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Cắt ảnh thất bại"));
      },
      "image/jpeg",
      0.92
    );
  });
}

export default function ImageCropModal({
  imageSrc,
  aspect = 1,
  cropShape = "round",
  onCancel,
  onCropDone,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropPixelArea | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleCropComplete = useCallback((_area: any, areaPixels: CropPixelArea) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
      onCropDone(blob);
    } catch (err) {
      console.error(err);
      setProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-[28px] p-5 max-w-md w-full shadow-2xl flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">✂️ Cắt Ảnh</h3>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <div className="relative w-full h-72 bg-slate-900 rounded-2xl overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={cropShape}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>

        <div className="flex items-center gap-2">
          <ZoomIn className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-pink-400"
          />
        </div>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={processing || !croppedAreaPixels}
            className="px-4 py-2 bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 transition-all"
          >
            <Check className="w-3.5 h-3.5" />
            {processing ? "Đang xử lý..." : "Xác Nhận Cắt"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
