import { useState, useMemo, useCallback } from "react";
import { WorkRow, FilterType, WorkRowGroup, DayDefaultSetting } from "../types";
import { isInFilter, getDayNameFromDate } from "../utils/date";
import { matchesSearch } from "../utils/storage";

interface UsePageContentState {
  rows: WorkRow[];
  dayDefaultSettings: DayDefaultSetting[];
  activeFilter: FilterType;
  searchQuery: string;
}

export function usePageContent(state: UsePageContentState) {
  const [activeFilter, setActiveFilter] = useState<FilterType>(state.activeFilter);
  const [searchQuery, setSearchQuery] = useState(state.searchQuery);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(() => new Set());

  const visibleRows = useMemo(() => {
    return state.rows.filter((row) => isInFilter(row.date, activeFilter) && matchesSearch(row, searchQuery));
  }, [state.rows, activeFilter, searchQuery]);

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
      .sort((left, right) => right[0].localeCompare(left[0]))
      .map(([date, rowsInDate]) => {
        const totalHours = rowsInDate.reduce((sum, row) => sum + Number(row.hours), 0);
        const checkedCount = rowsInDate.reduce((sum, row) => sum + (row.checked ? 1 : 0), 0);

        return {
          date,
          dayOfWeek: rowsInDate[0]?.dayOfWeek ?? getDayNameFromDate(date),
          rows: rowsInDate,
          shiftCount: rowsInDate.length,
          checkedCount,
          totalHours
        };
      });
  }, [visibleRows]);

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

  return {
    visibleRows,
    groupedVisibleRows,
    selectedRows,
    activeFilter,
    setActiveFilter,
    searchQuery,
    setSearchQuery,
    expandedDates,
    setExpandedDates,
    toggleGroup
  };
}
