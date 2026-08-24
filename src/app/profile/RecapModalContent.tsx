"use client";

import { useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { toBlob } from "html-to-image";
import { kstDateString } from "@/lib/date";
import { getRecapStatsAction, type RecapCardData } from "./actions";
import { RecapCard } from "./RecapCard";

function oneMonthAgo(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return kstDateString(d);
}

function isIOS(): boolean {
  return typeof navigator !== "undefined" && /iP(hone|od|ad)/.test(navigator.userAgent);
}

export function RecapModalContent({ onClose }: { onClose: () => void }) {
  const [startDate, setStartDate] = useState(oneMonthAgo);
  const [endDate, setEndDate] = useState(kstDateString);
  const [data, setData] = useState<RecapCardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  function handleGenerate() {
    setError(null);
    setDownloadError(null);
    startTransition(async () => {
      const result = await getRecapStatsAction(startDate, endDate);
      if (result.error) {
        setError(result.error);
        setData(null);
        return;
      }
      setData(result.data ?? null);
    });
  }

  async function handleDownload() {
    if (!cardRef.current || !data) return;
    setDownloadError(null);
    setDownloading(true);
    try {
      // pixelRatio를 올려 실제 화면 크기보다 고화질로 캡처한다(공유용 이미지 품질 확보).
      // fontEmbedCSS를 빈 문자열로 명시해 html-to-image의 자동 폰트 스캔(문서 전체
      // 스타일시트를 뒤져 쓰이지도 않는 폰트까지 전부 fetch해 base64로 박아 넣는
      // 과정)을 건너뛴다 — 이미 로드된 폰트로도 캡처는 정상적으로 되고, 스캔 자체가
      // 느릴 때가 있어 굳이 기다릴 이유가 없다.
      // html-to-image는 내부적으로 requestAnimationFrame으로 캔버스 렌더링 완료를
      // 기다리는데, 브라우저 탭이 백그라운드(비활성)면 rAF가 거의 멈춰서 완료
      // 콜백이 한참 늦게 오거나 사실상 응답이 없는 것처럼 보일 수 있다 — 사용자가
      // 버튼을 누른 뒤 다른 탭으로 전환해버리는 경우도 마찬가지다. 그래서 일정
      // 시간 안에 끝나지 않으면 타임아웃으로 포기하고 명확한 에러+재시도 안내를
      // 보여준다(무한 로딩 상태로 방치하지 않는다).
      const CAPTURE_TIMEOUT_MS = 20_000;
      const capture = toBlob(cardRef.current, { pixelRatio: 2, cacheBust: true, fontEmbedCSS: "" });
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), CAPTURE_TIMEOUT_MS)
      );
      const blob = await Promise.race([capture, timeout]);
      if (!blob) throw new Error("이미지를 생성하지 못했습니다.");
      const url = URL.createObjectURL(blob);
      const filename = `teddib-recap_${data.periodStart}_${data.periodEnd}.png`;
      if (isIOS()) {
        // iOS Safari는 <a download>를 무시하는 경우가 많아, 새 탭에서 열어
        // "길게 눌러 사진에 저장"으로 저장할 수 있게 한다.
        window.open(url, "_blank");
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      setDownloadError("이미지 저장에 실패했습니다. 화면을 계속 보고 있는 상태에서 다시 시도해주세요.");
    } finally {
      setDownloading(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="surface-card w-full max-w-sm space-y-4 p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recap-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id="recap-modal-title" className="text-lg font-bold">
            📊 리캡 카드 만들기
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="btn-press touch-target flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            ×
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex-1 text-xs text-muted-foreground">
            시작일
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full appearance-none rounded-xl border border-border px-3 py-2 text-sm"
            />
          </label>
          <label className="flex-1 text-xs text-muted-foreground">
            종료일
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={kstDateString()}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full appearance-none rounded-xl border border-border px-3 py-2 text-sm"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={pending}
          className="btn-press touch-target w-full rounded-full bg-primary py-2.5 text-sm font-medium text-white shadow-md shadow-primary/25 disabled:opacity-50"
        >
          {pending ? "집계 중..." : "리캡 카드 생성"}
        </button>

        {error && <p className="text-center text-xs text-destructive">{error}</p>}

        {data && (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <RecapCard ref={cardRef} data={data} />
            </div>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="btn-press touch-target w-full rounded-full bg-[#1f3b30] py-3 text-sm font-medium text-white shadow-md disabled:opacity-50"
            >
              {downloading ? "저장 중..." : "리캡 카드 이미지 저장 (PNG)"}
            </button>
            {downloadError && <p className="text-center text-xs text-destructive">{downloadError}</p>}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
