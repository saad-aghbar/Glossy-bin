"use client";

import { useEffect, useRef } from "react";

export function useKeepEnteredValues(state: { error?: string } | null) {
  const formRef = useRef<HTMLFormElement>(null);
  const draft = useRef<FormData | null>(null);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const onSubmit = () => {
      draft.current = new FormData(form);
    };
    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, []);

  useEffect(() => {
    const form = formRef.current;
    const data = draft.current;
    if (!state?.error || !form || !data) return;
    restoreForm(form, data);
    const frame = requestAnimationFrame(() => {
      if (form.isConnected) restoreForm(form, data);
    });
    return () => cancelAnimationFrame(frame);
  }, [state]);

  return formRef;
}

function restoreForm(form: HTMLFormElement, data: FormData) {
  const names = new Set<string>();
  for (const [name] of data.entries()) names.add(name);
  for (const name of names) {
    const node = form.elements.namedItem(name);
    if (!node) continue;
    const values = data.getAll(name).map((value) => String(value));
    if (node instanceof RadioNodeList) {
      for (const item of node) {
        if (!(item instanceof HTMLInputElement)) continue;
        item.checked = values.includes(item.value);
      }
      continue;
    }
    if (!(node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement)) {
      continue;
    }
    if (node instanceof HTMLInputElement && node.type === "file") continue;
    if (node instanceof HTMLInputElement && (node.type === "checkbox" || node.type === "radio")) {
      node.checked = values.includes(node.value);
      continue;
    }
    node.value = values[0] ?? "";
  }
}
