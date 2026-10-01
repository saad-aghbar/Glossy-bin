# Repair notes

Compared with `review/interface`. New shots are viewport and full-page captures with the sticky header left as written. No motion video: the browser tools here take stills.

## Root causes

The right-edge crop in the earlier full-page shots was not a page that sat outside the viewport. At 390 and 1440, `scrollWidth` matched the viewport, `scrollLeft` was 0, and the logo box stayed inside the screen on first paint, after fonts settled, after going back, and after the login error. A viewport shot of login was complete. A full-page shot of the same short RTL page was shifted. Chrome’s full-page capture does that when the document is no taller than the viewport. The login error was taller, so that full-page shot looked fine. The shell was not patched with `overflow-x: hidden`.

The confirm dialog sat in the top corner because Tailwind’s `dialog { margin: 0 }` overrides the browser’s `margin: auto`. `.confirm-dialog` now sets `margin: auto`. After the fade, computed opacity is 1, the surface is `rgb(251, 247, 242)`, and the top margin is half the leftover viewport height. Escape closes it. Reduced motion sets the dialog animation to `none`.

`لمسة Glow الطويلة للتجربة` 404’d because the page received the slug still percent-encoded (`page-slug "%D9%84..."`) while `generateMetadata` received the decoded slug and found the product. `getProductBySlug` now decodes once. Direct navigation, a catalog click, and a refresh all show the product heading.

Currency is `SAR` with minor unit 100 on both `glossy` (1 order) and `glossy_test` (89 orders). `formatMinor` is the only formatter, and ر.س. is what Arabic plus `SAR` produces. The amounts were not relabeled as shekels.

## What changed

- Confirm dialog: centered, opaque, titled, إلغاء and تأكيد separated, focus returns on close, opacity only.
- Admin destinations: a labeled drawer on a phone, a wrapping row from 768px. The store menu sits in the header flow instead of covering that row.
- Account: الملف والعناوين والطلبات stay together; خروج is a separate action beside them.
- Product and order lists: cards on a phone, labeled tables from 768px. Deletion uses the dialog and still posts `confirmDelete=yes`.
- Messages: لا توجد رسائل بعد.
- Filter action sits on its own row. Dates are day, month, and year fields. Offer and discount times are Jerusalem parts of the same instant. The logo and image pickers say اختيار ملف and show the chosen name.
- Cart: unavailable lines are explained at the top, and only those lines lose تحديث. Checkout repeats that explanation before the address, links back to the cart, puts ملخص الطلب first on a phone, and says why تأكيد الطلب is disabled. A blocked line is labeled غير مشمول so it is not added into الإجمالي.

57 tests passed. Typecheck, lint, and the production build passed. Port 3002 is stopped. Port 3001 was left running.
