"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useKeepEnteredValues } from "@/components/keep-values";
import type { ActionState } from "@/lib/form";

export function BoundForm({
  action,
  submit,
  cancelHref,
  replaceOnOk = false,
  children,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  submit: string;
  cancelHref?: string;
  replaceOnOk?: boolean;
  children: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const formRef = useKeepEnteredValues(state);
  const [dirty, setDirty] = useState(false);
  const ignoreInput = useRef(false);
  const visible = dirty || pending || Boolean(state?.error);

  useEffect(() => {
    if (pending || !state?.ok) return;
    ignoreInput.current = true;
    setDirty(false);
    const id = window.setTimeout(() => {
      ignoreInput.current = false;
    }, 400);
    return () => window.clearTimeout(id);
  }, [pending, state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-3"
      onInput={() => {
        if (ignoreInput.current || pending) return;
        setDirty(true);
      }}
    >
      {state?.error ? (
        <p className="alert" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok && !dirty ? (
        <p className="ok" role="status">
          {state.ok}
        </p>
      ) : null}
      {state?.devResetUrl ? (
        <p className="ok">
          <a className="underline" href={state.devResetUrl}>
            فتح رابط الاستعادة
          </a>
        </p>
      ) : null}
      {replaceOnOk && state?.ok && !dirty ? null : children}
      {replaceOnOk && state?.ok && !dirty ? null : (
      <div className="flex flex-wrap items-center gap-4">
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "لحظة..." : submit}
        </button>
        {cancelHref ? (
          <Link className="quiet-link" href={cancelHref}>
            إلغاء
          </Link>
        ) : null}
      </div>
      )}
      <div className={visible ? "admin-save is-on" : "admin-save"} aria-hidden={visible ? undefined : true}>
        <span>{pending ? "جارٍ الحفظ" : state?.error ? state.error : "تغييرات غير محفوظة"}</span>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "لحظة..." : submit}
        </button>
        <button
          className="btn btn-ghost"
          type="button"
          disabled={pending}
          onClick={() => {
            formRef.current?.reset();
            setDirty(false);
          }}
        >
          تراجع
        </button>
      </div>
    </form>
  );
}
