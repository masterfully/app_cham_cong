import { DEFAULT_SLOT_PARTS } from "../constants";
import { DayDefaultSetting, SlotCalculation, SlotParts } from "../types";

function toTwoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

export function sanitizeTimeInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 2);
}

export function parseSlotParts(slot: string): SlotParts {
  const match = slot.match(/^\s*(\d{1,2})\s*:\s*(\d{1,2})\s*-\s*(\d{1,2})\s*:\s*(\d{1,2})\s*$/);
  if (!match) {
    return DEFAULT_SLOT_PARTS;
  }

  const startHour = Number(match[1]);
  const startMinute = Number(match[2]);
  const endHour = Number(match[3]);
  const endMinute = Number(match[4]);

  const isValid =
    Number.isInteger(startHour) &&
    Number.isInteger(startMinute) &&
    Number.isInteger(endHour) &&
    Number.isInteger(endMinute) &&
    startHour >= 0 &&
    startHour <= 23 &&
    startMinute >= 0 &&
    startMinute <= 59 &&
    endHour >= 0 &&
    endHour <= 23 &&
    endMinute >= 0 &&
    endMinute <= 59;

  if (!isValid) {
    return DEFAULT_SLOT_PARTS;
  }

  return {
    startHour: toTwoDigits(startHour),
    startMinute: toTwoDigits(startMinute),
    endHour: toTwoDigits(endHour),
    endMinute: toTwoDigits(endMinute)
  };
}

export function parseSlotRangeInMinutes(slot: string): { start: number; end: number } | null {
  const match = slot.match(/^\s*(\d{1,2})\s*:\s*(\d{1,2})\s*-\s*(\d{1,2})\s*:\s*(\d{1,2})\s*$/);
  if (!match) {
    return null;
  }

  const startHour = Number(match[1]);
  const startMinute = Number(match[2]);
  const endHour = Number(match[3]);
  const endMinute = Number(match[4]);

  const isValid =
    Number.isInteger(startHour) &&
    Number.isInteger(startMinute) &&
    Number.isInteger(endHour) &&
    Number.isInteger(endMinute) &&
    startHour >= 0 &&
    startHour <= 23 &&
    startMinute >= 0 &&
    startMinute <= 59 &&
    endHour >= 0 &&
    endHour <= 23 &&
    endMinute >= 0 &&
    endMinute <= 59;

  if (!isValid) {
    return null;
  }

  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;

  if (end <= start) {
    return null;
  }

  return { start, end };
}

export function areTimeRangesOverlapping(leftSlot: string, rightSlot: string): boolean {
  const leftRange = parseSlotRangeInMinutes(leftSlot);
  const rightRange = parseSlotRangeInMinutes(rightSlot);
  if (!leftRange || !rightRange) {
    return false;
  }

  return leftRange.start < rightRange.end && rightRange.start < leftRange.end;
}

export function sortSettingsBySlot(settings: DayDefaultSetting[]): DayDefaultSetting[] {
  return [...settings].sort((left, right) => {
    const leftStart = parseSlotRangeInMinutes(left.slot)?.start ?? Number.MAX_SAFE_INTEGER;
    const rightStart = parseSlotRangeInMinutes(right.slot)?.start ?? Number.MAX_SAFE_INTEGER;
    return leftStart - rightStart;
  });
}

export function calculateSlotAndHours(startHourText: string, startMinuteText: string, endHourText: string, endMinuteText: string): SlotCalculation {
  if (!startHourText || !startMinuteText || !endHourText || !endMinuteText) {
    return {
      isValid: false,
      slotValue: "",
      hours: 0,
      errorMessage: "Vui lòng nhập đủ giờ bắt đầu và giờ kết thúc."
    };
  }

  const startHour = Number(startHourText);
  const startMinute = Number(startMinuteText);
  const endHour = Number(endHourText);
  const endMinute = Number(endMinuteText);

  const isValidTime =
    Number.isInteger(startHour) &&
    Number.isInteger(startMinute) &&
    Number.isInteger(endHour) &&
    Number.isInteger(endMinute) &&
    startHour >= 0 &&
    startHour <= 23 &&
    startMinute >= 0 &&
    startMinute <= 59 &&
    endHour >= 0 &&
    endHour <= 23 &&
    endMinute >= 0 &&
    endMinute <= 59;

  if (!isValidTime) {
    return {
      isValid: false,
      slotValue: "",
      hours: 0,
      errorMessage: "Giờ làm không hợp lệ. Giờ từ 00-23, phút từ 00-59."
    };
  }

  const startTotalMinute = startHour * 60 + startMinute;
  const endTotalMinute = endHour * 60 + endMinute;
  if (endTotalMinute <= startTotalMinute) {
    return {
      isValid: false,
      slotValue: "",
      hours: 0,
      errorMessage: "Giờ kết thúc phải sau giờ bắt đầu."
    };
  }

  const durationMinutes = endTotalMinute - startTotalMinute;
  const hours = durationMinutes / 60;
  const slotValue = `${toTwoDigits(startHour)}:${toTwoDigits(startMinute)} - ${toTwoDigits(endHour)}:${toTwoDigits(endMinute)}`;

  return {
    isValid: true,
    slotValue,
    hours
  };
}

export function formatHoursAsHourMinute(hours: number): string {
  if (!Number.isFinite(hours) || hours < 0) {
    return "0h00p";
  }

  const totalMinutes = Math.round(hours * 60);
  const hourPart = Math.floor(totalMinutes / 60);
  const minutePart = totalMinutes % 60;
  return `${hourPart}h${String(minutePart).padStart(2, "0")}p`;
}
