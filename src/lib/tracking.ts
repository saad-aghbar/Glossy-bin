export type TrackingChoice = "granted" | "denied" | null;

export function configuredPixelId(value: string | null | undefined) {
  const id = value?.trim() ?? "";
  return /^\d{5,20}$/.test(id) ? id : "";
}

export function shouldLoadPixel(input: { pixelId: string; consent: TrackingChoice; isAdmin: boolean }) {
  return Boolean(input.pixelId) && input.consent === "granted" && !input.isAdmin;
}

export function purchaseEvent(input: { currency: string; totalMinor: number; minorUnit: number; publicToken: string }) {
  return {
    currency: input.currency,
    value: input.totalMinor / input.minorUnit,
    eventID: input.publicToken,
  };
}
