import { DAY_DEFAULTS_STORAGE_KEY, DAY_NAME_ALIASES, DAY_NAMES, STORAGE_KEY } from "../constants";
import { formatDate, getDayNameFromDate, toDateOnly, toISODate } from "./date";
import { parseSlotRangeInMinutes } from "./time";
import { DayDefaultSetting, DayDefaultSettingInput, WorkRow, WorkRowInput } from "../types";

export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeDayDefaultSetting(setting: DayDefaultSettingInput): DayDefaultSetting | null {
  const rawDayOfWeek = typeof setting.dayOfWeek === "string" ? setting.dayOfWeek.trim() : "";
  const normalizedDayOfWeek = DAY_NAME_ALIASES[rawDayOfWeek] ?? "";
  if (!DAY_NAMES.includes(normalizedDayOfWeek)) {
    return null;
  }

  const slot = String(setting.slot ?? "").trim();
  const slotRange = parseSlotRangeInMinutes(slot);
  if (!slotRange) {
    return null;
  }

  return {
    id: typeof setting.id === "string" && setting.id.trim() ? setting.id : createId(),
    dayOfWeek: normalizedDayOfWeek,
    slot
  };
}

export function loadDayDefaultSettings(): DayDefaultSetting[] {
  try {
    const rawData = localStorage.getItem(DAY_DEFAULTS_STORAGE_KEY);
    if (!rawData) {
      return [];
    }

    const parsedData: unknown = JSON.parse(rawData);
    if (!Array.isArray(parsedData)) {
      return [];
    }

    return parsedData
      .map((setting) => normalizeDayDefaultSetting(setting as DayDefaultSettingInput))
      .filter((setting): setting is DayDefaultSetting => setting !== null);
  } catch (error) {
    console.warn("Dữ liệu cài đặt mặc định không hợp lệ", error);
    return [];
  }
}

export function persistDayDefaultSettings(settings: DayDefaultSetting[]): void {
  try {
    localStorage.setItem(DAY_DEFAULTS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn("Không thể lưu cài đặt mặc định", error);
  }
}

// Removed automatic seed data. The app should start with an empty rows array
// unless the user has persisted data in localStorage.

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

export function loadRows(): WorkRow[] {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (!rawData) {
      return [];
    }

    const parsedData: unknown = JSON.parse(rawData);
    if (!Array.isArray(parsedData)) {
      return [];
    }

    // If the user explicitly cleared all rows, an empty array is valid and should be returned as-is.
    if (parsedData.length === 0) {
      return [];
    }

    return parsedData.map((row) => normalizeRow(row as WorkRowInput));
  } catch (error) {
    console.warn("Dữ liệu localStorage không hợp lệ", error);
    return [];
  }
}

export function persistRows(rows: WorkRow[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch (error) {
    console.warn("Không thể lưu localStorage", error);
  }
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
