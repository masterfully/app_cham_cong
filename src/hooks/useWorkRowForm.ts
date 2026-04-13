import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { DEFAULT_SLOT_PARTS } from "../constants";
import { getDayNameFromDate } from "../utils/storage";
import { toISODate } from "../utils/date";

export interface WorkRowFormState {
  dayOfWeek: string;
  date: string;
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
  mode: "default" | "custom";
  editingRowId: string | null;
  selectedDefaultSettingIndices: Set<number>;
}

export interface UseWorkRowFormReturn extends WorkRowFormState {
  setDayOfWeek: (value: string) => void;
  setDate: (value: string) => void;
  setStartHour: (value: string) => void;
  setStartMinute: (value: string) => void;
  setEndHour: (value: string) => void;
  setEndMinute: (value: string) => void;
  setMode: (value: "default" | "custom") => void;
  setEditingRowId: (value: string | null) => void;
  setSelectedDefaultSettingIndices: Dispatch<SetStateAction<Set<number>>>;
  toggleDefaultSettingIndex: (index: number) => void;
  toggleAllDefaultSettings: (totalCount: number) => void;
  resetForm: () => void;
  setFormFromRow: (rowId: string, dayOfWeek: string, date: string, slot: string, matchedSettingIndex?: number) => void;
}

export function useWorkRowForm(): UseWorkRowFormReturn {
  const defaultDate = toISODate(new Date());
  const defaultDayOfWeek = getDayNameFromDate(defaultDate);

  const [dayOfWeek, setDayOfWeek] = useState(defaultDayOfWeek);
  const [date, setDate] = useState(defaultDate);
  const [startHour, setStartHour] = useState(DEFAULT_SLOT_PARTS.startHour);
  const [startMinute, setStartMinute] = useState(DEFAULT_SLOT_PARTS.startMinute);
  const [endHour, setEndHour] = useState(DEFAULT_SLOT_PARTS.endHour);
  const [endMinute, setEndMinute] = useState(DEFAULT_SLOT_PARTS.endMinute);
  const [mode, setMode] = useState<"default" | "custom">("default");
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [selectedDefaultSettingIndices, setSelectedDefaultSettingIndices] = useState<Set<number>>(() => new Set());

  function toggleDefaultSettingIndex(index: number): void {
    setSelectedDefaultSettingIndices((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }

  function toggleAllDefaultSettings(totalCount: number): void {
    if (selectedDefaultSettingIndices.size === totalCount) {
      setSelectedDefaultSettingIndices(new Set());
    } else {
      const allIndices = new Set<number>();
      for (let i = 0; i < totalCount; i++) {
        allIndices.add(i);
      }
      setSelectedDefaultSettingIndices(allIndices);
    }
  }

  function resetForm(): void {
    setEditingRowId(null);
    setDayOfWeek(defaultDayOfWeek);
    setDate(defaultDate);
    setStartHour(DEFAULT_SLOT_PARTS.startHour);
    setStartMinute(DEFAULT_SLOT_PARTS.startMinute);
    setEndHour(DEFAULT_SLOT_PARTS.endHour);
    setEndMinute(DEFAULT_SLOT_PARTS.endMinute);
    setMode("default");
    setSelectedDefaultSettingIndices(new Set());
  }

  function setFormFromRow(rowId: string, rowDayOfWeek: string, rowDate: string, slot: string, matchedSettingIndex?: number): void {
    setEditingRowId(rowId);
    setDayOfWeek(rowDayOfWeek);
    setDate(rowDate);
    setMode("custom");
    
    // Parse slot "HH:MM-HH:MM"
    const [startTime, endTime] = slot.split("-");
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    
    setStartHour(String(startH));
    setStartMinute(String(startM));
    setEndHour(String(endH));
    setEndMinute(String(endM));
    
    setSelectedDefaultSettingIndices(matchedSettingIndex !== undefined && matchedSettingIndex >= 0 ? new Set([matchedSettingIndex]) : new Set());
  }

  return {
    dayOfWeek,
    date,
    startHour,
    startMinute,
    endHour,
    endMinute,
    mode,
    editingRowId,
    selectedDefaultSettingIndices,
    setDayOfWeek,
    setDate,
    setStartHour,
    setStartMinute,
    setEndHour,
    setEndMinute,
    setMode,
    setEditingRowId,
    setSelectedDefaultSettingIndices,
    toggleDefaultSettingIndex,
    toggleAllDefaultSettings,
    resetForm,
    setFormFromRow
  };
}
