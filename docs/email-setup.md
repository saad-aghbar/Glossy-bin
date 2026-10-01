# Email setup

Glossy sends account verification and password-reset mail through [Resend](https://resend.com). The app does not send mail until the three values below are set. It never falls back to `localhost` in production.

## 1. Verify the sending domain

In Resend, add the domain you will send from and publish the DNS records Resend shows (usually SPF and DKIM). Wait until Resend marks the domain verified. This project does not change DNS for you.

## 2. Create a sending-only API key

Create an API key that can send email and cannot manage the Resend account, domains, or other keys. Put it only in the server environment:

```bash
RESEND_API_KEY=re_replace_with_a_sending_only_key
```

Do not commit the real key, and do not put it in client code.

## 3. Set the from address

Use an address on the verified domain:

```bash
EMAIL_FROM=Glossy <orders@example.com>
```

Replace `example.com` with the verified domain. The display name can stay `Glossy`.

## 4. Set the public site URL

`BETTER_AUTH_URL` is the origin Better Auth uses to build links in those emails.

```bash
# On this machine the app runs at port 3001.
BETTER_AUTH_URL=http://localhost:3001

# Production must be the public site, for example:
# BETTER_AUTH_URL=https://shop.example
```

In production the app refuses to start when `BETTER_AUTH_URL` is missing. It also refuses to send a message whose link points at localhost, so a local address cannot be baked into a production email. Links inside the message are the URLs Better Auth passes in.

## 5. How to test

Local development, with `RESEND_API_KEY` unset, does not call Resend. Registration and password reset show the link on the page instead. That link is not shown when `NODE_ENV` is `production`.

Before going live:

1. Set `RESEND_API_KEY`, `EMAIL_FROM`, and `BETTER_AUTH_URL` in the production environment.
2. Restart the app.
3. Register a mailbox you can open, or use the password-reset form with a real account.
4. Confirm the message is Arabic, right-to-left, and the link starts with the public `https` origin.
5. Open an expired or already-used link and confirm the page explains that in Arabic instead of signing the person in or changing the password.

Automated tests mock Resend. They do not send a real message.
