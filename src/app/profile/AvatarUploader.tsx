"use client";

import { useState, useTransition } from "react";
import { updateProfileImageAction } from "./actions";

const TARGET_SIZE = 256;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resizeToSquareDataUrl(img: HTMLImageElement, size: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unsupported");

  const minSide = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - minSide) / 2;
  const sy = (img.naturalHeight - minSide) / 2;
  ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function AvatarUploader({ currentSrc }: { currentSrc: string }) {
  const [preview, setPreview] = useState<string>(currentSrc);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);

    let dataUrl: string;
    try {
      const img = await loadImage(file);
      dataUrl = resizeToSquareDataUrl(img, TARGET_SIZE);
    } catch {
      setError("이미지를 읽을 수 없습니다.");
      return;
    }

    setPreview(dataUrl);
    startTransition(async () => {
      const result = await updateProfileImageAction(dataUrl);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={preview}
        alt=""
        className="h-24 w-24 rounded-full border border-gray-200 object-cover"
      />
      <label className="cursor-pointer text-sm text-green-700 underline">
        {pending ? "업로드 중..." : "사진 변경"}
        <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
