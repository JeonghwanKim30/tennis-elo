import { RegisterMatchDayForm } from "./RegisterMatchDayForm";

export function RegisterSection() {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">경기 등록</h2>
      <p className="text-sm text-muted-foreground">
        경기일(날짜·시간·장소)을 등록하면 회원들이 참여/불참을 투표할 수 있습니다.
      </p>
      <RegisterMatchDayForm />
    </section>
  );
}
