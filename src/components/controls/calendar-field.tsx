"use client";

import { useEffect, useId, useRef, useState } from "react";
import { jerusalemParts } from "@/lib/dates";

const WEEK = ["سبت", "أحد", "إثن", "ثلا", "أرب", "خمي", "جمع"];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function shiftMonth(year: number, month: number, by: number) {
  const date = new Date(Date.UTC(year, month - 1 + by, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function saturdayOffset(year: number, month: number) {
  const weekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return (weekday + 1) % 7;
}

function labelFor(year: string, month: string, day: string) {
  if (!year || !month || !day) return "";
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return new Intl.DateTimeFormat("ar", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

export function CalendarField({
  name,
  label,
  year,
  month,
  day,
}: {
  name: string;
  label: string;
  year: string;
  month: string;
  day: string;
}) {
  const today = jerusalemParts(new Date());
  const [parts, setParts] = useState({ year, month, day });
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => ({
    year: Number(year || today.year),
    month: Number(month || today.month),
  }));
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const shown = labelFor(parts.year, parts.month, parts.day);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const count = daysInMonth(view.year, view.month);
  const offset = saturdayOffset(view.year, view.month);
  const monthTitle = new Intl.DateTimeFormat("ar", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(view.year, view.month - 1, 1)),
  );

  return (
    <div ref={root} className={open ? "picker is-open" : "picker"}>
      <input type="hidden" name={`${name}Year`} value={parts.year} />
      <input type="hidden" name={`${name}Month`} value={parts.month} />
      <input type="hidden" name={`${name}Day`} value={parts.day} />
      <span className="picker-label">{label}</span>
      <button
        type="button"
        className="picker-button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setView({ year: Number(parts.year || today.year), month: Number(parts.month || today.month) });
          setOpen((item) => !item);
        }}
      >
        <span>{shown || "اختاري يوماً"}</span>
        <i className="picker-caret" aria-hidden="true" />
      </button>
      <div className="pop">
        <div id={panelId} className="pop-panel cal" role="dialog" aria-label={label}>
          <div className="cal-nav">
            <button type="button" aria-label="الشهر السابق" onClick={() => setView((item) => shiftMonth(item.year, item.month, -1))}>
              ‹
            </button>
            <strong>{monthTitle}</strong>
            <button type="button" aria-label="الشهر التالي" onClick={() => setView((item) => shiftMonth(item.year, item.month, 1))}>
              ›
            </button>
          </div>
          <div className="cal-grid">
            {WEEK.map((item) => (
              <span key={item}>{item}</span>
            ))}
            {Array.from({ length: offset }, (_, index) => (
              <span key={`gap-${index}`} />
            ))}
            {Array.from({ length: count }, (_, index) => {
              const date = index + 1;
              const selected = Number(parts.year) === view.year && Number(parts.month) === view.month && Number(parts.day) === date;
              const isToday = Number(today.year) === view.year && Number(today.month) === view.month && Number(today.day) === date;
              return (
                <button
                  key={date}
                  type="button"
                  className={selected ? "is-selected" : isToday ? "is-today" : undefined}
                  onClick={() => {
                    setParts({ year: String(view.year), month: pad(view.month), day: pad(date) });
                    setOpen(false);
                  }}
                >
                  {date}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="cal-clear"
            onClick={() => {
              setParts({ year: "", month: "", day: "" });
              setOpen(false);
            }}
          >
            بدون تاريخ
          </button>
        </div>
      </div>
    </div>
  );
}
