const htmlTag = /<\/?[a-z!]/i;

export function pageBodyError(body: string) {
  if (htmlTag.test(body)) return "اكتبي النص بدون وسوم HTML";
  return null;
}

export function publicPageText(approvedAt: Date | null | undefined, body: string) {
  if (!approvedAt) return "هذا النص لم يُعتمد بعد.";
  return body;
}
