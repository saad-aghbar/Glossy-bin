import "dotenv/config";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { db, pool } from "../src/db";
import { productImage, storeSetting } from "../src/db/schema";
import { planUploadCopy, type UploadReference } from "../src/lib/upload-copy";

const uploadsDir = path.join(process.cwd(), "public", "uploads");

function contentType(filename: string) {
  if (filename.endsWith(".png")) return "image/png";
  if (filename.endsWith(".webp")) return "image/webp";
  if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

async function main() {
  const apply = process.argv.includes("--apply");
  const names = await readdir(uploadsDir).catch(() => [] as string[]);
  const files = names.filter((name) => !name.startsWith("."));
  const images = await db
    .select({ id: productImage.id, url: productImage.url })
    .from(productImage);
  const [settings] = await db
    .select({ id: storeSetting.id, logoUrl: storeSetting.logoUrl })
    .from(storeSetting)
    .limit(1);
  const references: UploadReference[] = [
    ...images.map((image) => ({ table: "product_image" as const, id: image.id, url: image.url })),
    ...(settings?.logoUrl ? [{ table: "store_setting" as const, id: settings.id, url: settings.logoUrl }] : []),
  ];
  const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "") ?? "";
  const steps = planUploadCopy(files, references, publicUrl);
  if (steps.length === 0 && files.length === 0) {
    console.info("No local uploads or /uploads/ references found.");
    return;
  }
  for (const step of steps) {
    console.info(`${apply ? "apply" : "dry-run"} ${step.table} ${step.id} ${step.from} -> ${step.to ?? "missing file"}`);
  }
  for (const file of files) {
    if (!steps.some((step) => step.filename === file)) {
      console.info(`${apply ? "apply" : "dry-run"} unreferenced file ${file}`);
    }
  }
  if (!apply) {
    console.info("Dry run only. Pass --apply to upload and rewrite references. Local files are not deleted.");
    return;
  }
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    throw new Error("R2 image storage is not configured");
  }
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  for (const step of steps) {
    if (!step.fileFound || !step.to) continue;
    const body = await readFile(path.join(uploadsDir, step.filename));
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: `migrated/${step.filename}`,
        Body: body,
        ContentType: contentType(step.filename),
      }),
    );
    if (step.table === "product_image") {
      await db.update(productImage).set({ url: step.to }).where(eq(productImage.id, step.id));
    } else {
      await db.update(storeSetting).set({ logoUrl: step.to }).where(eq(storeSetting.id, step.id));
    }
  }
  console.info("References updated. Local files were left in place.");
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Could not copy uploads";
    console.error(message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
