"use client";

import { useState } from "react";

export function Stepper({
  name,
  value,
  defaultValue = "",
  onValue,
  min,
  max,
  label,
}: {
  name?: string;
  value?: string;
  defaultValue?: string | number;
  onValue?: (value: string) => void;
  min?: number;
  max?: number;
  label?: string;
}) {
  const [inner, setInner] = useState(String(defaultValue));
  const shown = value !== undefined ? value : inner;

  function commit(next: string) {
    if (value === undefined) setInner(next);
    onValue?.(next);
  }

  function step(direction: number) {
    const current = shown.trim() === "" ? (min ?? 0) - direction : Number(shown);
    const base = Number.isFinite(current) ? current : min ?? 0;
    let next = base + direction;
    if (min != null) next = Math.max(min, next);
    if (max != null) next = Math.min(max, next);
    commit(String(next));
  }

  return (
    <div className="step">
      <button type="button" aria-label={label ? `إنقاص ${label}` : "إنقاص"} onClick={() => step(-1)}>
        −
      </button>
      <input
        name={name}
        inputMode="numeric"
        value={shown}
        aria-label={label}
        onChange={(event) => commit(event.target.value.replace(/[^\d-]/g, ""))}
        onBlur={() => {
          if (shown.trim() === "") return;
          const number = Number(shown);
          if (!Number.isFinite(number)) {
            commit(min != null ? String(min) : "");
            return;
          }
          let next = number;
          if (min != null) next = Math.max(min, next);
          if (max != null) next = Math.min(max, next);
          commit(String(next));
        }}
        onFocus={(event) => event.currentTarget.select()}
      />
      <button type="button" aria-label={label ? `زيادة ${label}` : "زيادة"} onClick={() => step(1)}>
        +
      </button>
    </div>
  );
}
