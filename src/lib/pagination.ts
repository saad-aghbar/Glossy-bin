export function one(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function parsePagination(
  params: { page?: string | string[]; pageSize?: string | string[] },
  fallbackSize: number,
) {
  const page = Math.max(1, Number.parseInt(one(params.page) || "1", 10) || 1);
  const requested = Number.parseInt(one(params.pageSize) || String(fallbackSize), 10) || fallbackSize;
  const pageSize = Math.min(48, Math.max(1, requested));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function pageCount(total: number, pageSize: number) {
  return Math.max(1, Math.ceil(total / pageSize));
}
