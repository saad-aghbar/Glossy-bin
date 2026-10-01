const ZONE = "Asia/Jerusalem";

export type InstantParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
};

export function composeDay(year: string, month: string, day: string) {
  if (!year && !month && !day) return "";
  if (!/^\d{4}$/.test(year) || !/^\d{1,2}$/.test(month) || !/^\d{1,2}$/.test(day)) return "invalid";
  const monthText = month.padStart(2, "0");
  const dayText = day.padStart(2, "0");
  const probe = new Date(`${year}-${monthText}-${dayText}T00:00:00Z`);
  if (
    probe.getUTCFullYear() !== Number(year) ||
    probe.getUTCMonth() + 1 !== Number(monthText) ||
    probe.getUTCDate() !== Number(dayText)
  ) {
    return "invalid";
  }
  return `${year}-${monthText}-${dayText}`;
}

export function resolveDay(direct: string, year: string, month: string, day: string) {
  if (year || month || day) return composeDay(year, month, day);
  return direct;
}

export function jerusalemParts(value: Date | null): InstantParts {
  if (!value) return { year: "", month: "", day: "", hour: "", minute: "" };
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { year: read("year"), month: read("month"), day: read("day"), hour: read("hour"), minute: read("minute") };
}

function offsetAt(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(read("year"), read("month") - 1, read("day"), read("hour"), read("minute"), read("second"));
  const minutes = Math.round((asUtc - date.getTime()) / 60000);
  const sign = minutes >= 0 ? "+" : "-";
  const absolute = Math.abs(minutes);
  return `${sign}${String(Math.floor(absolute / 60)).padStart(2, "0")}:${String(absolute % 60).padStart(2, "0")}`;
}

export function instantFromJerusalem(parts: InstantParts) {
  if (!parts.year && !parts.month && !parts.day && !parts.hour && !parts.minute) return null;
  const day = composeDay(parts.year, parts.month, parts.day);
  if (day === "" || day === "invalid") return null;
  if (!/^\d{1,2}$/.test(parts.hour || "0") || !/^\d{1,2}$/.test(parts.minute || "0")) return null;
  const hour = Number(parts.hour || "0");
  const minute = Number(parts.minute || "0");
  if (hour > 23 || minute > 59) return null;
  const clock = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const guess = new Date(`${day}T${clock}:00Z`);
  const date = new Date(`${day}T${clock}:00${offsetAt(guess)}`);
  return Number.isNaN(date.getTime()) ? null : date;
}
