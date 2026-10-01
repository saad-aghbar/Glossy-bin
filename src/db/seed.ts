import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { count, eq } from "drizzle-orm";
import { db, pool } from "./index";
import {
  account,
  brand,
  category,
  contentPage,
  customerOrder,
  deliveryZone,
  discountCode,
  offer,
  product,
  productVariant,
  storeSetting,
  user,
} from "./schema";
import { newId } from "../lib/ids";
import { assertDevSeed } from "../lib/production";

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "مديرة المتجر";
  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required to seed the admin account");
  }
  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  if (existing) return;

  const userId = newId();
  const passwordHash = await hashPassword(password);
  await db.insert(user).values({
    id: userId,
    name,
    email,
    emailVerified: true,
    role: "admin",
  });
  await db.insert(account).values({
    id: newId(),
    accountId: userId,
    providerId: "credential",
    userId,
    password: passwordHash,
  });
}

async function seedStore() {
  const [settings] = await db.select({ id: storeSetting.id }).from(storeSetting).limit(1);
  if (!settings) {
    await db.insert(storeSetting).values({
      id: "store",
      storeName: "Glossy",
      currency: "SAR",
      minorUnit: 100,
      whatsappUrl: "https://wa.me/966500000000",
      instagramUrl: "https://instagram.com/glossy",
      orderNotifyEmail: process.env.ADMIN_EMAIL?.toLowerCase() ?? null,
      bankInstructions: "نص مبدئي: حوّلي المبلغ إلى الحساب الذي ستزوّدنا به العميلة، ثم أرسلي صورة الإيصال عبر واتساب.",
      codEnabled: true,
      bankTransferEnabled: true,
      defaultDeliveryFeeMinor: 2000,
    });
  }

  const pages = [
    {
      slug: "delivery",
      title: "التوصيل والإرجاع",
      body: "نص مبدئي إلى حين اعتماد سياسة العميلة.\n\nيتم التوصيل حسب المنطقة المختارة عند الدفع، ورسوم التوصيل تُحسب على الخادم. يمكن طلب الإرجاع للمنتجات غير المفتوحة خلال المدة التي تحددها العميلة.",
    },
    {
      slug: "privacy",
      title: "الخصوصية",
      body: "نص مبدئي إلى حين اعتماد سياسة الخصوصية.\n\nنجمع الاسم والهاتف والبريد والعنوان لإتمام الطلب والتوصيل فقط. لا نبيع هذه البيانات، ولا تُستخدم لإنشاء حساب مسؤول.",
    },
    {
      slug: "terms",
      title: "الشروط",
      body: "نص مبدئي إلى حين اعتماد الشروط.\n\nالأسعار المعروضة تشمل الخيارات الظاهرة لكل درجة أو مقاس. الطلب يُؤكد بعد مراجعة التوفر، والدفع حالياً عند الاستلام أو بتحويل بنكي.",
    },
  ];
  for (const page of pages) {
    const [existing] = await db.select({ id: contentPage.id }).from(contentPage).where(eq(contentPage.slug, page.slug)).limit(1);
    if (!existing) {
      await db.insert(contentPage).values({ id: newId(), ...page });
    }
  }

  const [{ value }] = await db.select({ value: count() }).from(product);
  if (value > 0) return;

  const categories = [
    { id: newId(), name: "الشفاه", slug: "lips", sortOrder: 1 },
    { id: newId(), name: "الوجه", slug: "face", sortOrder: 2 },
    { id: newId(), name: "العيون", slug: "eyes", sortOrder: 3 },
  ];
  const brands = [
    { id: newId(), name: "Glossy", slug: "glossy", sortOrder: 1 },
    { id: newId(), name: "لمسة", slug: "lamsa", sortOrder: 2 },
  ];
  await db.insert(category).values(categories);
  await db.insert(brand).values(brands);

  const catalog = [
    {
      name: "أحمر شفاه مخملي",
      slug: "velvet-lipstick",
      description: "منتج تجريبي بدرجات متعددة. يُستبدل بصور وأسعار العميلة.",
      categoryId: categories[0].id,
      brandId: brands[0].id,
      isFeatured: true,
      variants: [
        { sku: "LIP-ROSE", shadeName: "وردي هادئ", priceMinor: 8900, stockQty: 12 },
        { sku: "LIP-BERRY", shadeName: "توتي", priceMinor: 8900, stockQty: 4 },
      ],
    },
    {
      name: "كريم أساس سائل",
      slug: "liquid-foundation",
      description: "تغطية متوسطة مع درجات تجريبية للمخزون والسعر.",
      categoryId: categories[1].id,
      brandId: brands[1].id,
      isFeatured: true,
      variants: [
        { sku: "FND-LIGHT", shadeName: "فاتح", priceMinor: 14500, compareAtPriceMinor: 16800, stockQty: 8 },
        { sku: "FND-MEDIUM", shadeName: "متوسط", priceMinor: 14500, stockQty: 0 },
      ],
    },
    {
      name: "ماسكارا كثيفة",
      slug: "volume-mascara",
      description: "خيار واحد بدون درجة، لتجربة المنتجات البسيطة.",
      categoryId: categories[2].id,
      brandId: brands[0].id,
      isFeatured: true,
      variants: [{ sku: "MSC-BLK", shadeName: "أسود", priceMinor: 7200, stockQty: 20 }],
    },
    {
      name: "بلاشر بودرة",
      slug: "powder-blush",
      description: "درجات خدود تجريبية.",
      categoryId: categories[1].id,
      brandId: brands[1].id,
      isFeatured: false,
      variants: [
        { sku: "BLS-PEACH", shadeName: "خوخي", priceMinor: 6400, stockQty: 9 },
        { sku: "BLS-ROSE", shadeName: "وردي", priceMinor: 6400, stockQty: 9 },
      ],
    },
    {
      name: "مثبت مكياج",
      slug: "setting-spray",
      description: "مقاسات تجريبية لنفس المنتج.",
      categoryId: categories[1].id,
      brandId: brands[0].id,
      isFeatured: false,
      variants: [
        { sku: "SET-50", sizeName: "٥٠ مل", priceMinor: 5400, stockQty: 15 },
        { sku: "SET-100", sizeName: "١٠٠ مل", priceMinor: 8900, stockQty: 6 },
      ],
    },
    {
      name: "آيلاينر سائل",
      slug: "liquid-liner",
      description: "منتج عيون تجريبي لإظهار التصفح على أكثر من صفحة.",
      categoryId: categories[2].id,
      brandId: brands[1].id,
      isFeatured: false,
      variants: [{ sku: "LIN-BLK", shadeName: "أسود", priceMinor: 4900, stockQty: 18 }],
    },
  ];

  for (const [index, item] of catalog.entries()) {
    const productId = newId();
    await db.insert(product).values({
      id: productId,
      name: item.name,
      slug: item.slug,
      description: item.description,
      categoryId: item.categoryId,
      brandId: item.brandId,
      isFeatured: item.isFeatured,
      isPublished: true,
      sortOrder: catalog.length - index,
    });
    await db.insert(productVariant).values(
      item.variants.map((variant) => ({
        id: newId(),
        productId,
        sku: variant.sku,
        shadeName: "shadeName" in variant ? variant.shadeName : null,
        sizeName: "sizeName" in variant ? variant.sizeName : null,
        priceMinor: variant.priceMinor,
        compareAtPriceMinor: "compareAtPriceMinor" in variant ? variant.compareAtPriceMinor : null,
        stockQty: variant.stockQty,
        isActive: true,
      })),
    );
  }

  await db.insert(offer).values({
    id: newId(),
    title: "عرض ترحيبي تجريبي",
    description: "يُستبدل هذا العرض بتصميم العميلة وصورها.",
    linkUrl: "/products",
    isActive: true,
    sortOrder: 1,
  });
  await db.insert(discountCode).values({
    id: newId(),
    code: "GLOSSY10",
    type: "percent",
    value: 10,
    minSubtotalMinor: 5000,
    isActive: true,
  });
  await db.insert(deliveryZone).values([
    { id: newId(), name: "داخل المدينة", feeMinor: 1500, sortOrder: 1, isActive: true },
    { id: newId(), name: "خارج المدينة", feeMinor: 2500, sortOrder: 2, isActive: true },
  ]);
}

async function main() {
  assertDevSeed(process.env.NODE_ENV);
  await seedAdmin();
  await seedStore();
  const [{ value }] = await db.select({ value: count() }).from(customerOrder);
  console.info(`Glossy seed complete. Existing orders: ${value}`);
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
