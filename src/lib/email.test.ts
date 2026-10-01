import { afterEach, describe, expect, it, vi } from "vitest";
import { authRateLimit } from "@/lib/auth";
import {
  EmailConfigError,
  EmailDeliveryError,
  appBaseUrl,
  buildAuthEmail,
  emailFailureState,
  sendPasswordReset,
  sendVerificationEmail,
  takeDevVerificationUrl,
  takeEmailSendFailure,
} from "@/lib/email";

const token = "reset-token-should-not-leak";
const publicUrl = `https://shop.example/api/auth/reset-password/${token}?callbackURL=https%3A%2F%2Fshop.example%2Faccount%2Freset`;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("account email", () => {
  it("keeps reset and verification requests to three per minute in production", () => {
    expect(authRateLimit.customRules["/request-password-reset"]).toEqual({ window: 60, max: 3 });
    expect(authRateLimit.customRules["/send-verification-email"]).toEqual({ window: 60, max: 3 });
  });

  it("builds an Arabic message with a text alternative and the supplied public URL", () => {
    const message = buildAuthEmail({
      title: "إعادة تعيين كلمة المرور",
      body: "اختاري كلمة مرور جديدة.",
      url: publicUrl,
      linkLabel: "اختيار كلمة مرور جديدة",
    });
    expect(message.html).toContain('dir="rtl"');
    expect(message.html).toContain(publicUrl);
    expect(message.text).toContain(publicUrl);
    expect(message.text).toContain("اختيار كلمة مرور جديدة");
  });

  it("sends the supplied public URL in both the html and text parts", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("EMAIL_FROM", "Glossy <orders@example.com>");
    vi.stubEnv("BETTER_AUTH_URL", "https://shop.example");
    let payload: { html?: string; text?: string } = {};
    vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
      payload = JSON.parse(String(init?.body));
      return new Response("{}", { status: 200 });
    });
    await sendPasswordReset("person@example.com", publicUrl);
    expect(payload.html).toContain('dir="rtl"');
    expect(payload.html).toContain(publicUrl);
    expect(payload.text).toContain(publicUrl);
    expect(takeEmailSendFailure("person@example.com")).toBeNull();
  });

  it("does not report success or leak the token when production email is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("EMAIL_FROM", "");
    vi.stubEnv("BETTER_AUTH_URL", "https://shop.example");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(sendPasswordReset("person@example.com", publicUrl)).rejects.toBeInstanceOf(EmailConfigError);
    const outcome = emailFailureState(takeEmailSendFailure("person@example.com"));
    expect(outcome).toEqual({ error: "إعداد البريد غير مكتمل. لم تُرسل الرسالة." });
    expect(outcome).not.toHaveProperty("ok");
    expect(JSON.stringify(outcome)).not.toContain(token);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(takeDevVerificationUrl("person@example.com")).toBeNull();
  });

  it("does not report success or leak the provider response when sending fails", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("EMAIL_FROM", "Glossy <orders@example.com>");
    vi.stubEnv("BETTER_AUTH_URL", "https://shop.example");
    const logged: string[] = [];
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      logged.push(args.map(String).join(" "));
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(`provider body ${token} re_test_key`, { status: 502 })),
    );
    await expect(sendPasswordReset("person@example.com", publicUrl)).rejects.toBeInstanceOf(EmailDeliveryError);
    const outcome = emailFailureState(takeEmailSendFailure("person@example.com"));
    expect(outcome).toEqual({ error: "تعذر إرسال الرسالة. حاولي لاحقاً." });
    expect(JSON.stringify(outcome)).not.toContain(token);
    const logText = logged.join("\n");
    expect(logText).toContain("502");
    expect(logText).not.toContain(token);
    expect(logText).not.toContain("re_test_key");
    expect(logText).not.toContain("provider body");
  });

  it("hides the development link when production is set, even after one was stored", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("EMAIL_FROM", "");
    const supplied = "https://shop.example/api/auth/verify-email?token=verify-token&callbackURL=%2F";
    const stored = await sendVerificationEmail("dev@example.com", supplied);
    expect(stored).toContain("https://shop.example/");
    expect(stored).toContain("callbackURL=%2Faccount%2Fverify");
    expect(stored).not.toContain("localhost");
    expect(takeDevVerificationUrl("dev@example.com")).toContain("verify-token");
    vi.stubEnv("NODE_ENV", "production");
    expect(takeDevVerificationUrl("dev@example.com")).toBeNull();
  });

  it("refuses to start without a site URL and will not send a localhost link in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BETTER_AUTH_URL", "");
    expect(() => appBaseUrl()).toThrow(/BETTER_AUTH_URL is required/);
    vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3001");
    expect(appBaseUrl()).toBe("http://localhost:3001");
    expect(() =>
      buildAuthEmail({
        title: "إعادة تعيين",
        body: "رابط محلي",
        url: `http://localhost:3001/api/auth/reset-password/${token}`,
        linkLabel: "الرابط",
      }),
    ).toThrow(EmailConfigError);
  });
});
