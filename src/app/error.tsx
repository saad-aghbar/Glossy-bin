"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card grid gap-3 p-8">
      <h1 className="m-0 text-2xl">تعذر عرض الصفحة</h1>
      <p className="quiet">حاولي مرة أخرى. إذا استمر التعذر، عودي لاحقاً.</p>
      <button className="btn btn-primary w-fit" type="button" onClick={reset}>
        إعادة المحاولة
      </button>
    </div>
  );
}
