"use client";

import { useState, type ReactNode } from "react";

export function Check({
  name,
  value = "on",
  defaultChecked = false,
  checked,
  onChecked,
  required,
  children,
}: {
  name?: string;
  value?: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChecked?: (value: boolean) => void;
  required?: boolean;
  children: ReactNode;
}) {
  const [inner, setInner] = useState(defaultChecked);
  const on = checked ?? inner;

  return (
    <label className="check">
      <input
        type="checkbox"
        name={name}
        value={value}
        checked={on}
        required={required}
        onChange={(event) => {
          if (checked === undefined) setInner(event.target.checked);
          onChecked?.(event.target.checked);
        }}
      />
      <span className={on ? "check-box is-on" : "check-box"} aria-hidden="true">
        <svg viewBox="0 0 16 16">
          <path d="M3.5 8.2 6.4 11l6.1-6.2" />
        </svg>
      </span>
      <span>{children}</span>
    </label>
  );
}
