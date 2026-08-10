"use client";

import { useRef, useState } from "react";

// 이미지 확대/축소 + 이동(Pan) 커스텀 훅 — 외부 라이브러리 없이 PC(휠 줌 +
// 드래그 이동)와 모바일(핀치 줌 + 터치 드래그 이동) 양쪽을 하나로 다룬다.
// 사진 라이트박스처럼 여러 장을 넘기는 화면에서는 사진이 바뀔 때마다
// reset()을 호출해 이전 사진의 확대 상태가 다음 사진에 남지 않게 해야 한다.
const MIN_SCALE = 1;
const MAX_SCALE = 4;
const WHEEL_SENSITIVITY = 0.0018;

export function useImageZoomPan() {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartScale = useRef(1);
  const touchPanStart = useRef<{ x: number; y: number } | null>(null);

  // 확대된 만큼만 이동을 허용해, 이미지가 화면 밖으로 끝없이 밀려나가지 않게 한다.
  function clampTranslate(next: { x: number; y: number }, s: number) {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return next;
    const cRect = container.getBoundingClientRect();
    const scaledW = img.offsetWidth * s;
    const scaledH = img.offsetHeight * s;
    const maxX = Math.max(0, (scaledW - cRect.width) / 2);
    const maxY = Math.max(0, (scaledH - cRect.height) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }

  function reset() {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }

  function zoomBy(factor: number) {
    setScale((s) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s * factor));
      if (next === MIN_SCALE) setTranslate({ x: 0, y: 0 });
      return next;
    });
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    zoomBy(1 - e.deltaY * WHEEL_SENSITIVITY);
  }

  function onMouseDown(e: React.MouseEvent) {
    if (scale <= 1) return;
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    translateStart.current = translate;
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setTranslate(
      clampTranslate({ x: translateStart.current.x + dx, y: translateStart.current.y + dy }, scale)
    );
  }
  function onMouseUp() {
    dragging.current = false;
  }

  function distanceOf(touches: React.TouchList) {
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );
  }

  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      pinchStartDist.current = distanceOf(e.touches);
      pinchStartScale.current = scale;
    } else if (e.touches.length === 1 && scale > 1) {
      touchPanStart.current = { x: e.touches[0].clientX - translate.x, y: e.touches[0].clientY - translate.y };
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchStartDist.current) {
      e.preventDefault();
      const factor = distanceOf(e.touches) / pinchStartDist.current;
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchStartScale.current * factor));
      setScale(next);
      if (next === MIN_SCALE) setTranslate({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && touchPanStart.current && scale > 1) {
      e.preventDefault();
      const t = e.touches[0];
      setTranslate(
        clampTranslate({ x: t.clientX - touchPanStart.current.x, y: t.clientY - touchPanStart.current.y }, scale)
      );
    }
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) pinchStartDist.current = null;
    if (e.touches.length === 0) touchPanStart.current = null;
  }

  return {
    scale,
    translate,
    isZoomed: scale > 1,
    containerRef,
    imgRef,
    reset,
    zoomBy,
    onWheel,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}
