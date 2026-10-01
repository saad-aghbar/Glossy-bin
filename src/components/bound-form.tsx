"use client";

import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import { useKeepEnteredValues } from "@/components/keep-values";
import type { ActionState } from "@/lib/form";

export function BoundForm({
  action,
  submit,
  cancelHref,
  children,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  submit: string;
  cancelHref?: string;
  children: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const formRef = useKeepEnteredValues(state);
  return (
    <form ref={formRef} action={formAction} className="grid gap-3">
      {state?.error ? (
        <p className="alert" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
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
      {children}
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
    </form>
  );
}
