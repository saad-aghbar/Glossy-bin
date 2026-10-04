"use client";

import { CalendarField } from "@/components/controls/calendar-field";
import { Stepper } from "@/components/controls/stepper";
import { jerusalemParts } from "@/lib/dates";

export function DayFields({ name, label, value }: { name: string; label: string; value: string }) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return <CalendarField name={name} label={label} year={match?.[1] ?? ""} month={match?.[2] ?? ""} day={match?.[3] ?? ""} />;
}

export function InstantFields({ name, label, value }: { name: string; label: string; value: Date | null }) {
  const parts = jerusalemParts(value);
  return (
    <div className="grid gap-2">
      <CalendarField name={name} label={label} year={parts.year} month={parts.month} day={parts.day} />
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1">
          الساعة
          <Stepper name={`${name}Hour`} defaultValue={parts.hour || "0"} min={0} max={23} label="الساعة" />
        </label>
        <label className="grid gap-1">
          الدقيقة
          <Stepper name={`${name}Minute`} defaultValue={parts.minute || "0"} min={0} max={59} label="الدقيقة" />
        </label>
      </div>
    </div>
  );
}
