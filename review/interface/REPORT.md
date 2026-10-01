# Glossy interface review

Captured from the test store at `http://localhost:3002` on 30 September 2026. The live store on port 3001 was not opened and its data was not changed. Screenshots are full-page PNGs at 390px and 1440px. Each file’s pixel width matches that viewport.

The product header is sticky. These full-page images hold it in normal flow so it is not painted again through the middle of a long page. Native select menus are drawn by the system and do not appear inside the page image; the filter shots show the focused control. No motion recording was taken.

Signing in used the existing test accounts. Passwords are not in these images. A signed-in capture added the published lipstick to that test cart so the bag, delete dialog, and checkout could be seen. No order was placed.

108 screenshots. Names are `{390|1440}-{page}.png`.

## Pages

Storefront: home, catalog, empty search, lipstick product, mixed-name product, empty cart, signed-in cart, checkout, contact, delivery, privacy, terms, an order confirmation, and the missing page.

Account: login, register, forgot password, reset, verify, profile, addresses, orders, and one order.

Admin: sales summary, products, new product, product editor, categories, brands, offers, discounts, delivery, orders, one order, customers, one customer, messages, pages, and settings.

Separate states: open phone menu, shade choice, focused filters, delete dialogs, and failed contact, login, register, forgot-password, and settings saves.

## Visible problems

| Page | Viewport | File | Component | What is wrong |
| --- | --- | --- | --- | --- |
| Addresses, cart, discount list | 390 and 1440 | `390-address-dialog.png`, `390-cart-dialog.png`, `390-admin-delete-dialog.png`, `1440-address-dialog.png`, `1440-cart-dialog.png`, `1440-admin-delete-dialog.png` | Confirm dialog | The dialog sits in the top corner and covers the header. إلغاء and تأكيد overlap the links behind them. |
| Admin home with the phone menu open | 390 | `390-admin-menu.png` | Phone menu and admin navigation | The store menu opens over the admin link row. الكل covers لوحة المبيعات. |
| Admin products | 1440 | `1440-admin-products.png`, `1440-admin-products-filter.png` | Product filter form | تصفية is an 87×80 circle pressed against the stock select. At 390 the same button is a normal full-width pill. |
| Admin products, orders, discounts, sales summary | 390 and 1440 | `390-admin-dashboard.png`, `390-admin-orders.png`, `1440-admin-discounts.png` | Date fields | Arabic pages show `mm/dd/yyyy`. On the discount form the date placeholder is broken (`dd/yyyy, --:-- --`). |
| Admin settings | 390 and 1440 | `390-admin-settings.png`, `390-settings-error.png` | Logo file field | The file control says “Choose File” and “No file chosen” in English. The invalid Instagram save itself is readable: رابط إنستغرام غير صالح, and the typed value stays. |
| Admin navigation | 390 | `390-admin-products.png`, `390-admin-messages.png` | Admin navigation | The link row scrolls sideways. Later destinations, including الرسائل and الإعدادات, are outside the first screen. |
| Admin orders | 390 and 1440 | `390-admin-orders.png`, `1440-admin-orders.png` | Order list | The first page is a tall stack of similar cards. The summary says 89 stored orders; this page shows one page of them. |
| Admin messages | 390 and 1440 | `390-admin-messages.png`, `1440-admin-messages.png` | Messages page | With no messages, the page is only the heading الرسائل. |
| Mixed-name product | 390 and 1440 | `390-product-longname.png`, `1440-product-longname.png` | Product page | لمسة Glow الطويلة للتجربة is on the home page and in the catalog, but opening it shows الصفحة غير موجودة. These two files match the missing-page shots. |
| Checkout | 390 and 1440 | `390-checkout.png`, `1440-checkout.png` | Checkout form | راجعي السلة قبل تأكيد الطلب. sits just above the disabled submit, after the address fields, so it is not visible when the page opens. |
| Cart | 390 and 1440 | `390-cart.png`, `1440-cart.png` | Cart line | The unavailable line says لم يعد هذا المنتج متاحاً للبيع. and still shows a quantity and تحديث next to حذف. |
| Account | 390 | `390-account.png` | Account navigation | خروج sits alone at the far end of the row, away from الملف, العناوين, and الطلبات. |

Contact, login, register, and forgot-password failures show a readable Arabic alert and keep the form. The empty catalog search keeps لايوجد and shows لا توجد منتجات مطابقة. The phone menu on the store home opens and lists الكل and تواصل without covering the product grid. The lipstick page shows its shades, price, and quantity. No page-level horizontal scrollbar was measured at either width.
