import { RegisterDayTypePicker } from "./RegisterDayTypePicker";

export function RegisterSection() {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">경기 등록</h2>
      <RegisterDayTypePicker />
    </section>
  );
}
