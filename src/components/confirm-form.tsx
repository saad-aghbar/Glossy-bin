"use client";

import { useId, useRef, type ReactNode } from "react";

export function ConfirmForm({
  action,
  message,
  className,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  message: string;
  className?: string;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const formId = useId().replace(/:/g, "");

  function close() {
    dialog.current?.close();
    opener.current?.focus();
  }

  return (
    <form
      id={formId}
      action={action}
      className={className}
      onSubmit={(event) => {
        const form = event.currentTarget;
        if (form.dataset.confirmed === "yes") {
          delete form.dataset.confirmed;
          return;
        }
        event.preventDefault();
        opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        dialog.current?.showModal();
      }}
    >
      {children}
      <dialog
      ref={dialog}
      className="confirm-dialog"
      aria-labelledby={`${formId}-title`}
      onClose={() => opener.current?.focus()}
      onCancel={() => opener.current?.focus()}
    >
      <div className="confirm-body">
        <h2 id={`${formId}-title`}>تأكيد</h2>
        <p>{message}</p>
        <div className="confirm-actions">
          <button className="btn btn-ghost" type="button" onClick={close}>
            إلغاء
          </button>
          <button
            className="btn btn-primary"
            type="submit"
            form={formId}
            onClick={(event) => {
              const form = event.currentTarget.form;
              if (form) form.dataset.confirmed = "yes";
            }}
          >
            تأكيد
          </button>
        </div>
      </div>
      </dialog>
    </form>
  );
}
