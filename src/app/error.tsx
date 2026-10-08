"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="load-fail">
      <section className="load-fail-card">
        <h1>تعذر عرض الصفحة</h1>
        <p>حاولي مرة أخرى. إذا استمر التعذر، عودي لاحقاً.</p>
        <button className="btn btn-primary" type="button" onClick={reset}>
          إعادة المحاولة
        </button>
      </section>
    </div>
  );
}
