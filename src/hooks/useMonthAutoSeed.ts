import { useEffect } from "react";
import { DEFAULT_SLOT_PARTS } from "../constants";
import { toISODate, getDayNameFromDate } from "../utils/date";
import { createId } from "../utils/storage";
import { parseSlotParts } from "../utils/time";
import { getSettingsForDay } from "../utils/appHelpers";
import { createCustomRow } from "../utils/rowFactory";
import type { DayDefaultSetting, WorkRow } from "../types";

export function useMonthAutoSeed(options: {
  rows: WorkRow[];
  setRows: (updater: (prev: WorkRow[]) => WorkRow[]) => void;
  dayDefaultSettings: DayDefaultSetting[];
  goldRows: WorkRow[];
  setGoldRows: (updater: (prev: WorkRow[]) => WorkRow[]) => void;
  goldDayDefaultSettings: DayDefaultSetting[];
  showToast: (message: string, kind?: "success" | "error") => void;
  forceSeedMonth?: boolean;
}): void {
  const { rows, setRows, dayDefaultSettings, goldRows, setGoldRows, goldDayDefaultSettings, showToast } = options;

  useEffect(() => {
    const today = new Date();
    const isFirst = today.getDate() === 1;
    if (!isFirst && !options.forceSeedMonth) {
      return;
    }

    const year = today.getFullYear();
    const monthIndex = today.getMonth(); // 0-based
    const monthPrefix = `${year}-${String(monthIndex + 1).padStart(2, "0")}-`;

    // Seed main rows if none exist for the month
    if (!rows.some((r) => r.date.startsWith(monthPrefix))) {
      const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
      const generated: WorkRow[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const date = toISODate(new Date(year, monthIndex, d));
        const dayName = getDayNameFromDate(date);
        const defaults = getSettingsForDay(dayDefaultSettings, dayName);
        if (defaults.length > 0) {
          for (const setting of defaults) {
            const parts = parseSlotParts(setting.slot);
            const res = createCustomRow({
              id: createId(),
              dayOfWeek: dayName,
              date,
              startHour: parts.startHour,
              startMinute: parts.startMinute,
              endHour: parts.endHour,
              endMinute: parts.endMinute
            });
            if (res.row) {
              generated.push(res.row);
            }
          }
        } else {
          const parts = DEFAULT_SLOT_PARTS;
          const res = createCustomRow({
            id: createId(),
            dayOfWeek: dayName,
            date,
            startHour: parts.startHour,
            startMinute: parts.startMinute,
            endHour: parts.endHour,
            endMinute: parts.endMinute
          });
          if (res.row) {
            generated.push(res.row);
          }
        }
      }

      if (generated.length > 0) {
        setRows((prev) => [...generated, ...prev]);
        showToast(`Tạo ${generated.length} dòng cho tháng tự động.`, "success");
      }
    }

    // Seed gold rows if none exist for the month
    if (!goldRows.some((r) => r.date.startsWith(monthPrefix))) {
      const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
      const generatedGold: WorkRow[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const date = toISODate(new Date(year, monthIndex, d));
        const dayName = getDayNameFromDate(date);
        const defaults = getSettingsForDay(goldDayDefaultSettings, dayName);
        if (defaults.length > 0) {
          for (const setting of defaults) {
            const parts = parseSlotParts(setting.slot);
            const res = createCustomRow({
              id: createId(),
              dayOfWeek: dayName,
              date,
              startHour: parts.startHour,
              startMinute: parts.startMinute,
              endHour: parts.endHour,
              endMinute: parts.endMinute
            });
            if (res.row) {
              generatedGold.push(res.row);
            }
          }
        } else {
          const parts = DEFAULT_SLOT_PARTS;
          const res = createCustomRow({
            id: createId(),
            dayOfWeek: dayName,
            date,
            startHour: parts.startHour,
            startMinute: parts.startMinute,
            endHour: parts.endHour,
            endMinute: parts.endMinute
          });
          if (res.row) {
            generatedGold.push(res.row);
          }
        }
      }

      if (generatedGold.length > 0) {
        setGoldRows((prev) => [...generatedGold, ...prev]);
        showToast(`Tạo ${generatedGold.length} dòng Gold cho tháng tự động.`, "success");
      }
    }
  }, [rows, setRows, dayDefaultSettings, goldRows, setGoldRows, goldDayDefaultSettings, showToast]);
}

export default useMonthAutoSeed;
