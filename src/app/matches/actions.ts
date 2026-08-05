"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export interface CreateDayState {
  error?: string;
}

export async function createMatchDayAction(
  _prevState: CreateDayState,
  formData: FormData
): Promise<CreateDayState> {
  const user = await requireUser();

  const dateStr = formData.get("date");
  if (typeof dateStr !== "string" || !dateStr) {
    return { error: "날짜를 입력해주세요." };
  }
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return { error: "날짜가 올바르지 않습니다." };
  }

  const timeStr = formData.get("time");
  const time = typeof timeStr === "string" && timeStr.trim() ? timeStr.trim() : null;
  const locationStr = formData.get("location");
  const location = typeof locationStr === "string" && locationStr.trim() ? locationStr.trim() : null;

  const existing = await prisma.matchDay.findUnique({ where: { date } });
  if (existing) {
    redirect(`/matches/${existing.id}`);
  }

  const day = await prisma.matchDay.create({
    data: { date, time, location, createdBy: user.id },
  });
  redirect(`/matches/${day.id}`);
}
