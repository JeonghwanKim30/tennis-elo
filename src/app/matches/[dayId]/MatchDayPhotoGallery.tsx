"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { uploadMatchDayPhotoAction, deleteMatchDayPhotoAction } from "./actions";
import { type LightboxPhoto } from "./PhotoLightbox";
import { MAX_PHOTOS_PER_DAY } from "./photoConfig";

// 핀치줌/팬 제스처 로직이 있는 무거운 컴포넌트라, 썸네일을 실제로 클릭하기
// 전까지는 이 페이지의 초기 번들에 포함시키지 않는다(포털로 body에 그리는
// 모달이라 SSR로 미리 그릴 이유도 없다).
const PhotoLightbox = dynamic(() => import("./PhotoLightbox").then((m) => m.PhotoLightbox), {
  ssr: false,
});

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

// 정사각형 썸네일 그리드(최대 10장) + 클릭 시 라이트박스. 업로드는 여러 장을
// 한 번에 골라도 하나씩 순서대로 낙관적으로 추가하고 서버 액션을 호출한다.
export function MatchDayPhotoGallery({
  dayId,
  dateLabel,
  initialPhotos,
  canManage,
}: {
  dayId: string;
  dateLabel: string;
  initialPhotos: LightboxPhoto[];
  canManage: boolean;
}) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setError(null);

    const remaining = MAX_PHOTOS_PER_DAY - photos.length;
    if (remaining <= 0) {
      setError(`사진은 최대 ${MAX_PHOTOS_PER_DAY}장까지 등록할 수 있습니다.`);
      return;
    }

    for (const file of files.slice(0, remaining)) {
      let dataUrl: string;
      try {
        const img = await loadImage(file);
        dataUrl = resizeToDataUrl(img);
      } catch {
        setError("이미지를 읽을 수 없습니다.");
        continue;
      }

      const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setPhotos((prev) => [...prev, { id: tempId, src: dataUrl }]);
      startTransition(async () => {
        const result = await uploadMatchDayPhotoAction(dayId, dataUrl);
        if (result.error) {
          setError(result.error);
          setPhotos((prev) => prev.filter((p) => p.id !== tempId));
        } else if (result.id) {
          const confirmedId = result.id;
          setPhotos((prev) => prev.map((p) => (p.id === tempId ? { id: confirmedId, src: dataUrl } : p)));
        }
      });
    }
  }

  // 라이트박스에서 삭제하면 팝업이 그대로 닫히지 않고, 삭제된 자리에 있던
  // "다음 사진"을 바로 보여준다(배열이 한 칸씩 당겨지므로 같은 인덱스를 유지하면
  // 자연스럽게 다음 사진이 나온다). 다음 사진이 없으면(맨 끝을 지운 경우) 새로운
  // 마지막 인덱스 = 이전 사진을 보여주고, 그마저도 없으면(전부 삭제) 팝업을 닫는다.
  function handleDelete(photoId: string) {
    setPhotos((prev) => {
      const deletedIndex = prev.findIndex((p) => p.id === photoId);
      const next = prev.filter((p) => p.id !== photoId);
      setLightboxIndex((prevIndex) => {
        if (prevIndex === null) return null;
        if (next.length === 0) return null;
        const anchor = deletedIndex === -1 ? prevIndex : deletedIndex;
        return Math.min(anchor, next.length - 1);
      });
      return next;
    });
    startTransition(() => {
      deleteMatchDayPhotoAction(photoId);
    });
  }

  if (photos.length === 0 && !canManage) return null;

  return (
    <section className="surface-card space-y-3 p-4">
      <h2 className="text-sm font-semibold text-muted-foreground">
        현장 사진 ({photos.length}/{MAX_PHOTOS_PER_DAY})
      </h2>

      <div className="grid grid-cols-4 gap-2">
        {photos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setLightboxIndex(i)}
            className="btn-press aspect-square overflow-hidden rounded-lg"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.src} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
        {canManage && photos.length < MAX_PHOTOS_PER_DAY && (
          <label className="btn-press touch-target flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground">
            <span className="text-lg leading-none">＋</span>
            <span className="text-[10px]">{pending ? "업로드 중" : "사진 추가"}</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
          </label>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}

      {lightboxIndex !== null &&
        photos[lightboxIndex] &&
        createPortal(
          <PhotoLightbox
            photos={photos}
            index={lightboxIndex}
            dateLabel={dateLabel}
            canManage={canManage}
            onClose={() => setLightboxIndex(null)}
            onIndexChange={setLightboxIndex}
            onDelete={handleDelete}
          />,
          document.body
        )}
    </section>
  );
}
