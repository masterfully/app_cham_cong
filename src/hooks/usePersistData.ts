import { useEffect } from "react";
import { persistRows, persistDayDefaultSettings } from "../utils/storage";
import { persistGoldRows, persistGoldDayDefaultSettings } from "../utils/goldStorage";
import type { DayDefaultSetting, WorkRow } from "../types";

export function usePersistData(options: {
  rows: WorkRow[];
  dayDefaultSettings: DayDefaultSetting[];
  goldRows: WorkRow[];
  goldDayDefaultSettings: DayDefaultSetting[];
}): void {
  const { rows, dayDefaultSettings, goldRows, goldDayDefaultSettings } = options;

  useEffect(() => {
    persistRows(rows);
  }, [rows]);

  useEffect(() => {
    persistDayDefaultSettings(dayDefaultSettings);
  }, [dayDefaultSettings]);

  useEffect(() => {
    persistGoldRows(goldRows);
  }, [goldRows]);

  useEffect(() => {
    persistGoldDayDefaultSettings(goldDayDefaultSettings);
  }, [goldDayDefaultSettings]);
}

export default usePersistData;
