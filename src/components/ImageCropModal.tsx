import React, { useState, useRef, useCallback } from "react";
import { motion } from "motion/react";
import { X, Check, ZoomIn } from "lucide-react";

// ============================================================================
// GHI CHÚ: Component này KHÔNG phụ thuộc bất kỳ thư viện ngoài nào (không cần
// react-easy-crop hay bất cứ package nào phải "bun add"/"npm install"). Chỉ
// dùng React state + thẻ <canvas> thuần để cắt ảnh, nên chị có thể dán thẳng
// file này lên GitHub (sửa trực tiếp trên iPad) mà không lo lỗi thiếu module.
//
// Hỗ trợ: kéo 1 ngón để dịch ảnh, pinch 2 ngón để zoom (mượt trên iPad/điện
// thoại), kèm thêm thanh trượt zoom dự phòng cho ai dùng chuột.
// ============================================================================

interface ImageCropModalProps {
  imageSrc: string;
  aspect?: number; // tỉ lệ khung cắt = width / height, mặc định 1 (vuông)
  cropShape?: "round" | "rect"; // chỉ ảnh hưởng viền chỉ dẫn hiển thị, ảnh xuất ra luôn là hình chữ nhật/vuông
  onCancel: () => void;
  onCropDone: (blob: Blob) => void;
}

const FRAME_SIZE = 300; // kích thước khung crop hiển thị trên màn hình (px)
const OUTPUT_SIZE = 640; // cạnh dài của ảnh xuất ra (px)

export default function ImageCropModal({
  imageSrc,
  aspect = 1,
  cropShape = "rect",
  onCancel,
  onCropDone,
}: ImageCropModalProps) {
  const frameW = FRAME_SIZE;
  const frameH = FRAME_SIZE / aspect;

  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1); // 1 -> 3
  const [pos, setPos] = useState({ x: 0, y: 0 }); // toạ độ góc trên-trái của ảnh so với khung (px)
  const [isSaving, setIsSaving] = useState(false);

  const dragState = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const pinchState = useRef<{ startDist: number; startZoom: number } | null>(null);

  // Base scale để ảnh luôn phủ kín khung (giống object-fit: cover) khi zoom = 1
  const baseScale = naturalSize.w > 0 ? Math.max(frameW / naturalSize.w, frameH / naturalSize.h) : 1;
  const scale = baseScale * zoom;
  const dispW = naturalSize.w * scale;
  const dispH = naturalSize.h * scale;

  // Giới hạn vị trí kéo để ảnh luôn phủ kín khung, không lộ khoảng trắng ở rìa
  const clampPos = useCallback(
    (x: number, y: number, w = dispW, h = dispH) => {
      const minX = frameW - w;
      const minY = frameH - h;
      return {
        x: Math.min(0, Math.max(minX, x)),
        y: Math.min(0, Math.max(minY, y)),
      };
    },
    [dispW, dispH, frameW, frameH]
  );

  const handleImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setNaturalSize({ w, h });
    const bScale = Math.max(frameW / w, frameH / h);
    setPos({ x: (frameW - w * bScale) / 2, y: (frameH - h * bScale) / 2 });
    setImgLoaded(true);
  };

  // Kéo bằng chuột hoặc 1 ngón tay
  const handlePointerDown = (e: React.PointerEvent) => {
    if (pinchState.current) return;
    dragState.current = { startX: e.clientX, startY: e.clientY, startPosX: pos.x, startPosY: pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setPos(clampPos(dragState.current.startPosX + dx, dragState.current.startPosY + dy));
  };

  const handlePointerUp = () => {
    dragState.current = null;
  };

  // Pinch 2 ngón để zoom — quan trọng cho trải nghiệm trên iPad/điện thoại
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      dragState.current = null;
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchState.current = { startDist: dist, startZoom: zoom };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchState.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / pinchState.current.startDist;
      const nextZoom = Math.min(3, Math.max(1, pinchState.current.startZoom * ratio));
      setZoom(nextZoom);
      const nextScale = baseScale * nextZoom;
      setPos((p) => clampPos(p.x, p.y, naturalSize.w * nextScale, naturalSize.h * nextScale));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      pinchState.current = null;
    }
  };

  const handleZoomSlider = (val: number) => {
    setZoom(val);
    const nextScale = baseScale * val;
    setPos((p) => clampPos(p.x, p.y, naturalSize.w * nextScale, naturalSize.h * nextScale));
  };

  const handleConfirm = () => {
    if (!imgRef.current || !naturalSize.w) return;
    setIsSaving(true);

    const outW = aspect >= 1 ? OUTPUT_SIZE : Math.round(OUTPUT_SIZE * aspect);
    const outH = aspect >= 1 ? Math.round(OUTPUT_SIZE / aspect) : OUTPUT_SIZE;

    // Quy đổi vùng khung crop (trên màn hình) về toạ độ gốc của ảnh thật
    const sx = -pos.x / scale;
    const sy = -pos.y / scale;
    const sw = frameW / scale;
    const sh = frameH / scale;

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setIsSaving(false);
      return;
    }
    ctx.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, outW, outH);

    canvas.toBlob(
      (blob) => {
        setIsSaving(false);
        if (blob) onCropDone(blob);
      },
      "image/jpeg",
      0.92
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
    >
      <div className="bg-white rounded-[28px] shadow-2xl p-5 max-w-sm w-full flex flex-col items-center gap-4">
        <div className="w-full flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Cắt ảnh</h3>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div
          className="relative overflow-hidden bg-slate-900 touch-none select-none rounded-2xl"
          style={{ width: frameW, height: frameH }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img
            ref={imgRef}
            src={imageSrc}
            onLoad={handleImgLoad}
            alt="crop-target"
            draggable={false}
            className="absolute pointer-events-none"
            style={{
              width: dispW || "auto",
              height: dispH || "auto",
              left: pos.x,
              top: pos.y,
              opacity: imgLoaded ? 1 : 0,
            }}
          />

          {/* Viền chỉ dẫn hình tròn cho avatar — chỉ để tham khảo, ảnh xuất ra vẫn vuông */}
          {cropShape === "round" && (
            <div
              className="absolute inset-0 pointer-events-none rounded-full border-2 border-white/90"
              style={{ boxShadow: "0 0 0 9999px rgba(15,23,42,0.55)" }}
            />
          )}
        </div>

        <div className="w-full flex items-center gap-2 px-1">
          <ZoomIn className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => handleZoomSlider(Number(e.target.value))}
            className="w-full accent-pink-500"
          />
        </div>

        <div className="flex gap-3 w-full">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!imgLoaded || isSaving}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            {isSaving ? "Đang xử lý..." : "Xong, cắt ảnh"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
