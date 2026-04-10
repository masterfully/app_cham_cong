import { FilterType, SlotParts } from "./types";

export const STORAGE_KEY = "app-cham-cong-rows-v1";
export const DAY_DEFAULTS_STORAGE_KEY = "app-cham-cong-day-defaults-v1";

export const DAY_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export const DAY_NAME_ALIASES: Record<string, string> = {
  "Chủ Nhật": "CN",
  "Thứ 2": "T2",
  "Thứ 3": "T3",
  "Thứ 4": "T4",
  "Thứ 5": "T5",
  "Thứ 6": "T6",
  "Thứ 7": "T7",
  CN: "CN",
  T2: "T2",
  T3: "T3",
  T4: "T4",
  T5: "T5",
  T6: "T6",
  T7: "T7"
};

export const FILTERS: Array<{ key: FilterType; label: string }> = [
  { key: "all", label: "Tất cả" },
  { key: "week", label: "Tuần này" },
  { key: "month", label: "Tháng này" }
];

export const DEFAULT_SLOT_PARTS: SlotParts = {
  startHour: "08",
  startMinute: "00",
  endHour: "12",
  endMinute: "00"
};
