# Deploy Glossy

Nothing in this repository deploys itself. This guide is the order to follow when you choose to launch.

The app is a long-running Node process: `npm run build`, then `npm run start`. It uses a PostgreSQL pool and is not a fit for a short-lived serverless function. Local Postgres is the `db` service in `docker-compose.yml` (PostgreSQL 18).

## Recommended services

One Hetzner Cloud CX23 in Germany or Finland, with PostgreSQL on that same server, Caddy for HTTPS, Cloudflare R2 for images, and Resend for account email. The README’s old “Deploy on Vercel” text was the Next.js template, not this project’s host.

Prices below exclude VAT. Confirm VAT for an Israeli customer. The euro figure uses about 3.48 ILS per euro on 30 September 2026 and is an estimate.

| Piece | Role | Price | Required |
| --- | --- | --- | --- |
| Hetzner CX23 | App and Postgres. 2 shared vCPU, 4 GB RAM, 40 GB disk. Monthly cap. | €5.49 / month | Yes |
| Primary IPv4 | Public address. IPv6 is free. | €0.50 / month | Yes, unless the site is IPv6-only |
| Domain | `.com` at Cloudflare Registrar, at cost, about $10.46 / year in September 2026 | about ILS 3 / month | Yes |
| Cloudflare R2 | Product images and the logo. 10 GB-month, 1 million Class A, and 10 million Class B included. Then $0.015 / GB-month, $4.50 / million Class A, $0.36 / million Class B. Egress is free. | ILS 0 inside that allowance | Yes |
| Resend | Verification and password reset. Free plan: 3,000 emails / month and 100 / day. Pro is $20 / month. | ILS 0 inside the free quota | Yes |
| Meta Pixel | Optional visits. Stays off when `META_PIXEL_ID` is empty. | Separate from this allowance | No |
| Hetzner backups add-on | Optional disk snapshots. Confirm the current price on the order form. | Extra | No |

Server plus IPv4 is €5.99 / month, about ILS 21. With the domain, a small catalog inside the R2 allowance, and mail inside Resend’s free quota, the estimate is about ILS 24 / month. That is under the ILS 60 allowance, with roughly ILS 36 left before VAT. Resend Pro at $20 / month does not fit on top of that allowance. Vercel Pro is $20 / month before a database, so it is not this setup.

Sources: [Hetzner price adjustment](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/), [Hetzner primary IPs](https://docs.hetzner.com/cloud/servers/primary-ips/overview/), [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/), [Resend pricing](https://resend.com/pricing).

## Configuration

Copy `.env.example` to a file outside git. `.gitignore` already ignores `.env*`. Do not commit secrets, dumps, or backup credentials.

| Variable | Production |
| --- | --- |
| `DATABASE_URL` | Postgres URL for this server. Not the local `glossy` / `glossy_test` URLs. |
| `BETTER_AUTH_SECRET` | Long random value. |
| `BETTER_AUTH_URL` | Public `https://` origin. Localhost is rejected. |
| `RESEND_API_KEY` | Sending-only key. |
| `EMAIL_FROM` | Address on a domain verified in Resend. |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` | All five. Missing R2 stops production startup and image saves. |
| `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` | Used only by `npm run db:admin`. Password at least 16 characters and not the example placeholder. |
| `META_PIXEL_ID` | Leave empty until the client creates a Pixel and agrees to the banner. |
| `TEST_DATABASE_URL` | Tests only. Do not set this on the server. |
| `NEXT_DIST_DIR` | Isolated local dev only. Do not set this in production. |

In production the process throws before it serves if a required variable is missing or `BETTER_AUTH_URL` is not HTTPS. The error names the variable and does not print the value. Cart cookies are `secure` when `NODE_ENV` is `production`. Better Auth uses the HTTPS base URL.

## Startup order

1. Create the CX23, attach the IPv4, and point the domain’s A record at it. Install Caddy and let it obtain a certificate for the domain.
2. Install Node 20 or newer and PostgreSQL 18. Create a role and database. Do not reuse the local password `glossy`.
3. Put the env file where the process can read it and nowhere under `public/` or git.
4. `npm ci` (keep dev dependencies so `drizzle-kit` can migrate), then `npm run build`.
5. Take a database dump (see Backups) before the first migration on a database you care about.
6. `npm run db:migrate`
7. `npm run db:admin`
8. `npm run start` behind Caddy, proxying to port 3000. Do not use `npm run dev` or `npm run db:seed`.

`npm run db:seed` loads sample products and is refused when `NODE_ENV` is `production`.

Caddy site, as a starting point:

```
shop.example {
  reverse_proxy 127.0.0.1:3000
}
```

## Email and images

In Resend, verify the domain used in `EMAIL_FROM`, then request a password reset on the live site and confirm the message arrives. The link must use the HTTPS origin.

Create an R2 bucket, a public URL, and an API token that can read and write that bucket. Upload a product image in admin and confirm the stored URL starts with `R2_PUBLIC_URL`. Production does not write `public/uploads`.

To copy images that were saved locally, from a machine that has the files and `DATABASE_URL`:

```bash
npm run uploads:copy
npm run uploads:copy -- --apply
```

The first command is a dry run. It lists `public/uploads` files and rows whose image or logo URL starts with `/uploads/`. `--apply` uploads them under `migrated/` and rewrites those rows. It does not delete local files. Do not run `--apply` until R2 is configured and you have a database dump.

## Checks after launch

- `GET /api/health` returns `{ "ok": true }`. A database failure returns 503 and `{ "ok": false }` with no connection details.
- The homepage loads over HTTPS.
- A customer can register only as a normal account. The admin can sign in.
- An image upload returns an R2 URL. Removing it deletes the object, not a local file.
- Cash and bank orders stay unpaid until an admin records the money.
- No Meta request is made while `META_PIXEL_ID` is empty.

## Rollback

Migrations `0000` through `0007` add tables and nullable columns. They do not drop data. Before `db:migrate`, run `pg_dump`. Restoring that dump is the way back. Do not drop columns by hand. After an additive migration, the previous app build can still run.

## Backups

Tested in development: migrate a new empty database, dump it, restore it into a second empty database, and compare table names. That did not use the live database.

On the server, run daily and keep 14 days, in a directory outside the repo and outside `public/`:

```bash
pg_dump --format=custom --file=/var/backups/glossy/glossy-$(date +%F).dump "$DATABASE_URL"
```

Copy those files off the server. A disk failure removes both Postgres and a dump that lives only on that disk.

Restore:

```bash
createdb glossy_restore
pg_restore --dbname=glossy_restore --no-owner glossy-YYYY-MM-DD.dump
```

Check the app against the restored database before pointing `DATABASE_URL` at it.

R2 is not inside the database dump. Turn on bucket versioning, or copy the bucket to a second location on a schedule. That image procedure is written here and was not run against a live bucket.

## Still needed before launch

- The client’s slogan, logo, WhatsApp, Instagram, public email or phone, and real bank instructions.
- Approved text for delivery, privacy, and terms. Until then those pages say the text is not approved. That is not a legal review.
- A domain, the Hetzner server, a Postgres role that is not the local `glossy` password, Resend on the real domain, and R2 keys.
- A decision about Meta. Leave `META_PIXEL_ID` empty until then.

Do not run `db:seed` on production.
