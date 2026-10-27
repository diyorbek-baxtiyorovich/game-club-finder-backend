import type { Club } from "./club.schema.js";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const DAY_BY_SHORT_NAME: Record<string, (typeof DAY_KEYS)[number]> = {
  Sun: "sun", Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri", Sat: "sat",
};

function localParts(at: Date, timezone: string): { day: (typeof DAY_KEYS)[number]; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    day: DAY_BY_SHORT_NAME[values.weekday],
    minute: Number(values.hour) * 60 + Number(values.minute),
  };
}

function minuteOfDay(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function isOpenAt(
  workingHours: Club["workingHours"],
  timezone: string,
  at: Date,
): boolean {
  const { day, minute } = localParts(at, timezone);
  const dayIndex = DAY_KEYS.indexOf(day);
  const previousDay = DAY_KEYS[(dayIndex + DAY_KEYS.length - 1) % DAY_KEYS.length];
  const currentIntervals = workingHours[day] ?? [];
  const previousIntervals = workingHours[previousDay] ?? [];

  if (currentIntervals.some(({ open, close }) => open === "00:00" && close === "00:00")) return true;
  if (currentIntervals.some(({ open, close }) => {
    const start = minuteOfDay(open);
    const end = minuteOfDay(close);
    return end > start ? minute >= start && minute < end : minute >= start;
  })) return true;

  return previousIntervals.some(({ open, close }) => {
    const start = minuteOfDay(open);
    const end = minuteOfDay(close);
    return end < start && minute < end;
  });
}
