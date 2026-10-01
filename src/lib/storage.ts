import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { newId } from "./ids";

const MAX_BYTES = 5 * 1024 * 1024;

function sniff(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { type: "image/jpeg", ext: "jpg" };
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { type: "image/png", ext: "png" };
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { type: "image/webp", ext: "webp" };
  }
  return null;
}

function r2() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) return null;
  return {
    bucket,
    publicUrl,
    client: new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
}

export async function saveProductImage(file: File) {
  if (file.size <= 0 || file.size > MAX_BYTES) {
    throw new Error("حجم الصورة يجب أن يكون أقل من ٥ ميغابايت");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = sniff(buffer);
  if (!kind) {
    throw new Error("الصورة يجب أن تكون JPEG أو PNG أو WebP");
  }
  const key = `products/${newId()}.${kind.ext}`;
  const remote = r2();
  if (remote) {
    await remote.client.send(
      new PutObjectCommand({
        Bucket: remote.bucket,
        Key: key,
        Body: buffer,
        ContentType: kind.type,
      }),
    );
    return `${remote.publicUrl}/${key}`;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("R2 image storage is not configured");
  }

  const directory = path.join(process.cwd(), "public", "uploads");
  await mkdir(directory, { recursive: true });
  const filename = key.replace("products/", "");
  await writeFile(path.join(directory, filename), buffer);
  return `/uploads/${filename}`;
}

export async function deleteStoredImage(url: string) {
  const remote = r2();
  if (remote && url.startsWith(`${remote.publicUrl}/`)) {
    const key = url.slice(remote.publicUrl.length + 1);
    await remote.client.send(new DeleteObjectCommand({ Bucket: remote.bucket, Key: key }));
    return;
  }
  if (url.startsWith("/uploads/")) {
    const filename = path.basename(url);
    await unlink(path.join(process.cwd(), "public", "uploads", filename)).catch(() => undefined);
  }
}
