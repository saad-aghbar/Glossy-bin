export function minorDecimals(minorUnit: number) {
  const decimals = Math.round(Math.log10(minorUnit));
  if (!Number.isInteger(decimals) || 10 ** decimals !== minorUnit || decimals < 0 || decimals > 4) {
    throw new Error("وحدة العملة غير صالحة");
  }
  return decimals;
}

export function majorToMinor(input: string, minorUnit: number) {
  const decimals = minorDecimals(minorUnit);
  const normalized = input.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("المبلغ غير صالح");
  }
  const [whole, fraction = ""] = normalized.split(".");
  if (fraction.length > decimals) {
    throw new Error("المبلغ غير صالح");
  }
  const padded = fraction.padEnd(decimals, "0");
  const minor = Number(whole) * minorUnit + Number(padded || "0");
  if (!Number.isSafeInteger(minor) || minor > 1_000_000_000) {
    throw new Error("المبلغ غير صالح");
  }
  return minor;
}

export function minorToInput(amount: number, minorUnit: number) {
  const decimals = minorDecimals(minorUnit);
  return (amount / minorUnit).toFixed(decimals);
}

export function formatMinor(amount: number, currency: string, minorUnit: number) {
  const decimals = minorDecimals(minorUnit);
  const major = amount / minorUnit;
  return new Intl.NumberFormat("ar", {
    style: "currency",
    currency,
    numberingSystem: "latn",
  minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(major);
}
