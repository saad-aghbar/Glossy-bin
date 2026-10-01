import { jerusalemParts } from "@/lib/dates";

export function DayFields({ name, label, value }: { name: string; label: string; value: string }) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const year = match?.[1] ?? "";
  const month = match?.[2] ?? "";
  const day = match?.[3] ?? "";
  return (
    <fieldset className="date-fields">
      <legend>{label}</legend>
      <label>
        اليوم
        <input className="field" name={`${name}Day`} inputMode="numeric" autoComplete="off" defaultValue={day} />
      </label>
      <label>
        الشهر
        <input className="field" name={`${name}Month`} inputMode="numeric" autoComplete="off" defaultValue={month} />
      </label>
      <label>
        السنة
        <input className="field" name={`${name}Year`} inputMode="numeric" autoComplete="off" defaultValue={year} />
      </label>
    </fieldset>
  );
}

export function InstantFields({ name, label, value }: { name: string; label: string; value: Date | null }) {
  const parts = jerusalemParts(value);
  return (
    <fieldset className="date-fields">
      <legend>{label}</legend>
      <label>
        اليوم
        <input className="field" name={`${name}Day`} inputMode="numeric" autoComplete="off" defaultValue={parts.day} />
      </label>
      <label>
        الشهر
        <input className="field" name={`${name}Month`} inputMode="numeric" autoComplete="off" defaultValue={parts.month} />
      </label>
      <label>
        السنة
        <input className="field" name={`${name}Year`} inputMode="numeric" autoComplete="off" defaultValue={parts.year} />
      </label>
      <label>
        الساعة
        <input className="field" name={`${name}Hour`} inputMode="numeric" autoComplete="off" defaultValue={parts.hour} />
      </label>
      <label>
        الدقيقة
        <input className="field" name={`${name}Minute`} inputMode="numeric" autoComplete="off" defaultValue={parts.minute} />
      </label>
    </fieldset>
  );
}
