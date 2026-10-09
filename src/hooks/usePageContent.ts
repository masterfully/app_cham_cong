import { useState, useMemo, useCallback } from "react";
import { WorkRow, FilterType, WorkRowGroup, DayDefaultSetting } from "../types";
import { getCurrentYearMonth, getDayNameFromDate, isInFilter, isInYearMonth } from "../utils/date";
import { parseSlotRangeInMinutes } from "../utils/time";

interface UsePageContentState {
  rows: WorkRow[];
  dayDefaultSettings: DayDefaultSetting[];
  activeFilter: FilterType;
  selectedMonth?: string | null;
}

export function usePageContent(state: UsePageContentState) {
  const [activeFilter, setActiveFilter] = useState<FilterType>(state.activeFilter);
  // search removed — page content will rely only on filters
  const [expandedDates, setExpandedDates] = useState<Set<string>>(() => new Set());
  const [sortAscending, setSortAscending] = useState(false);

  const visibleRows = useMemo(() => {
    if (activeFilter === "month") {
      const monthValue = state.selectedMonth ?? getCurrentYearMonth();
      return state.rows.filter((row) => isInYearMonth(row.date, monthValue));
    }

    return state.rows.filter((row) => isInFilter(row.date, activeFilter));
  }, [state.rows, activeFilter, state.selectedMonth]);

  const groupedVisibleRows = useMemo<WorkRowGroup[]>(() => {
    const groupMap = new Map<string, WorkRow[]>();

    for (const row of visibleRows) {
      const rowsForDate = groupMap.get(row.date);
      if (rowsForDate) {
        rowsForDate.push(row);
      } else {
        groupMap.set(row.date, [row]);
      }
    }

    return Array.from(groupMap.entries())
      .sort((left, right) => {
        const comparison = left[0].localeCompare(right[0]);
        return sortAscending ? comparison : -comparison;
      })
      .map(([date, rowsInDate]) => {
        const sortedRows = [...rowsInDate].sort((left, right) => {
          const leftStart = parseSlotRangeInMinutes(left.slot)?.start;
          const rightStart = parseSlotRangeInMinutes(right.slot)?.start;
          if (leftStart === undefined || rightStart === undefined) return left.slot.localeCompare(right.slot);
          return leftStart - rightStart;
        });
        const totalHours = sortedRows.reduce((sum, row) => sum + Number(row.hours), 0);
        const checkedCount = sortedRows.reduce((sum, row) => sum + (row.checked ? 1 : 0), 0);

        return {
          date,
          dayOfWeek: sortedRows[0]?.dayOfWeek ?? getDayNameFromDate(date),
          rows: sortedRows,
          shiftCount: sortedRows.length,
          checkedCount,
          totalHours
        };
      });
  }, [visibleRows, sortAscending]);

  const selectedRows = useMemo(() => {
    return visibleRows.filter((row) => row.checked);
  }, [visibleRows]);

  const toggleGroup = useCallback((date: string): void => {
    setExpandedDates((previousExpandedDates) => {
      const nextExpandedDates = new Set(previousExpandedDates);
      if (nextExpandedDates.has(date)) {
        nextExpandedDates.delete(date);
      } else {
        nextExpandedDates.add(date);
      }
      return nextExpandedDates;
    });
  }, []);

  const toggleSort = useCallback((): void => {
    setSortAscending((previous) => !previous);
  }, []);

  return {
    visibleRows,
    groupedVisibleRows,
    selectedRows,
    activeFilter,
    setActiveFilter,
    expandedDates,
    setExpandedDates,
    toggleGroup,
    sortAscending,
    toggleSort
  };
}
