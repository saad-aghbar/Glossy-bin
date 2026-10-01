import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card grid gap-4 p-8">
      <h1 className="m-0 text-3xl">الصفحة غير موجودة</h1>
      <Link className="btn btn-primary w-fit" href="/products">
        تصفحي المنتجات
      </Link>
    </div>
  );
}
