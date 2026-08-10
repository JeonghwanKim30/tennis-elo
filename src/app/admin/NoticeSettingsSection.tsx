import { prisma } from "@/lib/prisma";
import { getNoticeSettings } from "@/lib/notice";
import { NoticeSettingsPanel } from "./NoticeSettingsPanel";

export async function NoticeSettingsSection() {
  const [settings, rules, recentBroadcasts] = await Promise.all([
    getNoticeSettings(),
    prisma.voteReminderRule.findMany({ orderBy: [{ dayOffset: "desc" }, { hour: "asc" }, { minute: "asc" }] }),
    prisma.noticeBroadcast.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  return (
    <NoticeSettingsPanel
      matchCreatedAlarmOn={settings.matchCreatedAlarmOn}
      mvpAlarmOn={settings.mvpAlarmOn}
      rules={rules.map((r) => ({
        id: r.id,
        label: r.label,
        dayOffset: r.dayOffset,
        hour: r.hour,
        minute: r.minute,
        enabled: r.enabled,
      }))}
      recentBroadcasts={recentBroadcasts.map((b) => ({
        id: b.id,
        message: b.message,
        recipientCount: b.recipientCount,
        createdAt: b.createdAt.toISOString(),
      }))}
    />
  );
}
