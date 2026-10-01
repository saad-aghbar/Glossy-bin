"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

export function FileField({
  name,
  accept,
  required = false,
}: {
  name: string;
  accept: string;
  required?: boolean;
}) {
  const { pending } = useFormStatus();
  const [fileName, setFileName] = useState("");
  return (
    <label className="file-field">
      <input
        name={name}
        type="file"
        accept={accept}
        required={required}
        onChange={(event) => setFileName(event.currentTarget.files?.[0]?.name ?? "")}
      />
      <span className="btn btn-ghost">{fileName ? "تغيير الملف" : "اختيار ملف"}</span>
      <span>{pending ? "لحظة..." : fileName || "لم يُختر ملف"}</span>
    </label>
  );
}
