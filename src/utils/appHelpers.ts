import { DayDefaultSetting, WorkRow } from "../types";
import { calculateSlotAndHours, parseSlotParts, parseSlotRangeInMinutes } from "./time";

export function getSettingsForDay(dayDefaultSettings: DayDefaultSetting[], dayOfWeek: string): DayDefaultSetting[] {
  return dayDefaultSettings
    .filter((setting) => setting.dayOfWeek === dayOfWeek)
    .sort((a, b) => {
      const aStart = parseSlotRangeInMinutes(a.slot)?.start ?? 0;
      const bStart = parseSlotRangeInMinutes(b.slot)?.start ?? 0;
      return aStart - bStart;
    });
}

export function getSelectedDefaultSettings(
  dayDefaultSettingsForFormDay: DayDefaultSetting[],
  selectedDefaultSettingIndices: Set<number>
): DayDefaultSetting[] {
  return dayDefaultSettingsForFormDay.filter((_, index) => selectedDefaultSettingIndices.has(index));
}

export function getTotalHoursForSettings(settings: DayDefaultSetting[]): number {
  return settings.reduce((totalHours, setting) => {
    const parts = parseSlotParts(setting.slot);
    const calculation = calculateSlotAndHours(parts.startHour, parts.startMinute, parts.endHour, parts.endMinute);
    return calculation.isValid ? totalHours + calculation.hours : totalHours;
  }, 0);
}

export function getRowConflict(rows: WorkRow[], candidateRow: WorkRow, ignoreRowId?: string): "duplicate" | "overlap" | null {
  const candidateSlotRange = parseSlotRangeInMinutes(candidateRow.slot);
  if (!candidateSlotRange) {
    return null;
  }

  for (const row of rows) {
    if (ignoreRowId && row.id === ignoreRowId) {
      continue;
    }

    if (row.date !== candidateRow.date) {
      continue;
    }

    if (row.slot === candidateRow.slot) {
      return "duplicate";
    }

    const existingSlotRange = parseSlotRangeInMinutes(row.slot);
    if (!existingSlotRange) {
      continue;
    }

    if (candidateSlotRange.start < existingSlotRange.end && existingSlotRange.start < candidateSlotRange.end) {
      return "overlap";
    }
  }

  return null;
}
