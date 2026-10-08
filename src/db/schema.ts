import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

function createdAt() {
  return timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow();
}

function updatedAt() {
  return timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow();
}

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  role: text("role").default("user"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires", { withTimezone: true, mode: "date" }),
  phone: text("phone"),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    uniqueIndex("account_provider_account_idx").on(table.providerId, table.accountId),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const address = pgTable(
  "address",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    recipientName: text("recipient_name").notNull(),
    phone: text("phone").notNull(),
    city: text("city").notNull(),
    area: text("area").notNull(),
    street: text("street").notNull(),
    notes: text("notes"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("address_user_id_idx").on(table.userId)],
);

export const category = pgTable("category", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const brand = pgTable("brand", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const product = pgTable(
  "product",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull().default(""),
    categoryId: text("category_id").references(() => category.id, { onDelete: "set null" }),
    brandId: text("brand_id").references(() => brand.id, { onDelete: "set null" }),
    isFeatured: boolean("is_featured").notNull().default(false),
    isPublished: boolean("is_published").notNull().default(false),
    archivedAt: timestamp("archived_at", { withTimezone: true, mode: "date" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("product_category_idx").on(table.categoryId),
    index("product_brand_idx").on(table.brandId),
    index("product_published_idx").on(table.isPublished),
  ],
);

export const productVariant = pgTable(
  "product_variant",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    sku: text("sku").notNull().unique(),
    shadeName: text("shade_name"),
    sizeName: text("size_name"),
    priceMinor: integer("price_minor").notNull(),
    compareAtPriceMinor: integer("compare_at_price_minor"),
    stockQty: integer("stock_qty").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("product_variant_product_idx").on(table.productId)],
);

export const productImage = pgTable(
  "product_image",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    variantId: text("variant_id").references(() => productVariant.id, { onDelete: "set null" }),
    url: text("url").notNull(),
    alt: text("alt").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (table) => [index("product_image_product_idx").on(table.productId)],
);

export const cart = pgTable(
  "cart",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    token: text("token"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("cart_user_id_unique")
      .on(table.userId)
      .where(sql`${table.userId} is not null`),
    uniqueIndex("cart_token_unique")
      .on(table.token)
      .where(sql`${table.token} is not null`),
  ],
);

export const cartItem = pgTable(
  "cart_item",
  {
    id: text("id").primaryKey(),
    cartId: text("cart_id")
      .notNull()
      .references(() => cart.id, { onDelete: "cascade" }),
    variantId: text("variant_id")
      .notNull()
      .references(() => productVariant.id, { onDelete: "cascade" }),
    qty: integer("qty").notNull(),
    priceSeenMinor: integer("price_seen_minor"),
  },
  (table) => [
    uniqueIndex("cart_item_variant_unique").on(table.cartId, table.variantId),
    index("cart_item_cart_idx").on(table.cartId),
  ],
);

export const discountCode = pgTable("discount_code", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  type: text("type").notNull(),
  value: integer("value").notNull(),
  minSubtotalMinor: integer("min_subtotal_minor").notNull().default(0),
  startsAt: timestamp("starts_at", { withTimezone: true, mode: "date" }),
  endsAt: timestamp("ends_at", { withTimezone: true, mode: "date" }),
  usageLimit: integer("usage_limit"),
  usedCount: integer("used_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const homeRibbon = pgTable("home_ribbon", {
  id: text("id").primaryKey(),
  imageUrl: text("image_url").notNull(),
  linkUrl: text("link_url"),
  buttonLabel: text("button_label").notNull().default("شاهدي"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const heroStackImage = pgTable("hero_stack_image", {
  id: text("id").primaryKey(),
  imageUrl: text("image_url").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const homeCollageTile = pgTable(
  "home_collage_tile",
  {
    id: text("id").primaryKey(),
    slot: integer("slot").notNull(),
    imageUrl: text("image_url").notNull(),
    targetKind: text("target_kind").notNull(),
    targetValue: text("target_value").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("home_collage_tile_slot_unique").on(table.slot)],
);

export const offer = pgTable("offer", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  startsAt: timestamp("starts_at", { withTimezone: true, mode: "date" }),
  endsAt: timestamp("ends_at", { withTimezone: true, mode: "date" }),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const deliveryZone = pgTable("delivery_zone", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  feeMinor: integer("fee_minor").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const customerOrder = pgTable(
  "customer_order",
  {
    id: text("id").primaryKey(),
    number: text("number").notNull().unique(),
    publicToken: text("public_token").notNull().unique(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    status: text("status").notNull(),
    paymentMethod: text("payment_method").notNull(),
    paymentStatus: text("payment_status").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true, mode: "date" }),
    paidByUserId: text("paid_by_user_id").references(() => user.id, { onDelete: "set null" }),
    recipientName: text("recipient_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull(),
    city: text("city").notNull(),
    area: text("area").notNull(),
    street: text("street").notNull(),
    notes: text("notes"),
    deliveryZoneId: text("delivery_zone_id").references(() => deliveryZone.id, {
      onDelete: "set null",
    }),
    deliveryZoneName: text("delivery_zone_name").notNull(),
    currency: text("currency").notNull(),
    subtotalMinor: integer("subtotal_minor").notNull(),
    discountMinor: integer("discount_minor").notNull(),
    deliveryFeeMinor: integer("delivery_fee_minor").notNull(),
    totalMinor: integer("total_minor").notNull(),
    discountCodeId: text("discount_code_id").references(() => discountCode.id, {
      onDelete: "set null",
    }),
    discountCode: text("discount_code"),
    idempotencyKey: text("idempotency_key").unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("customer_order_user_idx").on(table.userId),
    index("customer_order_created_idx").on(table.createdAt),
    index("customer_order_email_idx").on(table.email),
  ],
);

export const orderItem = pgTable(
  "order_item",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => customerOrder.id, { onDelete: "cascade" }),
    variantId: text("variant_id").references(() => productVariant.id, { onDelete: "restrict" }),
    productName: text("product_name").notNull(),
    variantLabel: text("variant_label").notNull(),
    sku: text("sku").notNull(),
    unitPriceMinor: integer("unit_price_minor").notNull(),
    qty: integer("qty").notNull(),
    lineTotalMinor: integer("line_total_minor").notNull(),
  },
  (table) => [index("order_item_order_idx").on(table.orderId)],
);

export const orderEvent = pgTable(
  "order_event",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => customerOrder.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    kind: text("kind").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    body: text("body"),
    createdAt: createdAt(),
  },
  (table) => [index("order_event_order_idx").on(table.orderId)],
);

export const stockMovement = pgTable(
  "stock_movement",
  {
    id: text("id").primaryKey(),
    variantId: text("variant_id")
      .notNull()
      .references(() => productVariant.id, { onDelete: "restrict" }),
    delta: integer("delta").notNull(),
    reason: text("reason").notNull(),
    orderId: text("order_id").references(() => customerOrder.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (table) => [index("stock_movement_variant_idx").on(table.variantId)],
);

export const storeSetting = pgTable("store_setting", {
  id: text("id").primaryKey(),
  storeName: text("store_name").notNull(),
  tagline: text("tagline"),
  logoUrl: text("logo_url"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  currency: text("currency").notNull(),
  minorUnit: integer("minor_unit").notNull(),
  whatsappUrl: text("whatsapp_url"),
  instagramUrl: text("instagram_url"),
  orderNotifyEmail: text("order_notify_email"),
  bankInstructions: text("bank_instructions"),
  codEnabled: boolean("cod_enabled").notNull().default(true),
  bankTransferEnabled: boolean("bank_transfer_enabled").notNull().default(true),
  defaultDeliveryFeeMinor: integer("default_delivery_fee_minor").notNull().default(0),
  updatedAt: updatedAt(),
});

export const contentPage = pgTable("content_page", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  approvedAt: timestamp("approved_at", { withTimezone: true, mode: "date" }),
  updatedAt: updatedAt(),
});

export const contactMessage = pgTable("contact_message", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: createdAt(),
});

export const userRelations = relations(user, ({ many }) => ({
  addresses: many(address),
  orders: many(customerOrder, { relationName: "customerOrders" }),
  paymentsRecorded: many(customerOrder, { relationName: "paymentsRecorded" }),
  orderEvents: many(orderEvent, { relationName: "orderEvents" }),
  carts: many(cart),
}));

export const addressRelations = relations(address, ({ one }) => ({
  user: one(user, { fields: [address.userId], references: [user.id] }),
}));

export const productRelations = relations(product, ({ one, many }) => ({
  category: one(category, { fields: [product.categoryId], references: [category.id] }),
  brand: one(brand, { fields: [product.brandId], references: [brand.id] }),
  variants: many(productVariant),
  images: many(productImage),
}));

export const productVariantRelations = relations(productVariant, ({ one, many }) => ({
  product: one(product, { fields: [productVariant.productId], references: [product.id] }),
  images: many(productImage),
}));

export const productImageRelations = relations(productImage, ({ one }) => ({
  product: one(product, { fields: [productImage.productId], references: [product.id] }),
  variant: one(productVariant, {
    fields: [productImage.variantId],
    references: [productVariant.id],
  }),
}));

export const cartRelations = relations(cart, ({ one, many }) => ({
  user: one(user, { fields: [cart.userId], references: [user.id] }),
  items: many(cartItem),
}));

export const cartItemRelations = relations(cartItem, ({ one }) => ({
  cart: one(cart, { fields: [cartItem.cartId], references: [cart.id] }),
  variant: one(productVariant, {
    fields: [cartItem.variantId],
    references: [productVariant.id],
  }),
}));

export const customerOrderRelations = relations(customerOrder, ({ one, many }) => ({
  user: one(user, {
    fields: [customerOrder.userId],
    references: [user.id],
    relationName: "customerOrders",
  }),
  paidBy: one(user, {
    fields: [customerOrder.paidByUserId],
    references: [user.id],
    relationName: "paymentsRecorded",
  }),
  items: many(orderItem),
  events: many(orderEvent),
}));

export const orderEventRelations = relations(orderEvent, ({ one }) => ({
  order: one(customerOrder, { fields: [orderEvent.orderId], references: [customerOrder.id] }),
  actor: one(user, {
    fields: [orderEvent.actorUserId],
    references: [user.id],
    relationName: "orderEvents",
  }),
}));

export const orderItemRelations = relations(orderItem, ({ one }) => ({
  order: one(customerOrder, { fields: [orderItem.orderId], references: [customerOrder.id] }),
  variant: one(productVariant, {
    fields: [orderItem.variantId],
    references: [productVariant.id],
  }),
}));
