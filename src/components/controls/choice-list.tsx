"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePinnedPopover } from "@/components/controls/use-pinned-popover";

export type Choice = { value: string; label: string };

export function ChoiceList({
  name,
  defaultValue = "",
  options,
  placeholder = "اختاري",
}: {
  name: string;
  defaultValue?: string;
  options: Choice[];
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = options.find((option) => option.value === value);
  usePinnedPopover(open, root);

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

  return (
    <div ref={root} className={open ? "picker is-open" : "picker"}>
      <input type="hidden" name={name} value={value} />
      <button type="button" className="picker-button" aria-expanded={open} aria-controls={listId} onClick={() => setOpen((item) => !item)}>
        <span>{current?.label || placeholder}</span>
        <i className="picker-caret" aria-hidden="true" />
      </button>
      <div className="pop">
        <div id={listId} className="pop-panel" role="listbox" aria-label={placeholder}>
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value || "empty"}
                type="button"
                role="option"
                aria-selected={selected}
                className={selected ? "is-selected" : undefined}
                onClick={() => {
                  setValue(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
