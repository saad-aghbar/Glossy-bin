export class EmailConfigError extends Error {
  constructor() {
    super("EMAIL_NOT_CONFIGURED");
    this.name = "EmailConfigError";
  }
}

export class EmailDeliveryError extends Error {
  constructor() {
    super("EMAIL_DELIVERY_FAILED");
    this.name = "EmailDeliveryError";
  }
}

type Mail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

const devVerificationUrls = new Map<string, string>();
const pendingFailures = new Map<string, "config" | "delivery">();

export function emailFailureState(kind: "config" | "delivery" | null) {
  if (kind === "config") return { error: "إعداد البريد غير مكتمل. لم تُرسل الرسالة." };
  if (kind === "delivery") return { error: "تعذر إرسال الرسالة. حاولي لاحقاً." };
  return null;
}

export function takeEmailSendFailure(email: string) {
  const key = email.toLowerCase();
  const kind = pendingFailures.get(key) ?? null;
  pendingFailures.delete(key);
  return kind;
}

function rememberFailure(email: string, error: unknown) {
  if (error instanceof EmailConfigError) pendingFailures.set(email.toLowerCase(), "config");
  if (error instanceof EmailDeliveryError) pendingFailures.set(email.toLowerCase(), "delivery");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function appBaseUrl() {
  const url = process.env.BETTER_AUTH_URL?.replace(/\/$/, "");
  if (!url) {
    throw new Error("BETTER_AUTH_URL is required");
  }
  return url;
}

export function buildAuthEmail(input: { title: string; body: string; url: string; linkLabel: string }) {
  if (process.env.NODE_ENV === "production" && /localhost|127\.0\.0\.1/i.test(input.url)) {
    throw new EmailConfigError();
  }
  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <body style="margin:0;background:#ffffff;color:#111111;font-family:Tahoma,sans-serif;">
    <div style="max-width:32rem;margin:0 auto;padding:2rem 1.25rem;">
      <h1 style="font-size:1.4rem;font-weight:500;">${escapeHtml(input.title)}</h1>
      <p style="line-height:1.7;">${escapeHtml(input.body)}</p>
      <p><a href="${escapeHtml(input.url)}" style="color:#111111;">${escapeHtml(input.linkLabel)}</a></p>
      <p style="color:#3f3f3f;font-size:0.9rem;">إذا لم تطلبي هذا الرابط، يمكنك تجاهل الرسالة.</p>
    </div>
  </body>
</html>`;
  const text = `${input.title}\n\n${input.body}\n\n${input.linkLabel}\n${input.url}\n\nإذا لم تطلبي هذا الرابط، يمكنك تجاهل الرسالة.`;
  return { html, text };
}

function withCallback(url: string, path: string) {
  const parsed = new URL(url);
  parsed.searchParams.set("callbackURL", path);
  return parsed.toString();
}

export function emailIsConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendMail(mail: Mail) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "production") {
      throw new EmailConfigError();
    }
    return false;
  }

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: mail.to,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      }),
    });
  } catch {
    console.error("[glossy] email request failed");
    throw new EmailDeliveryError();
  }

  if (!response.ok) {
    console.error("[glossy] email failed", response.status);
    throw new EmailDeliveryError();
  }
  return true;
}

function devLink(label: string, to: string, url: string) {
  if (process.env.NODE_ENV === "development") {
    console.info(`[glossy] ${label} for ${to}: ${url}`);
  }
}

export async function sendPasswordReset(to: string, url: string) {
  try {
    const message = buildAuthEmail({
      title: "إعادة تعيين كلمة المرور",
      body: "اضغطي الرابط التالي لاختيار كلمة مرور جديدة. ينتهي الرابط بعد ساعة، ولا يعمل إلا مرة واحدة.",
      url,
      linkLabel: "اختيار كلمة مرور جديدة",
    });
    const sent = await sendMail({
      to,
      subject: "إعادة تعيين كلمة المرور — Glossy",
      ...message,
    });
    if (!sent && process.env.NODE_ENV !== "production") {
      devLink("password reset", to, url);
      return url;
    }
    return null;
  } catch (error) {
    if (error instanceof EmailConfigError && process.env.NODE_ENV !== "production") {
      devLink("password reset", to, url);
      return url;
    }
    rememberFailure(to, error);
    throw error;
  }
}

export async function sendVerificationEmail(to: string, url: string) {
  let link = url;
  try {
    link = withCallback(url, "/account/verify");
    const message = buildAuthEmail({
      title: "تأكيد البريد",
      body: "أكّدي بريدك حتى نربط الطلبات السابقة التي استخدمت هذا العنوان. ينتهي الرابط بعد ساعة.",
      url: link,
      linkLabel: "تأكيد البريد",
    });
    const sent = await sendMail({
      to,
      subject: "تأكيد البريد — Glossy",
      ...message,
    });
    if (!sent && process.env.NODE_ENV !== "production") {
      devLink("email verification", to, link);
      devVerificationUrls.set(to.toLowerCase(), link);
      return link;
    }
    return null;
  } catch (error) {
    if (error instanceof EmailConfigError && process.env.NODE_ENV !== "production") {
      devVerificationUrls.set(to.toLowerCase(), link);
      return link;
    }
    rememberFailure(to, error);
    throw error;
  }
}

export function takeDevVerificationUrl(email: string) {
  if (process.env.NODE_ENV === "production") return null;
  if (process.env.RESEND_API_KEY) return null;
  return devVerificationUrls.get(email.toLowerCase()) ?? null;
}
