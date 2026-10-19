import { z } from "zod";
import { normalizePhone } from "@/lib/phone";

export const phoneSchema = z
  .string()
  .trim()
  .transform(normalizePhone)
  .refine((v) => /^01[016789]\d{7,8}$/.test(v), {
    message: "올바른 휴대폰 번호 형식이 아닙니다 (예: 01012345678).",
  });

export const signupSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해주세요.").max(50),
  phone: phoneSchema,
  gender: z.enum(["MALE", "FEMALE"], { message: "성별을 선택해주세요." }),
});

export const loginSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해주세요."),
  pin: z.string().regex(/^\d{4}$/, "PIN은 4자리 숫자입니다."),
});

export const matchSubmitSchema = z
  .object({
    type: z.enum(["SINGLES", "DOUBLES"]),
    teamAPlayer1: z.string().min(1),
    teamAPlayer2: z.string().optional(),
    teamBPlayer1: z.string().min(1),
    teamBPlayer2: z.string().optional(),
  })
  .refine(
    (data) =>
      data.type === "SINGLES" || (!!data.teamAPlayer2 && !!data.teamBPlayer2),
    { message: "복식은 각 팀에 2명씩(포핸드/백핸드) 선택해야 합니다.", path: ["teamAPlayer2"] }
  )
  .refine(
    (data) => {
      const players = [
        data.teamAPlayer1,
        data.teamAPlayer2,
        data.teamBPlayer1,
        data.teamBPlayer2,
      ].filter((p): p is string => !!p);
      return new Set(players).size === players.length;
    },
    { message: "같은 선수를 중복해서 선택할 수 없습니다.", path: ["teamBPlayer1"] }
  );

export const bioSchema = z
  .string()
  .trim()
  .max(30, "자기소개는 최대 30자까지 입력할 수 있습니다.");

export const matchScoreSchema = z.object({
  teamAScore: z.coerce.number().int().min(0, "0 이상의 숫자를 입력해주세요."),
  teamBScore: z.coerce.number().int().min(0, "0 이상의 숫자를 입력해주세요."),
});

// ── 특수 이벤트(MT/대회) ────────────────────────────────────────────

const timeOfDaySchema = z
  .string()
  .trim()
  .regex(/^\d{1,2}:\d{2}$/, "시간은 HH:MM 형식으로 입력해주세요.")
  .refine(
    (v) => {
      const [h, m] = v.split(":").map(Number);
      return h <= 23 && m <= 59;
    },
    { message: "올바른 시간이 아닙니다." }
  );

export const MAX_EVENT_COURTS = 8;
export const MAX_EVENT_ROUNDS = 12;
// 총 경기 수는 "코트 수 x 라운드 수"로 정해지므로 상한도 그 곱으로 따라온다.
export const MAX_EVENT_MATCHES = MAX_EVENT_COURTS * MAX_EVENT_ROUNDS;

export const eventDaySchema = z.object({
  title: z.string().trim().min(1, "이벤트 제목을 입력해주세요.").max(40, "제목은 최대 40자입니다."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜가 올바르지 않습니다."),
  location: z.string().trim().max(60).optional(),
  startTime: timeOfDaySchema,
  endTime: timeOfDaySchema,
  plannedMatchCount: z.coerce
    .number()
    .int("총 경기 수는 정수로 입력해주세요.")
    .min(1, "총 경기 수는 1 이상이어야 합니다.")
    .max(MAX_EVENT_MATCHES, `총 경기 수는 최대 ${MAX_EVENT_MATCHES}경기까지 가능합니다.`),
  // 코트 이름 목록. 빈 이름은 폼 단계에서 걸러서 넘긴다.
  courtNames: z
    .array(z.string().trim().min(1, "코트 이름을 입력해주세요.").max(20, "코트 이름은 최대 20자입니다."))
    .min(1, "코트를 1개 이상 입력해주세요.")
    .max(MAX_EVENT_COURTS, `코트는 최대 ${MAX_EVENT_COURTS}개까지 가능합니다.`)
    .refine((names) => new Set(names).size === names.length, {
      message: "코트 이름이 중복되었습니다.",
    }),
  eloMode: z.enum(["NONE", "MEMBERS_ONLY"]),
})
  // 총 경기 수는 화면에서 "코트 수 x 라운드 수"로 계산해 보내는 값이다. 클라이언트가
  // 보낸 값을 그대로 믿으면 코트 수와 어긋난 경기 수가 저장돼 타임라인의 라운드
  // 수가 의도와 달라지므로, 서버에서도 코트 수로 나누어떨어지는지 확인한다.
  .refine((data) => data.plannedMatchCount % data.courtNames.length === 0, {
    message: "총 경기 수는 코트 수의 배수여야 합니다(코트 수 × 라운드 수).",
    path: ["plannedMatchCount"],
  })
  .refine((data) => data.plannedMatchCount / data.courtNames.length <= MAX_EVENT_ROUNDS, {
    message: `라운드는 최대 ${MAX_EVENT_ROUNDS}라운드까지 가능합니다.`,
    path: ["plannedMatchCount"],
  });

// 게스트 MMR 허용 범위 — 티어 구간(lib/tier.ts)을 벗어나는 값이 들어오면
// 밸런스 계산이 비현실적으로 틀어지므로 상·하한을 둔다.
export const GUEST_MMR_MIN = 800;
export const GUEST_MMR_MAX = 2500;

export const eventGuestSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해주세요.").max(10, "이름은 최대 10자입니다."),
  gender: z.enum(["MALE", "FEMALE"], { message: "성별을 선택해주세요." }),
  mmr: z.coerce
    .number()
    .min(GUEST_MMR_MIN, `MMR은 ${GUEST_MMR_MIN} 이상으로 입력해주세요.`)
    .max(GUEST_MMR_MAX, `MMR은 ${GUEST_MMR_MAX} 이하로 입력해주세요.`),
});
