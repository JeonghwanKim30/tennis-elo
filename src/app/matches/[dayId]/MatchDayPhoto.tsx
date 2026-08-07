"use client";

import { useState, useTransition } from "react";
import { uploadMatchDayPhotoAction, deleteMatchDayPhotoAction } from "./actions";

const MAX_DIMENSION = 1600;

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

// 아바타와 달리 정사각형으로 자르지 않고, 긴 변이 MAX_DIMENSION을 넘을 때만
// 비율을 유지한 채 줄인다(현장 사진은 원래 구도를 살리는 게 자연스럽다).
function resizeToDataUrl(img: HTMLImageElement): string {
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.round(img.naturalWidth * scale);
  const height = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unsupported");
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function MatchDayPhoto({
  dayId,
  dateLabel,
  initialSrc,
  canManage,
}: {
  dayId: string;
  dateLabel: string;
  initialSrc: string | null;
  canManage: boolean;
}) {
  const [src, setSrc] = useState(initialSrc);
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
      dataUrl = resizeToDataUrl(img);
    } catch {
      setError("이미지를 읽을 수 없습니다.");
      return;
    }

    setSrc(dataUrl);
    startTransition(async () => {
      const result = await uploadMatchDayPhotoAction(dayId, dataUrl);
      if (result.error) setError(result.error);
    });
  }

  function handleDelete() {
    setSrc(null);
    startTransition(() => {
      deleteMatchDayPhotoAction(dayId);
    });
  }

  if (!src) {
    if (!canManage) return null;
    return (
      <section className="surface-card p-4">
        <label className="btn-press touch-target flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border py-6 text-sm font-medium text-muted-foreground">
          {pending ? "업로드 중..." : "📷 현장 사진 등록"}
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </section>
    );
  }

  return (
    <section className="surface-card space-y-2 p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={`${dateLabel} 현장 사진`} className="w-full rounded-xl object-cover" />
      <div className="flex flex-wrap justify-end gap-2">
        <a
          href={src}
          download={`teddi-b-${dateLabel}.jpg`}
          className="btn-press touch-target rounded-full bg-muted px-4 py-2 text-xs font-medium text-foreground/70"
        >
          다운로드
        </a>
        {canManage && (
          <>
            <label className="btn-press touch-target cursor-pointer rounded-full bg-muted px-4 py-2 text-xs font-medium text-primary">
              {pending ? "업로드 중..." : "다른 사진으로 교체"}
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
            <button
              type="button"
              onClick={handleDelete}
              className="btn-press touch-target rounded-full bg-destructive/10 px-4 py-2 text-xs font-medium text-destructive"
            >
              삭제
            </button>
          </>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </section>
  );
}
