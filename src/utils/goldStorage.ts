import { createId } from "./storage";
import { toISODate } from "./date";
import { WorkRow, WorkRowInput, DayDefaultSetting } from "../types";

export function loadGoldRows(): WorkRow[] {
  try {
    const rawData = localStorage.getItem("goldRows");
    if (!rawData) {
      return [];
    }
    const parsedData: unknown = JSON.parse(rawData);
    if (!Array.isArray(parsedData)) {
      return [];
    }
    return parsedData.map((row: unknown) => {
      const r = row as WorkRowInput;
      return {
        id: r.id ?? createId(),
        dayOfWeek: r.dayOfWeek ?? "Thứ Hai",
        date: r.date ?? toISODate(new Date()),
        slot: r.slot ?? "09:00-17:00",
        hours: Number(r.hours) || 8,
        checked: Boolean(r.checked)
      };
    });
  } catch (error) {
    console.warn("Dữ liệu localStorage gold không hợp lệ", error);
    return [];
  }
}

export function loadGoldDayDefaultSettings(): DayDefaultSetting[] {
  try {
    const rawData = localStorage.getItem("goldDayDefaultSettings");
    if (!rawData) {
      return [];
    }
    const parsedData: unknown = JSON.parse(rawData);
    if (!Array.isArray(parsedData)) {
      return [];
    }
    return parsedData.map((setting: unknown) => {
      const s = setting as Omit<DayDefaultSetting, "id">;
      return {
        id: (setting as DayDefaultSetting).id ?? createId(),
        dayOfWeek: s.dayOfWeek ?? "Thứ Hai",
        slot: s.slot ?? "09:00-17:00"
      };
    });
  } catch (error) {
    console.warn("Dữ liệu localStorage gold default settings không hợp lệ", error);
    return [];
  }
}

export function persistGoldRows(rows: WorkRow[]): void {
  localStorage.setItem("goldRows", JSON.stringify(rows));
}

export function persistGoldDayDefaultSettings(settings: DayDefaultSetting[]): void {
  localStorage.setItem("goldDayDefaultSettings", JSON.stringify(settings));
}
