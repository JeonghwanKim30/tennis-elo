"use client";

import { useMemo, useState } from "react";

const DEFAULT_PAGE_SIZE = 5;

/**
 * 경기 목록처럼 데이터가 계속 쌓이는 리스트를 "최근 N개만 먼저 보여주고
 * '더보기'로 N개씩 더 열어보는" 방식으로 자르는 공용 훅. 상대전적/프로필/
 * 관리자/경기일 상세 등 경기 목록이 나오는 모든 화면이 이 하나를 공유해서
 * 페이지네이션 로직이 화면마다 따로 구현되지 않게 한다.
 *
 * @param items 전체 목록(이미 최신순으로 정렬된 상태여야 "최근 N개"가 맞다).
 * @param pageSize 처음 보여줄 개수이자, "더보기"를 누를 때마다 늘어나는 단위.
 * @param resetKey 이 값이 바뀌면 visibleCount를 pageSize로 되돌린다 — 탭/필터가
 *   바뀌어 items 내용 자체가 달라졌을 때 "더보기"로 늘려뒀던 개수가 새 목록에도
 *   그대로 남아있지 않게 하기 위함(예: 프로필 탭을 "전체"에서 "단식"으로 바꾸면
 *   다시 최근 5개부터 보여준다).
 */
export function useLoadMore<T>(items: T[], pageSize: number = DEFAULT_PAGE_SIZE, resetKey?: unknown) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  // resetKey가 바뀐 걸 "렌더 중에" 감지해 즉시 되돌린다(React 공식 패턴 —
  // "Adjusting state when a prop changes"). useEffect로 하면 한 번 더 이전
  // 값으로 렌더링된 뒤 커밋되고 나서야 되돌아가는 깜빡임이 생기고, React의
  // set-state-in-effect 린트 규칙에도 걸린다.
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setVisibleCount(pageSize);
  }

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const hasMore = visibleCount < items.length;
  const remaining = items.length - visibleItems.length;

  function showMore() {
    setVisibleCount((c) => c + pageSize);
  }

  return { visibleItems, hasMore, remaining, showMore };
}
