import type { DateFormat, TimeFormat } from "@/types/app-settings";

export function formatAppDate(
  value: string,
  locale: string,
  dateFormat: DateFormat,
): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const parts = {
    day: String(date.getDate()).padStart(2, "0"),
    month: String(date.getMonth() + 1).padStart(2, "0"),
    year: String(date.getFullYear()),
  };
  if (dateFormat === "month-day-year") {
    return `${parts.month}/${parts.day}/${parts.year}`;
  }
  if (dateFormat === "year-month-day") {
    return `${parts.year}-${parts.month}-${parts.day}`;
  }
  return `${parts.day}.${parts.month}.${parts.year}`;
}

export function formatAppDateTime(
  value: string,
  locale: string,
  dateFormat: DateFormat,
  timeFormat: TimeFormat,
): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const time = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    hour12: timeFormat === "system" ? undefined : timeFormat === "12-hour",
    minute: "2-digit",
  }).format(date);
  return `${formatAppDate(value, locale, dateFormat)} · ${time}`;
}
