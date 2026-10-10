import { TZDate } from "@date-fns/tz";
import {
  addDays,
  differenceInCalendarDays,
  differenceInMonths,
  format,
  startOfDay,
} from "date-fns";
import { es } from "date-fns/locale";

// All date logic takes the household time zone explicitly (env.APP_TIMEZONE on
// the server): never the implicit zone of the machine (CLAUDE.md §2.5).
// Isomorphic: client components use the relative formatters.

const MINUTE_MS = 60_000;
const HOUR_MINUTES = 60;
const DAY_MS = 24 * HOUR_MINUTES * MINUTE_MS;

export type DayRange = { start: Date; end: Date };

/** Natural day containing `instant` in `timeZone`, as a half-open [start, end). */
export function getDayRange(instant: Date, timeZone: string): DayRange {
  const start = startOfDay(new TZDate(instant, timeZone));
  // addDays on a TZDate lands on the next local midnight, so DST days last
  // 23 or 25 hours as they should.
  const end = addDays(start, 1);
  return { start: new Date(start.getTime()), end: new Date(end.getTime()) };
}

const DATETIME_LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Parses an `<input type="datetime-local">` value, which carries no zone,
 * as a wall-clock time in `timeZone`. Returns null for malformed or
 * impossible dates (e.g. Feb 31).
 */
export function parseDateTimeLocal(
  value: string,
  timeZone: string,
): Date | null {
  const match = DATETIME_LOCAL.exec(value);
  if (!match) return null;
  const [year, month, day, hours, minutes, seconds = 0] = match
    .slice(1)
    .map((part) => (part === undefined ? undefined : Number(part)));
  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    hours === undefined ||
    minutes === undefined
  ) {
    return null;
  }

  const local = new TZDate(
    year,
    month - 1,
    day,
    hours,
    minutes,
    seconds,
    timeZone,
  );
  if (local.getMonth() !== month - 1 || local.getDate() !== day) return null;
  return new Date(local.getTime());
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** `<input type="date">` value → midnight of that day in `timeZone`; null if invalid. */
export function parseDateOnly(value: string, timeZone: string): Date | null {
  if (!DATE_ONLY.test(value)) return null;
  return parseDateTimeLocal(`${value}T00:00`, timeZone);
}

/** "14:30" — 24 h clock in the household time zone. */
export function formatTime(instant: Date, timeZone: string): string {
  return format(new TZDate(instant, timeZone), "HH:mm");
}

/** `<input type="date">` value ("2026-10-08") of `instant` in `timeZone`. */
export function formatDateInputValue(instant: Date, timeZone: string): string {
  return format(new TZDate(instant, timeZone), "yyyy-MM-dd");
}

/** `<input type="datetime-local">` value ("2026-10-08T14:30") in `timeZone`. */
export function formatDateTimeLocalValue(
  instant: Date,
  timeZone: string,
): string {
  return format(new TZDate(instant, timeZone), "yyyy-MM-dd'T'HH:mm");
}

/** "2026-10-01" plus `days`, as plain calendar arithmetic (no time zone). */
export function addDaysToDate(date: string, days: number): string {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

/** A household day picked with the `?day=` filter (CLAUDE.md §2.4). */
export type CalendarDay = { date: string; isToday: boolean; range: DayRange };

/**
 * The day of a `?day=2026-10-01` parameter. A missing, malformed, impossible
 * or future value means today: a URL can never show an empty future day.
 */
export function resolveDay(
  param: string | undefined,
  now: Date,
  timeZone: string,
): CalendarDay {
  const today = formatDateInputValue(now, timeZone);
  const start = param ? parseDateOnly(param, timeZone) : null;
  // yyyy-MM-dd strings sort chronologically.
  if (!param || !start || param > today) {
    return { date: today, isToday: true, range: getDayRange(now, timeZone) };
  }
  return {
    date: param,
    isToday: param === today,
    range: getDayRange(start, timeZone),
  };
}

/** "Hoy", "Ayer" or "jue 1 oct", for the day navigation. */
export function formatDayLabel(
  day: CalendarDay,
  now: Date,
  timeZone: string,
): string {
  const today = formatDateInputValue(now, timeZone);
  if (day.date === today) return "Hoy";
  if (day.date === addDaysToDate(today, -1)) return "Ayer";
  return format(new TZDate(day.range.start, timeZone), "EEE d MMM", {
    locale: es,
  });
}

/** "hoy a las 18:00", "mañana a las 12:30", "el 12/10 a las 09:00". */
export function formatRelativeDayTime(
  instant: Date,
  now: Date,
  timeZone: string,
): string {
  const time = formatTime(instant, timeZone);
  const today = getDayRange(now, timeZone);
  if (instant >= today.start && instant < today.end) return `hoy a las ${time}`;
  const tomorrow = getDayRange(today.end, timeZone);
  if (instant >= tomorrow.start && instant < tomorrow.end) {
    return `mañana a las ${time}`;
  }
  return `el ${format(new TZDate(instant, timeZone), "dd/MM")} a las ${time}`;
}

/**
 * "9 oct", or "31 dic 2025" for another year: the dates of histories that
 * span months (growth, health), in the household zone.
 */
export function formatShortDate(
  instant: Date,
  now: Date,
  timeZone: string,
): string {
  const date = new TZDate(instant, timeZone);
  const isThisYear =
    date.getFullYear() === new TZDate(now, timeZone).getFullYear();
  return format(date, isThisYear ? "d MMM" : "d MMM yyyy", { locale: es });
}

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * A baby's age the way a paediatrician says it: days for two weeks, weeks
 * until two months, months until two years, then years and months. Read on
 * the household calendar (§2.5); the birth date is its local midnight.
 */
export function formatBabyAge(
  birthDate: Date,
  now: Date,
  timeZone: string,
): string {
  const born = new TZDate(birthDate, timeZone);
  const today = new TZDate(now, timeZone);
  const days = differenceInCalendarDays(today, born);
  if (days <= 0) return "Su primer día";
  if (days < 14) return countLabel(days, "día", "días");
  if (days < 56) return countLabel(Math.floor(days / 7), "semana", "semanas");
  const months = differenceInMonths(today, born);
  if (months < 24) return countLabel(months, "mes", "meses");
  const years = countLabel(Math.floor(months / 12), "año", "años");
  const rest = months % 12;
  return rest === 0 ? years : `${years} y ${countLabel(rest, "mes", "meses")}`;
}

/** "25 min", "1 h", "1 h 20 min". Negative durations read as "0 min". */
export function formatDuration(durationMs: number): string {
  const totalMinutes = Math.max(0, Math.floor(durationMs / MINUTE_MS));
  const hours = Math.floor(totalMinutes / HOUR_MINUTES);
  const minutes = totalMinutes % HOUR_MINUTES;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

/**
 * "ahora mismo", "hace 25 min", "hace 1 h 20 min", "hace 3 días".
 * Render it from a client component that ticks, so the text stays fresh and
 * server/client output never mismatch during hydration.
 */
export function formatTimeAgo(instant: Date, now: Date): string {
  const elapsedMs = now.getTime() - instant.getTime();
  // Future instants come from small clock drifts between devices.
  if (elapsedMs < MINUTE_MS) return "ahora mismo";
  if (elapsedMs < DAY_MS) return `hace ${formatDuration(elapsedMs)}`;
  const days = Math.floor(elapsedMs / DAY_MS);
  return days === 1 ? "hace 1 día" : `hace ${days} días`;
}

/**
 * Milliseconds since `startedAtMs` on the server's clock: `skewMs` is how far
 * this device's clock runs behind the server, so both parents' phones show
 * the same timer. Never negative.
 */
export function elapsedMs(
  startedAtMs: number,
  nowMs: number,
  skewMs: number,
): number {
  return Math.max(0, nowMs + skewMs - startedAtMs);
}

/** A running timer: "0:05", "12:34", "1:02:03". */
export function formatElapsed(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  if (hours === 0) return `${minutes}:${seconds}`;
  return `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`;
}

/** A day's history: the plain path for today, so it stays shareable. */
export function dayHref(basePath: string, date: string, today: string): string {
  return date === today ? basePath : `${basePath}?day=${date}`;
}

/**
 * DayNav props of a `?day=` history: the day before, the day after unless
 * it is today, and what its date picker needs (never a future day).
 */
export function dayNavProps(
  basePath: string,
  day: CalendarDay,
  now: Date,
  timeZone: string,
): {
  previousHref: string;
  nextHref: string | null;
  basePath: string;
  date: string;
  maxDate: string;
} {
  const today = formatDateInputValue(now, timeZone);
  return {
    previousHref: dayHref(basePath, addDaysToDate(day.date, -1), today),
    nextHref: day.isToday
      ? null
      : dayHref(basePath, addDaysToDate(day.date, 1), today),
    basePath,
    date: day.date,
    maxDate: today,
  };
}
