export type FilterType = "all" | "week" | "month";

export type WorkRow = {
  id: string;
  dayOfWeek: string;
  date: string;
  slot: string;
  hours: number;
  checked: boolean;
};

export type WorkRowInput = Partial<WorkRow>;

export type WorkRowGroup = {
  date: string;
  dayOfWeek: string;
  rows: WorkRow[];
  shiftCount: number;
  checkedCount: number;
  totalHours: number;
};

export type DayDefaultSetting = {
  id: string;
  dayOfWeek: string;
  slot: string;
};

export type DayDefaultSettingInput = Partial<DayDefaultSetting>;

export type SlotParts = {
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
};

export type SlotCalculation = {
  isValid: boolean;
  slotValue: string;
  hours: number;
  errorMessage?: string;
};

export type DayDefaultSettingGroup = {
  dayOfWeek: string;
  settings: DayDefaultSetting[];
};

export type ExportSheetDailyRow = {
  stt: number;
  dayOfWeek: string;
  dateDisplay: string;
  shifts: string;
  totalHours: number;
};
