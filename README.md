# Glossy

Arabic shop for Glossy. The app runs on Node.js with Next.js, PostgreSQL, and optional Cloudflare R2 for images.

## Local development

1. Copy `.env.example` to `.env` and keep that file out of git.
2. Start Postgres: `docker compose up -d`
3. `npm install`
4. `npm run db:migrate`
5. `npm run db:seed` creates sample products and an admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`. This command is for development only.
6. `npm run dev` serves the app at [http://localhost:3001](http://localhost:3001).

`npm test` uses a separate `glossy_test` database.

## Production

Production is a long-running `next start` process, not the Vercel template that used to be in this file. The steps, costs, backups, and remaining launch items are in [docs/DEPLOY.md](docs/DEPLOY.md). The first admin is `npm run db:admin`, not the development seed.
