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
});

export const loginSchema = z.object({
  phone: phoneSchema,
  pin: z.string().regex(/^\d{4}$/, "PIN은 4자리 숫자입니다."),
});

export const matchSubmitSchema = z
  .object({
    type: z.enum(["SINGLES", "DOUBLES"]),
    playedAt: z.string().min(1, "경기 날짜를 입력해주세요."),
    teamAPlayer1: z.string().min(1),
    teamAPlayer2: z.string().optional(),
    teamBPlayer1: z.string().min(1),
    teamBPlayer2: z.string().optional(),
    result: z.enum(["TEAM_A_WIN", "TEAM_B_WIN", "DRAW"]),
  })
  .refine(
    (data) =>
      data.type === "SINGLES" || (!!data.teamAPlayer2 && !!data.teamBPlayer2),
    { message: "복식은 각 팀에 2명씩 선택해야 합니다.", path: ["teamAPlayer2"] }
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
