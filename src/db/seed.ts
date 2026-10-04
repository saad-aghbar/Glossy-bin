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
      name: "أحمر الشفاه المخملي",
      slug: "velvet-lipstick",
      description: "أحمر شفاه بلمسة مخملية مطفية. اللون يغطي من تمريرة واحدة ويثبت دون لمعة دهنية. كل عبوة بدرجة واحدة، والدرجة الظاهرة على الغلاف هي لون الشفاه بعد أن يجف.",
      categoryId: categories[0].id,
      brandId: brands[0].id,
      isFeatured: true,
      variants: [
        { sku: "LIP-ROSE", shadeName: "روز نود", priceMinor: 8900, stockQty: 12 },
        { sku: "LIP-BERRY", shadeName: "بيري", priceMinor: 8900, stockQty: 4 },
      ],
    },
    {
      name: "كريم الأساس السائل",
      slug: "liquid-foundation",
      description: "أساس سائل بتغطية متوسطة يمكن بناؤها. القوام خفيف ويندمج مع البشرة، والنتيجة ماتّة ناعمة. اختاري الدرجة الأقرب للون بشرتك.",
      categoryId: categories[1].id,
      brandId: brands[1].id,
      isFeatured: true,
      variants: [
        { sku: "FND-LIGHT", shadeName: "عاجي", priceMinor: 14500, compareAtPriceMinor: 16800, stockQty: 8 },
        { sku: "FND-MEDIUM", shadeName: "بيج دافئ", priceMinor: 14500, stockQty: 0 },
      ],
    },
    {
      name: "ماسكارا الرموش الكثيفة",
      slug: "volume-mascara",
      description: "ماسكارا سوداء تكثّف الرموش من الجذور إلى الأطراف. الفرشاة دقيقة حتى لا تتكتل الرموش، واللون يثبت خلال اليوم ويُزال بغسول العين.",
      categoryId: categories[2].id,
      brandId: brands[0].id,
      isFeatured: true,
      variants: [{ sku: "MSC-BLK", shadeName: "أسود", priceMinor: 7200, stockQty: 20 }],
    },
    {
      name: "بلاشر الخدود البودرة",
      slug: "powder-blush",
      description: "بلاشر بودرة ناعم يضيف لوناً للخدود دون خطوط. يُستخدم بفرشاة كبيرة فوق أحمر الخدود، واللون يبنى تدريجياً.",
      categoryId: categories[1].id,
      brandId: brands[1].id,
      isFeatured: false,
      variants: [
        { sku: "BLS-PEACH", shadeName: "خوخي", priceMinor: 6400, stockQty: 9 },
        { sku: "BLS-ROSE", shadeName: "وردي ترابي", priceMinor: 6400, stockQty: 9 },
      ],
    },
    {
      name: "مثبت المكياج",
      slug: "setting-spray",
      description: "رذاذ خفيف يُرش بعد آخر خطوة ليثبت المكياج ويقلل انتقاله. يُرش من مسافة ذراع والوجه مغمض. متوفر بمقاسين.",
      categoryId: categories[1].id,
      brandId: brands[0].id,
      isFeatured: false,
      variants: [
        { sku: "SET-50", sizeName: "٥٠ مل", priceMinor: 5400, stockQty: 15 },
        { sku: "SET-100", sizeName: "١٠٠ مل", priceMinor: 8900, stockQty: 6 },
      ],
    },
    {
      name: "الآيلاينر السائل",
      slug: "liquid-liner",
      description: "آيلاينر أسود بطرف دقيق يرسم خطاً ثابتاً على الجفن. يجف خلال لحظات ويبقى حاداً دون تقشر، ويُزال بمزيل مكياج العيون.",
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
