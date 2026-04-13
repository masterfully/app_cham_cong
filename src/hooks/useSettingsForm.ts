import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { DEFAULT_SLOT_PARTS } from "../constants";

export interface SettingsFormState {
  dayOfWeek: string;
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
  editingSettingId: string | null;
  isFormOpen: boolean;
  expandedSettingDays: Set<string>;
}

export interface UseSettingsFormReturn extends SettingsFormState {
  setDayOfWeek: (value: string) => void;
  setStartHour: (value: string) => void;
  setStartMinute: (value: string) => void;
  setEndHour: (value: string) => void;
  setEndMinute: (value: string) => void;
  setEditingSettingId: (value: string | null) => void;
  setIsFormOpen: (value: boolean) => void;
  setExpandedSettingDays: Dispatch<SetStateAction<Set<string>>>;
  toggleSettingDay: (dayOfWeek: string) => void;
  openAddSettingForm: (defaultDayOfWeek: string) => void;
  openEditSettingForm: (settingDayOfWeek: string, slot: string, settingId: string) => void;
  closeSettingsForm: () => void;
}

export function useSettingsForm(initialDayOfWeek: string = "T2"): UseSettingsFormReturn {
  const [dayOfWeek, setDayOfWeek] = useState(initialDayOfWeek);
  const [startHour, setStartHour] = useState(DEFAULT_SLOT_PARTS.startHour);
  const [startMinute, setStartMinute] = useState(DEFAULT_SLOT_PARTS.startMinute);
  const [endHour, setEndHour] = useState(DEFAULT_SLOT_PARTS.endHour);
  const [endMinute, setEndMinute] = useState(DEFAULT_SLOT_PARTS.endMinute);
  const [editingSettingId, setEditingSettingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [expandedSettingDays, setExpandedSettingDays] = useState<Set<string>>(() => new Set());

  function toggleSettingDay(dayOfWeekToToggle: string): void {
    setExpandedSettingDays((previousDays) => {
      const nextDays = new Set(previousDays);
      if (nextDays.has(dayOfWeekToToggle)) {
        nextDays.delete(dayOfWeekToToggle);
      } else {
        nextDays.add(dayOfWeekToToggle);
      }
      return nextDays;
    });
  }

  function openAddSettingForm(defaultDayOfWeek: string): void {
    setEditingSettingId(null);
    setDayOfWeek(defaultDayOfWeek);
    setStartHour(DEFAULT_SLOT_PARTS.startHour);
    setStartMinute(DEFAULT_SLOT_PARTS.startMinute);
    setEndHour(DEFAULT_SLOT_PARTS.endHour);
    setEndMinute(DEFAULT_SLOT_PARTS.endMinute);
    setIsFormOpen(true);
  }

  function openEditSettingForm(settingDayOfWeek: string, slot: string, settingId: string): void {
    const [startTime, endTime] = slot.split("-");
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    setEditingSettingId(settingId);
    setDayOfWeek(settingDayOfWeek);
    setStartHour(String(startH));
    setStartMinute(String(startM));
    setEndHour(String(endH));
    setEndMinute(String(endM));
    setIsFormOpen(true);
  }

  function closeSettingsForm(): void {
    setIsFormOpen(false);
    setEditingSettingId(null);
  }

  return {
    dayOfWeek,
    startHour,
    startMinute,
    endHour,
    endMinute,
    editingSettingId,
    isFormOpen,
    expandedSettingDays,
    setDayOfWeek,
    setStartHour,
    setStartMinute,
    setEndHour,
    setEndMinute,
    setEditingSettingId,
    setIsFormOpen,
    setExpandedSettingDays,
    toggleSettingDay,
    openAddSettingForm,
    openEditSettingForm,
    closeSettingsForm
  };
}
