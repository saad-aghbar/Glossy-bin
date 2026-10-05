import { notFound } from "next/navigation";
import { publicPageText } from "@/lib/content";
import { getContentPage } from "@/server/queries";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getContentPage(slug);
  return { title: page?.title ?? "صفحة" };
}

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getContentPage(slug);
  if (!page) notFound();
  return (
    <article className="card shop-article grid gap-4 p-6">
      <h1 className="text-3xl font-extrabold">{page.title}</h1>
      <div className="whitespace-pre-wrap leading-8">{publicPageText(page.approvedAt, page.body)}</div>
    </article>
  );
}
