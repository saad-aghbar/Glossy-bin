import { asc } from "drizzle-orm";
import { db } from "@/db";
import { brand, category, homeCollageTile } from "@/db/schema";
import { AdminPage } from "@/components/admin/page";
import { ChoiceList } from "@/components/controls/choice-list";
import { BoundForm } from "@/components/bound-form";
import { FileField } from "@/components/file-field";
import { saveCollageTileAction } from "@/server/actions/admin";
import { one } from "@/lib/pagination";
import { requireAdminPage } from "@/lib/session";

export const metadata = { title: "الكولاج" };

const slots = [
  { slot: 0, label: "١ · عرض كامل" },
  { slot: 1, label: "٢ · نصف" },
  { slot: 2, label: "٣ · نصف" },
  { slot: 3, label: "٤ · عرض كامل" },
  { slot: 4, label: "٥ · نصف" },
  { slot: 5, label: "٦ · نصف" },
  { slot: 6, label: "٧ · عرض كامل" },
];

export default async function CollagePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const requested = Number.parseInt(one(params.slot), 10);
  const slot = Number.isInteger(requested) && requested >= 0 && requested <= 6 ? requested : 0;
  const [rows, brands, categories] = await Promise.all([
    db.select().from(homeCollageTile).orderBy(asc(homeCollageTile.slot)),
    db.select().from(brand).orderBy(asc(brand.sortOrder), asc(brand.name)),
    db.select().from(category).orderBy(asc(category.sortOrder), asc(category.name)),
  ]);
  const editing = rows.find((row) => row.slot === slot);
  const ready = rows.length === 7 && rows.every((row, index) => row.slot === index && row.imageUrl);
  return (
    <AdminPage title="الكولاج" description="سبع صور بين شريط العرض ومختارات. الصفحة الرئيسية تظهر الكولاج فقط عندما تكتمل الصور السبع.">
      <p className="quiet">{ready ? "الكولاج ظاهر في الصفحة الرئيسية." : "الكولاج مخفي حتى تكتمل الصور السبع."}</p>
      <div className="admin-split">
        <section className="admin-list">
          {slots.map((item) => {
            const row = rows.find((entry) => entry.slot === item.slot);
            return (
              <article key={item.slot} className={slot === item.slot ? "card is-current p-3" : "card p-3"}>
                <a href={`/admin/collage?slot=${item.slot}`}>
                  {item.label}
                  <span className="block text-sm text-muted">{row?.imageUrl ? "فيها صورة" : "بدون صورة"}</span>
                </a>
              </article>
            );
          })}
        </section>
        <BoundForm key={slot} action={saveCollageTileAction} submit="حفظ" cancelHref="/admin/collage">
          <input type="hidden" name="slot" value={String(slot)} />
          <input type="hidden" name="existingImage" value={editing?.imageUrl ?? ""} />
          <p className="m-0">{slots[slot]?.label}</p>
          {editing?.imageUrl ? (
            // Stored uploads are not known at build time.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={editing.imageUrl} alt="" className="aspect-[2/1] w-full rounded-xl object-cover" loading="lazy" decoding="async" />
          ) : null}
          <div className="grid gap-1">
            الصورة
            <FileField name="image" accept="image/jpeg,image/png,image/webp" required={!editing?.imageUrl} />
          </div>
          <label className="grid gap-1">
            عند الضغط
            <ChoiceList
              name="targetKind"
              defaultValue={editing?.targetKind ?? "brand"}
              options={[
                { value: "brand", label: "علامة" },
                { value: "category", label: "تصنيف" },
                { value: "page", label: "صفحة" },
              ]}
            />
          </label>
          <label className="grid gap-1">
            العلامة
            <ChoiceList
              name="brandSlug"
              defaultValue={editing?.targetKind === "brand" ? editing.targetValue : ""}
              placeholder="اختاري علامة"
              options={brands.map((item) => ({ value: item.slug, label: item.name }))}
            />
          </label>
          <label className="grid gap-1">
            التصنيف
            <ChoiceList
              name="categorySlug"
              defaultValue={editing?.targetKind === "category" ? editing.targetValue : ""}
              placeholder="اختاري تصنيفاً"
              options={categories.map((item) => ({ value: item.slug, label: item.name }))}
            />
          </label>
          <label className="grid gap-1">
            مسار الصفحة
            <input className="field" name="path" defaultValue={editing?.targetKind === "page" ? editing.targetValue : ""} placeholder="/products" />
          </label>
        </BoundForm>
      </div>
    </AdminPage>
  );
}
