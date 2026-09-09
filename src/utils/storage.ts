import { DAY_NAME_ALIASES, DAY_NAMES } from "../constants";
import { formatDate, getDayNameFromDate, toDateOnly, toISODate } from "./date";
import { WorkRow, WorkRowInput } from "../types";

export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function normalizeRow(row: WorkRowInput): WorkRow {
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(String(row.date ?? "")) ? String(row.date) : toISODate(new Date());
  const dateObj = toDateOnly(safeDate);
  const safeHours = Number(row.hours);
  const rawDayOfWeek = typeof row.dayOfWeek === "string" ? row.dayOfWeek.trim() : "";

  return {
    id: typeof row.id === "string" ? row.id : createId(),
    dayOfWeek: DAY_NAME_ALIASES[rawDayOfWeek] ?? DAY_NAMES[dateObj.getDay()],
    date: safeDate,
    slot: String(row.slot ?? "").trim(),
    hours: Number.isFinite(safeHours) && safeHours > 0 ? safeHours : 0.5,
    checked: Boolean(row.checked)
  };
}

export function matchesSearch(row: WorkRow, searchQuery: string): boolean {
  if (!searchQuery) {
    return true;
  }

  const normalizedQuery = searchQuery.toLowerCase();
  const searchableText = `${row.dayOfWeek} ${formatDate(row.date)} ${row.slot} ${row.hours}`.toLowerCase();
  return searchableText.includes(normalizedQuery);
}

export function areDateSetsEqual(left: Set<string>, right: Set<string>): boolean {
  if (left.size !== right.size) {
    return false;
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }
  return true;
}

export { getDayNameFromDate };
