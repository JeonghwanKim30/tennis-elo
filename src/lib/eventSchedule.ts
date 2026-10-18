// 특수 이벤트(MT/대회)의 타임슬롯 계산.
//
// 슬롯 시각을 경기마다 저장하지 않고 "진행 시간 + 코트 수 + 총 경기 수"에서
// 매번 파생한다 — 그래야 이벤트 시간을 나중에 수정해도 이미 배치된 경기들이
// 자동으로 따라오고, 같은 시각 문자열이 경기 행마다 중복 저장되지 않는다.
// Match에는 slotIndex(몇 번째 시간대)만 남는다.

export const DEFAULT_SLOT_MINUTES = 60;

export interface EventSlot {
  index: number;
  /** "15:00" */
  startLabel: string;
  /** "16:00" */
  endLabel: string;
  /** "15:00~16:00" */
  rangeLabel: string;
}

/** "15:00" -> 900(분). 형식이 어긋나면 null. */
export function parseTimeToMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** 900(분) -> "15:00". 24시를 넘어가면 그대로 이어서(예: 25:00) 보여준다 — 자정을
 *  넘기는 이벤트에서 "01:00"으로 접히면 앞 슬롯보다 빠른 시각처럼 보여 혼란스럽다. */
export function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * 한 시간대(라운드)에 코트 수만큼 경기가 동시에 돌아간다는 전제로, 총 경기 수를
 * 소화하는 데 필요한 라운드 수를 구한다. 예) 12경기 / 3코트 -> 4라운드.
 */
export function slotCountFor(plannedMatchCount: number, courtCount: number): number {
  if (courtCount <= 0 || plannedMatchCount <= 0) return 0;
  return Math.ceil(plannedMatchCount / courtCount);
}

/**
 * 이벤트의 타임슬롯 목록. 시작~종료 구간을 라운드 수로 균등 분할한다.
 * 예) 15:00~19:00, 12경기, 3코트 -> 4슬롯 x 60분 (15:00 / 16:00 / 17:00 / 18:00)
 *
 * 시간 정보가 없거나 형식이 어긋나면 시각 라벨 없이 "N번째 경기" 슬롯만 만든다 —
 * 시간을 입력하지 않은 이벤트에서도 대진표 자체는 짤 수 있어야 한다.
 */
export function buildEventSlots({
  startTime,
  endTime,
  plannedMatchCount,
  courtCount,
}: {
  startTime?: string | null;
  endTime?: string | null;
  plannedMatchCount?: number | null;
  courtCount: number;
}): EventSlot[] {
  const slotCount = slotCountFor(plannedMatchCount ?? 0, courtCount);
  if (slotCount === 0) return [];

  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  // 종료가 시작보다 이르면 자정을 넘긴 것으로 보고 24시간을 더해 계산한다.
  const span =
    startMinutes !== null && endMinutes !== null
      ? endMinutes > startMinutes
        ? endMinutes - startMinutes
        : endMinutes + 24 * 60 - startMinutes
      : null;

  return Array.from({ length: slotCount }, (_, index) => {
    if (startMinutes === null || span === null || span <= 0) {
      return {
        index,
        startLabel: "",
        endLabel: "",
        rangeLabel: `${index + 1}번째 시간대`,
      };
    }
    const slotMinutes = span / slotCount;
    const from = Math.round(startMinutes + slotMinutes * index);
    const to = Math.round(startMinutes + slotMinutes * (index + 1));
    const startLabel = formatMinutes(from);
    const endLabel = formatMinutes(to);
    return { index, startLabel, endLabel, rangeLabel: `${startLabel}~${endLabel}` };
  });
}

/**
 * 같은 시간대(slotIndex)에 이미 배정된 사람들의 id 집합.
 *
 * 특수 이벤트의 핵심 제약 — 한 사람은 같은 시간대에 코트를 불문하고 한 경기만
 * 뛸 수 있다. 이 규칙은 teamAPlayer1/2, teamBPlayer1/2 네 컬럼에 걸쳐 있어
 * DB 제약으로 표현할 수 없으므로, 화면(선택 차단)과 서버 액션(최종 검증)이
 * 같은 이 함수를 공유해서 판정한다.
 *
 * @param excludeMatchId 편집 중인 경기 — 자기 자신이 이미 넣어둔 선수까지
 *   "중복"으로 잡히면 수정이 불가능해지므로 제외한다.
 */
export function playerIdsBusyInSlot(
  matches: {
    id: string;
    slotIndex: number | null;
    teamAPlayer1: string;
    teamAPlayer2: string | null;
    teamBPlayer1: string;
    teamBPlayer2: string | null;
  }[],
  slotIndex: number,
  excludeMatchId?: string
): Set<string> {
  const busy = new Set<string>();
  for (const m of matches) {
    if (m.slotIndex !== slotIndex) continue;
    if (excludeMatchId && m.id === excludeMatchId) continue;
    for (const id of [m.teamAPlayer1, m.teamAPlayer2, m.teamBPlayer1, m.teamBPlayer2]) {
      if (id) busy.add(id);
    }
  }
  return busy;
}
