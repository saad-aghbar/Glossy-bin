export type AdminLink = {
  href: string;
  label: string;
  exact?: boolean;
  icon: "home" | "products" | "orders" | "customers" | "discount" | "truck" | "category" | "brand" | "offer" | "pages" | "mail" | "settings";
};

export const adminGroups: Array<{ id: string; label: string; links: AdminLink[] }> = [
  {
    id: "overview",
    label: "نظرة عامة",
    links: [{ href: "/admin", label: "لوحة المبيعات", exact: true, icon: "home" }],
  },
  {
    id: "commerce",
    label: "التجارة",
    links: [
      { href: "/admin/products", label: "المنتجات", icon: "products" },
      { href: "/admin/orders", label: "الطلبات", icon: "orders" },
      { href: "/admin/customers", label: "الزبائن", icon: "customers" },
      { href: "/admin/discounts", label: "أكواد الخصم", icon: "discount" },
      { href: "/admin/delivery", label: "التوصيل", icon: "truck" },
    ],
  },
  {
    id: "content",
    label: "المحتوى",
    links: [
      { href: "/admin/categories", label: "التصنيفات", icon: "category" },
      { href: "/admin/brands", label: "العلامات", icon: "brand" },
      { href: "/admin/offers", label: "العروض", icon: "offer" },
      { href: "/admin/pages", label: "الصفحات", icon: "pages" },
      { href: "/admin/messages", label: "الرسائل", icon: "mail" },
    ],
  },
  {
    id: "settings",
    label: "الإعدادات",
    links: [{ href: "/admin/settings", label: "إعدادات المتجر", icon: "settings" }],
  },
];

export const adminCrumbs: Record<string, string> = {
  admin: "الإدارة",
  products: "المنتجات",
  new: "جديد",
  orders: "الطلبات",
  customers: "الزبائن",
  discounts: "أكواد الخصم",
  delivery: "التوصيل",
  categories: "التصنيفات",
  brands: "العلامات",
  offers: "العروض",
  pages: "الصفحات",
  messages: "الرسائل",
  settings: "الإعدادات",
};
