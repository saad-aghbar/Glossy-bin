import Link from "next/link";

export function Pagination({
  page,
  pages,
  path,
  params,
}: {
  page: number;
  pages: number;
  path: string;
  params: Record<string, string>;
}) {
  if (pages <= 1) return null;
  const href = (next: number) => {
    const search = new URLSearchParams({ ...params, page: String(next) });
    return `${path}?${search.toString()}`;
  };
  return (
    <nav className="mt-8 flex items-center justify-center gap-3" aria-label="الصفحات">
      {page > 1 ? (
        <Link className="btn btn-ghost" href={href(page - 1)}>
          السابق
        </Link>
      ) : (
        <span className="btn btn-ghost opacity-40">السابق</span>
      )}
      <span>
        صفحة {page} من {pages}
      </span>
      {page < pages ? (
        <Link className="btn btn-ghost" href={href(page + 1)}>
          التالي
        </Link>
      ) : (
        <span className="btn btn-ghost opacity-40">التالي</span>
      )}
    </nav>
  );
}
