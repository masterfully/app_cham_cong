import { DAY_NAMES } from "../constants";
import { FilterType } from "../types";

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toDateOnly(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(dateString: string): string {
  if (!dateString) {
    return "";
  }
  const [, month, day] = dateString.split("-");
  return `${day}/${month}`;
}

export function formatDateWithYear(dateString: string): string {
  if (!dateString) {
    return "dd/mm/yyyy";
  }
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

export function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function parseYearMonth(value: string): { year: number; month: number } | null {
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  return { year, month };
}

export function formatMonthYearLabel(value: string): string {
  const parsed = parseYearMonth(value);
  if (!parsed) {
    return "--";
  }
  return `tháng ${parsed.month}/${parsed.year}`;
}

export function getStartOfWeek(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const offsetToMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offsetToMonday);
  return start;
}

export function getDayNameFromDate(dateString: string): string {
  return DAY_NAMES[toDateOnly(dateString).getDay()];
}

export function isInFilter(dateString: string, activeFilter: FilterType): boolean {
  if (activeFilter === "all") {
    return true;
  }

  const rowDate = toDateOnly(dateString);
  rowDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (activeFilter === "week") {
    const weekStart = getStartOfWeek(today);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return rowDate >= weekStart && rowDate <= weekEnd;
  }

  return rowDate.getMonth() === today.getMonth() && rowDate.getFullYear() === today.getFullYear();
}
