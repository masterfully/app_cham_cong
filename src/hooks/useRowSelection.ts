import { useMemo } from "react";
import { WorkRow } from "../types";
import { formatHoursAsHourMinute } from "../utils/time";
import { getDayNameFromDate } from "../utils/date";

interface CheckedRowsSummary {
  totalDays: number;
  totalShifts: number;
  totalHoursLabel: string;
  days: Array<{
    date: string;
    dayOfWeek: string;
    shiftCount: number;
    totalHoursLabel: string;
  }>;
}

export function useRowSelection(visibleRows: WorkRow[]) {
  const selectedRows = useMemo(() => {
    return visibleRows.filter((row) => row.checked);
  }, [visibleRows]);

  const checkedRowsSummary = useMemo<CheckedRowsSummary>(() => {
    const rowMap = new Map<string, WorkRow[]>();

    for (const row of selectedRows) {
      const existingRows = rowMap.get(row.date);
      if (existingRows) {
        existingRows.push(row);
      } else {
        rowMap.set(row.date, [row]);
      }
    }

    const days = Array.from(rowMap.entries())
      .sort((left, right) => right[0].localeCompare(left[0]))
      .map(([date, dayRows]) => ({
        date,
        dayOfWeek: dayRows[0]?.dayOfWeek ?? getDayNameFromDate(date),
        shiftCount: dayRows.length,
        totalHoursLabel: formatHoursAsHourMinute(dayRows.reduce((sum, row) => sum + Number(row.hours), 0))
      }));

    return {
      totalDays: days.length,
      totalShifts: selectedRows.length,
      totalHoursLabel: formatHoursAsHourMinute(selectedRows.reduce((sum, row) => sum + Number(row.hours), 0)),
      days
    };
  }, [selectedRows]);

  const totalSelectedHours = useMemo(() => {
    return selectedRows.reduce((sum, row) => sum + Number(row.hours), 0);
  }, [selectedRows]);

  return {
    selectedRows,
    checkedRowsSummary,
    totalSelectedHours
  };
}
