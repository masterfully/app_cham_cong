import { WorkRow } from "../types";
import { calculateSlotAndHours } from "./time";
import { normalizeRow } from "./storage";

export function createRowFromCalculation(params: {
  id: string;
  dayOfWeek: string;
  date: string;
  slotValue: string;
  hours: number;
}): WorkRow {
  return normalizeRow({
    id: params.id,
    dayOfWeek: params.dayOfWeek.trim(),
    date: params.date,
    slot: params.slotValue,
    hours: params.hours,
    checked: false
  });
}

export function createCustomRow(params: {
  id: string;
  dayOfWeek: string;
  date: string;
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
}): { row: WorkRow | null; errorMessage: string | null } {
  const slotCalculation = calculateSlotAndHours(params.startHour, params.startMinute, params.endHour, params.endMinute);
  if (!slotCalculation.isValid) {
    return {
      row: null,
      errorMessage: slotCalculation.errorMessage || "Giờ làm không hợp lệ."
    };
  }

  return {
    row: createRowFromCalculation({
      id: params.id,
      dayOfWeek: params.dayOfWeek,
      date: params.date,
      slotValue: slotCalculation.slotValue,
      hours: slotCalculation.hours
    }),
    errorMessage: null
  };
}
