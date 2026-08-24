"use client";

import { useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { toBlob } from "html-to-image";
import { kstDateString } from "@/lib/date";
import { CloseIcon } from "@/components/icons";
import { getRecapStatsAction, type RecapCardData, type RecapMode } from "./actions";
import { RecapCard } from "./RecapCard";

// 다운로드 PNG는 화면 크기와 무관하게 항상 이 디자인 폭 기준 해상도로
// 나오게 한다(RecapCard.tsx 상단 주석 참고).
const CARD_DESIGN_WIDTH = 360;
const YEAR_OPTIONS_BACK = 3;

function currentMonth(): string {
  return kstDateString().slice(0, 7); // "YYYY-MM-DD" -> "YYYY-MM"
}

function isIOS(): boolean {
  return typeof navigator !== "undefined" && /iP(hone|od|ad)/.test(navigator.userAgent);
}

function splitMonth(monthStr: string): { year: number; month: number } {
  const [y, m] = monthStr.split("-").map(Number);
  return { year: y, month: m };
}

function joinMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function RecapModalContent({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<RecapMode>("month");
  const [startMonth, setStartMonth] = useState(currentMonth);
  const [endMonth, setEndMonth] = useState(currentMonth);
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
      const result = await getRecapStatsAction(mode, mode === "month" ? startMonth : undefined, mode === "month" ? endMonth : undefined);
      if (result.error) {
        setError(result.error);
        setData(null);
        return;
      }
      setData(result.data ?? null);
    });
  }

  function handleChangePeriod() {
    setData(null);
    setDownloadError(null);
  }

  async function handleDownload() {
    if (!cardRef.current || !data) return;
    setDownloadError(null);
    setDownloading(true);
    try {
      // pixelRatio를 올려 실제 화면 크기보다 고화질로 캡처한다(공유용 이미지 품질 확보).
      // width를 항상 CARD_DESIGN_WIDTH로 고정해서, 카드가 좁은 화면에 맞춰
      // 유동적으로 줄어들어 있어도(RecapCard.tsx 참고) 저장되는 PNG는 화면
      // 크기와 무관하게 항상 같은 디자인 해상도로 나오게 한다.
      // fontEmbedCSS를 빈 문자열로 명시해 html-to-image의 자동 폰트 스캔(문서 전체
      // 스타일시트를 뒤져 쓰이지도 않는 폰트까지 전부 fetch해 base64로 박아 넣는
      // 과정)을 건너뛴다 — 이미 로드된 폰트로도 캡처는 정상적으로 되고, 스캔 자체가
      // 느릴 때가 있어 굳이 기다릴 이유가 없다.
      // html-to-image는 내부적으로 requestAnimationFrame으로 캔버스 렌더링 완료를
      // 기다리는데, 브라우저 탭이 백그라운드(비활성)면 rAF가 거의 멈춰서 완료
      // 콜백이 한참 늦게 오거나 사실상 응답이 없는 것처럼 보일 수 있다. 그래서
      // 일정 시간 안에 끝나지 않으면 타임아웃으로 포기하고 명확한 에러+재시도
      // 안내를 보여준다(무한 로딩 상태로 방치하지 않는다).
      const CAPTURE_TIMEOUT_MS = 20_000;
      const capture = toBlob(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        fontEmbedCSS: "",
        width: CARD_DESIGN_WIDTH,
      });
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), CAPTURE_TIMEOUT_MS)
      );
      const blob = await Promise.race([capture, timeout]);
      if (!blob) throw new Error("이미지를 생성하지 못했습니다.");
      const url = URL.createObjectURL(blob);
      const filename = `teddib-recap_${data.periodLabel.replace(/\s/g, "").replace(/~/g, "-")}.png`;
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="surface-card flex max-h-[90vh] w-full max-w-md flex-col gap-3 overflow-y-auto p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recap-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id="recap-modal-title" className="text-base font-bold">
            📊 리캡 카드 만들기
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="btn-press touch-target flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-muted hover:text-gray-600"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {/* 카드를 생성하고 나면 기간 선택 컨트롤(모드 토글+연/월 셀렉트)을
            접어서 카드+저장 버튼이 한 화면에 더 넉넉히 들어오게 한다 —
            기간을 다시 고르고 싶을 때만 "기간 변경"으로 되돌아간다. */}
        {!data ? (
          <>
            <div className="flex gap-1.5">
              <ModeButton mode="month" current={mode} onSelect={setMode} label="월 범위" />
              <ModeButton mode="season" current={mode} onSelect={setMode} label="전체 시즌" />
            </div>

            {mode === "month" && (
              <MonthRangeSelect
                startMonth={startMonth}
                endMonth={endMonth}
                onChangeStart={setStartMonth}
                onChangeEnd={setEndMonth}
              />
            )}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={pending}
              className="btn-press touch-target w-full rounded-full bg-primary py-2 text-sm font-medium text-white shadow-md shadow-primary/25 disabled:opacity-50"
            >
              {pending ? "집계 중..." : "리캡 카드 생성"}
            </button>

            {error && <p className="text-center text-xs text-destructive">{error}</p>}
          </>
        ) : (
          <div className="space-y-2.5">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleChangePeriod}
                className="btn-press touch-target rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground/70"
              >
                🔁 기간 변경
              </button>
            </div>
            <RecapCard ref={cardRef} data={data} />
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="btn-press touch-target w-full rounded-full bg-[#1f3b30] py-2.5 text-sm font-medium text-white shadow-md disabled:opacity-50"
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

function ModeButton({
  mode,
  current,
  onSelect,
  label,
}: {
  mode: RecapMode;
  current: RecapMode;
  onSelect: (mode: RecapMode) => void;
  label: string;
}) {
  const isActive = mode === current;
  return (
    <button
      type="button"
      onClick={() => onSelect(mode)}
      className={`tab-pill btn-press touch-target flex-1 rounded-full py-1.5 text-sm font-medium ${
        isActive ? "bg-primary text-white shadow-sm shadow-primary/30" : "bg-muted text-foreground/70"
      }`}
    >
      {label}
    </button>
  );
}

// 브랜드 톤(둥근 셀렉터)에 맞춘 커스텀 연/월 드롭다운 — 네이티브
// <input type="month">의 달력 UI 대신, 이 앱의 다른 select류와 동일한
// rounded-xl 스타일을 쓰는 <select> 두 개(연/월)로 "시작 월 ~ 종료 월"
// 범위를 고른다.
function MonthRangeSelect({
  startMonth,
  endMonth,
  onChangeStart,
  onChangeEnd,
}: {
  startMonth: string;
  endMonth: string;
  onChangeStart: (month: string) => void;
  onChangeEnd: (month: string) => void;
}) {
  const currentYear = Number(currentMonth().slice(0, 4));
  const years = Array.from({ length: YEAR_OPTIONS_BACK + 1 }, (_, i) => currentYear - YEAR_OPTIONS_BACK + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="grid grid-cols-2 gap-2">
      <YearMonthPicker label="시작 월" value={startMonth} years={years} months={months} onChange={onChangeStart} />
      <YearMonthPicker label="종료 월" value={endMonth} years={years} months={months} onChange={onChangeEnd} />
    </div>
  );
}

function YearMonthPicker({
  label,
  value,
  years,
  months,
  onChange,
}: {
  label: string;
  value: string;
  years: number[];
  months: number[];
  onChange: (month: string) => void;
}) {
  const { year, month } = splitMonth(value);
  return (
    <div>
      <p className="mb-1 text-[11px] text-muted-foreground">{label}</p>
      <div className="flex gap-1">
        <select
          value={year}
          onChange={(e) => onChange(joinMonth(Number(e.target.value), month))}
          aria-label={`${label} 연도`}
          className="w-0 min-w-0 flex-1 appearance-none rounded-xl border border-border bg-white px-2 py-2 text-xs"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}년
            </option>
          ))}
        </select>
        <select
          value={month}
          onChange={(e) => onChange(joinMonth(year, Number(e.target.value)))}
          aria-label={`${label} 월`}
          className="w-0 min-w-0 flex-1 appearance-none rounded-xl border border-border bg-white px-2 py-2 text-xs"
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {m}월
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
