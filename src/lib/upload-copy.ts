export type UploadReference = {
  table: "product_image" | "store_setting";
  id: string;
  url: string;
};

export type UploadCopyStep = {
  table: UploadReference["table"];
  id: string;
  from: string;
  filename: string;
  fileFound: boolean;
  to: string | null;
};

export function planUploadCopy(localFiles: string[], references: UploadReference[], publicUrl: string) {
  const base = publicUrl.replace(/\/$/, "");
  return references
    .filter((reference) => reference.url.startsWith("/uploads/"))
    .map((reference) => {
      const filename = reference.url.slice("/uploads/".length);
      const fileFound = localFiles.includes(filename) && !filename.includes("/") && !filename.includes("..");
      return {
        table: reference.table,
        id: reference.id,
        from: reference.url,
        filename,
        fileFound,
        to: fileFound && base ? `${base}/migrated/${filename}` : null,
      } satisfies UploadCopyStep;
    });
}
