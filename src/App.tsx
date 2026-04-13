import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { DAY_NAME_ALIASES, DAY_NAMES, DEFAULT_SLOT_PARTS, FILTERS } from "./constants";
import {
  formatDate,
  formatDateWithYear,
  formatMonthYearLabel,
  getCurrentYearMonth,
  isInFilter,
  parseYearMonth,
  toISODate
} from "./utils/date";
import { buildExportSheetRowsForMonth, createGoogleSheetExport } from "./utils/exportSheet";
import { areDateSetsEqual, createId, getDayNameFromDate, loadDayDefaultSettings, loadRows, matchesSearch, normalizeRow, persistDayDefaultSettings, persistRows } from "./utils/storage";
import { areTimeRangesOverlapping, calculateSlotAndHours, formatHoursAsHourMinute, parseSlotParts, parseSlotRangeInMinutes, sanitizeTimeInput, sortSettingsBySlot } from "./utils/time";
import { DayDefaultSetting, DayDefaultSettingGroup, FilterType, WorkRow, WorkRowGroup } from "./types";
import DeleteRowConfirmModal from "./components/modals/DeleteRowConfirmModal";
import DeleteCheckedRowsConfirmModal from "./components/modals/DeleteCheckedRowsConfirmModal";
import DeleteDayConfirmModal from "./components/modals/DeleteDayConfirmModal";
import DeleteSettingConfirmModal from "./components/modals/DeleteSettingConfirmModal";
import DayDefaultSettingsModal from "./components/modals/DayDefaultSettingsModal";
import ExportConfirmModal from "./components/modals/ExportConfirmModal";
import ExportMonthModal from "./components/modals/ExportMonthModal";
import ExportResultModal from "./components/modals/ExportResultModal";
import WorkRowModal from "./components/modals/WorkRowModal";

function renderSlotDisplay(slot: string): JSX.Element {
  const splitIndex = slot.indexOf("-");
  if (splitIndex < 0) {
    return <span className="block w-fit mx-auto text-left">{slot}</span>;
  }

  const start = slot.slice(0, splitIndex).trim();
  const end = slot.slice(splitIndex + 1).trim();
  if (!start || !end) {
    return <span className="block w-fit mx-auto text-left">{slot}</span>;
  }

  return (
    <div className="mx-auto flex w-fit flex-col items-start leading-tight text-left">
      <span>{`${start} -`}</span>
      <span>{end}</span>
    </div>
  );
}

function getSettingsForDay(dayDefaultSettings: DayDefaultSetting[], dayOfWeek: string): DayDefaultSetting[] {
  return sortSettingsBySlot(dayDefaultSettings.filter((setting) => setting.dayOfWeek === dayOfWeek));
}

function getSelectedDefaultSettings(
  dayDefaultSettingsForFormDay: DayDefaultSetting[],
  selectedDefaultSettingIndices: Set<number>
): DayDefaultSetting[] {
  return dayDefaultSettingsForFormDay.filter((_, index) => selectedDefaultSettingIndices.has(index));
}

function getTotalHoursForSettings(settings: DayDefaultSetting[]): number {
  return settings.reduce((totalHours, setting) => {
    const parts = parseSlotParts(setting.slot);
    const calculation = calculateSlotAndHours(parts.startHour, parts.startMinute, parts.endHour, parts.endMinute);
    return calculation.isValid ? totalHours + calculation.hours : totalHours;
  }, 0);
}

function getRowConflict(rows: WorkRow[], candidateRow: WorkRow, ignoreRowId?: string): "duplicate" | "overlap" | null {
  const candidateSlotRange = parseSlotRangeInMinutes(candidateRow.slot);
  if (!candidateSlotRange) {
    return null;
  }

  for (const row of rows) {
    if (ignoreRowId && row.id === ignoreRowId) {
      continue;
    }

    if (row.date !== candidateRow.date) {
      continue;
    }

    if (row.slot === candidateRow.slot) {
      return "duplicate";
    }

    const existingSlotRange = parseSlotRangeInMinutes(row.slot);
    if (!existingSlotRange) {
      continue;
    }

    if (candidateSlotRange.start < existingSlotRange.end && existingSlotRange.start < candidateSlotRange.end) {
      return "overlap";
    }
  }

  return null;
}

function createRowFromCalculation(params: {
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

function createCustomRow(params: {
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

function App(): JSX.Element {
  const [rows, setRows] = useState<WorkRow[]>(() => loadRows());
  const [dayDefaultSettings, setDayDefaultSettings] = useState<DayDefaultSetting[]>(() => loadDayDefaultSettings());
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSettingsFormOpen, setIsSettingsFormOpen] = useState(false);
  const [editingSettingId, setEditingSettingId] = useState<string | null>(null);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [pendingDeleteRowId, setPendingDeleteRowId] = useState<string | null>(null);
  const [pendingDeleteDayDate, setPendingDeleteDayDate] = useState<string | null>(null);
  const [isDeleteCheckedRowsModalOpen, setIsDeleteCheckedRowsModalOpen] = useState(false);
  const [toastState, setToastState] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(() => new Set());
  const [expandedSettingDays, setExpandedSettingDays] = useState<Set<string>>(() => new Set());
  const [selectedDefaultSettingIndices, setSelectedDefaultSettingIndices] = useState<Set<number>>(() => new Set());
  const [formMode, setFormMode] = useState<"default" | "custom">("default");
  const [pendingDeleteSettingId, setPendingDeleteSettingId] = useState<string | null>(null);
  const [isExportMonthModalOpen, setIsExportMonthModalOpen] = useState(false);
  const [isExportConfirmModalOpen, setIsExportConfirmModalOpen] = useState(false);
  const [isExportResultModalOpen, setIsExportResultModalOpen] = useState(false);
  const [exportMonthValue, setExportMonthValue] = useState(getCurrentYearMonth());
  const [pendingExportMonthValue, setPendingExportMonthValue] = useState<string | null>(null);
  const [exportPublicUrl, setExportPublicUrl] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const hasInitializedExpandedDates = useRef(false);

  const [formDayOfWeek, setFormDayOfWeek] = useState("T2");
  const [formDate, setFormDate] = useState(toISODate(new Date()));
  const [formStartHour, setFormStartHour] = useState(DEFAULT_SLOT_PARTS.startHour);
  const [formStartMinute, setFormStartMinute] = useState(DEFAULT_SLOT_PARTS.startMinute);
  const [formEndHour, setFormEndHour] = useState(DEFAULT_SLOT_PARTS.endHour);
  const [formEndMinute, setFormEndMinute] = useState(DEFAULT_SLOT_PARTS.endMinute);

  const [settingFormDayOfWeek, setSettingFormDayOfWeek] = useState("T2");
  const [settingFormStartHour, setSettingFormStartHour] = useState(DEFAULT_SLOT_PARTS.startHour);
  const [settingFormStartMinute, setSettingFormStartMinute] = useState(DEFAULT_SLOT_PARTS.startMinute);
  const [settingFormEndHour, setSettingFormEndHour] = useState(DEFAULT_SLOT_PARTS.endHour);
  const [settingFormEndMinute, setSettingFormEndMinute] = useState(DEFAULT_SLOT_PARTS.endMinute);

  useEffect(() => {
    persistRows(rows);
  }, [rows]);

  useEffect(() => {
    persistDayDefaultSettings(dayDefaultSettings);
  }, [dayDefaultSettings]);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setIsModalOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isModalOpen]);

  useEffect(() => {
    if (!toastState) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setToastState(null);
    }, 3200);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [toastState]);

  const visibleRows = useMemo(() => {
    return rows.filter((row) => isInFilter(row.date, activeFilter) && matchesSearch(row, searchQuery));
  }, [rows, activeFilter, searchQuery]);

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

  useEffect(() => {
    const todayDate = toISODate(new Date());

    setExpandedDates((previousExpandedDates) => {
      const visibleDateSet = new Set(groupedVisibleRows.map((group) => group.date));
      const nextExpandedDates = new Set<string>();

      if (!hasInitializedExpandedDates.current && visibleDateSet.has(todayDate)) {
        nextExpandedDates.add(todayDate);
        hasInitializedExpandedDates.current = true;
      }

      previousExpandedDates.forEach((date) => {
        if (visibleDateSet.has(date)) {
          nextExpandedDates.add(date);
        }
      });

      return areDateSetsEqual(previousExpandedDates, nextExpandedDates) ? previousExpandedDates : nextExpandedDates;
    });
  }, [groupedVisibleRows]);

  const selectedRows = useMemo(() => {
    return visibleRows.filter((row) => row.checked);
  }, [visibleRows]);

  const checkedRowsSummary = useMemo(() => {
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

  const pendingDeleteRow = useMemo(() => {
    if (!pendingDeleteRowId) {
      return null;
    }
    return rows.find((row) => row.id === pendingDeleteRowId) ?? null;
  }, [rows, pendingDeleteRowId]);

  const pendingDeleteDaySummary = useMemo(() => {
    if (!pendingDeleteDayDate) {
      return null;
    }

    const dayRows = rows.filter((row) => row.date === pendingDeleteDayDate);
    if (dayRows.length === 0) {
      return null;
    }

    return {
      date: pendingDeleteDayDate,
      dayOfWeek: dayRows[0]?.dayOfWeek ?? getDayNameFromDate(pendingDeleteDayDate),
      shiftCount: dayRows.length,
      totalHoursLabel: formatHoursAsHourMinute(dayRows.reduce((sum, row) => sum + Number(row.hours), 0))
    };
  }, [pendingDeleteDayDate, rows]);

  const pendingDeleteSetting = useMemo(() => {
    if (!pendingDeleteSettingId) {
      return null;
    }
    return dayDefaultSettings.find((setting) => setting.id === pendingDeleteSettingId) ?? null;
  }, [dayDefaultSettings, pendingDeleteSettingId]);

  const pendingExportSummary = useMemo(() => {
    if (!pendingExportMonthValue) {
      return null;
    }

    const parsed = parseYearMonth(pendingExportMonthValue);
    if (!parsed) {
      return null;
    }

    const monthPrefix = `${parsed.year}-${String(parsed.month).padStart(2, "0")}-`;
  const monthRows = rows.filter((row) => row.checked && row.date.startsWith(monthPrefix));
  const dailyRows = buildExportSheetRowsForMonth(rows, parsed.year, parsed.month);
    const totalHours = monthRows.reduce((sum, row) => sum + Number(row.hours), 0);

    return {
      year: parsed.year,
      month: parsed.month,
      totalShifts: monthRows.length,
      totalDays: dailyRows.length,
      totalHours,
      dailyRows
    };
  }, [pendingExportMonthValue, rows]);

  const formSlotCalculation = useMemo(
    () => calculateSlotAndHours(formStartHour, formStartMinute, formEndHour, formEndMinute),
    [formStartHour, formStartMinute, formEndHour, formEndMinute]
  );

  const settingFormSlotCalculation = useMemo(
    () => calculateSlotAndHours(settingFormStartHour, settingFormStartMinute, settingFormEndHour, settingFormEndMinute),
    [settingFormStartHour, settingFormStartMinute, settingFormEndHour, settingFormEndMinute]
  );

  const dayDefaultSettingsForFormDay = useMemo(
    () => getSettingsForDay(dayDefaultSettings, formDayOfWeek),
    [dayDefaultSettings, formDayOfWeek]
  );

  const selectedDefaultSettingsForFormDay = useMemo(
    () => getSelectedDefaultSettings(dayDefaultSettingsForFormDay, selectedDefaultSettingIndices),
    [dayDefaultSettingsForFormDay, selectedDefaultSettingIndices]
  );

  const selectedDefaultHours = useMemo(() => {
    return getTotalHoursForSettings(selectedDefaultSettingsForFormDay);
  }, [selectedDefaultSettingsForFormDay]);

  const formHoursLabel = useMemo(() => {
    if (!editingRowId && formMode === "default") {
      return selectedDefaultSettingsForFormDay.length > 0 ? formatHoursAsHourMinute(selectedDefaultHours) : "--";
    }

    return formSlotCalculation.isValid ? formatHoursAsHourMinute(formSlotCalculation.hours) : "--";
  }, [editingRowId, formMode, formSlotCalculation.hours, formSlotCalculation.isValid, selectedDefaultHours, selectedDefaultSettingsForFormDay.length]);

  const groupedDayDefaultSettings = useMemo<DayDefaultSettingGroup[]>(() => {
    const dayIndex = new Map(DAY_NAMES.map((dayName, index) => [dayName, index]));

    return DAY_NAMES.map((dayName) => {
      const settings = sortSettingsBySlot(dayDefaultSettings.filter((setting) => setting.dayOfWeek === dayName));
      return {
        dayOfWeek: dayName,
        settings
      };
    })
      .filter((group) => group.settings.length > 0)
      .sort((left, right) => {
        const leftIndex = dayIndex.get(left.dayOfWeek) ?? 999;
        const rightIndex = dayIndex.get(right.dayOfWeek) ?? 999;
        return leftIndex - rightIndex;
      });
  }, [dayDefaultSettings]);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    // When modal opens, clear selections so the user can pick shifts explicitly.
    setSelectedDefaultSettingIndices(new Set());
  }, [isModalOpen]);

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

  function toggleAllDefaultSettings(): void {
    if (selectedDefaultSettingIndices.size === dayDefaultSettingsForFormDay.length) {
      setSelectedDefaultSettingIndices(new Set());
    } else {
      const allIndices = new Set<number>();
      for (let i = 0; i < dayDefaultSettingsForFormDay.length; i++) {
        allIndices.add(i);
      }
      setSelectedDefaultSettingIndices(allIndices);
    }
  }

  function openModal(): void {
    const defaultDate = toISODate(new Date());
    const defaultDayOfWeek = getDayNameFromDate(defaultDate);
    setEditingRowId(null);
    setFormDate(defaultDate);
    setFormDayOfWeek(defaultDayOfWeek);
    const defaultSettingsForDay = getSettingsForDay(dayDefaultSettings, defaultDayOfWeek);
    const parts = defaultSettingsForDay.length > 0 ? parseSlotParts(defaultSettingsForDay[0].slot) : DEFAULT_SLOT_PARTS;
    setFormStartHour(parts.startHour);
    setFormStartMinute(parts.startMinute);
    setFormEndHour(parts.endHour);
    setFormEndMinute(parts.endMinute);
    setSelectedDefaultSettingIndices(new Set());
    setFormMode(defaultSettingsForDay.length > 0 ? "default" : "custom");
    setIsModalOpen(true);
  }

  function closeModal(): void {
    setEditingRowId(null);
    setFormMode("default");
    setIsModalOpen(false);
  }

  function handleEditRow(rowId: string): void {
    const rowToEdit = rows.find((row) => row.id === rowId);
    if (!rowToEdit) {
      return;
    }

    setEditingRowId(rowId);
    setFormDayOfWeek(rowToEdit.dayOfWeek);
    setFormDate(rowToEdit.date);
    const settingsForDay = getSettingsForDay(dayDefaultSettings, rowToEdit.dayOfWeek);
    const matchedSettingIndex = settingsForDay.findIndex((setting) => setting.slot === rowToEdit.slot);
    const slotParts = parseSlotParts(rowToEdit.slot);
    setFormStartHour(slotParts.startHour);
    setFormStartMinute(slotParts.startMinute);
    setFormEndHour(slotParts.endHour);
    setFormEndMinute(slotParts.endMinute);
    // For editing, pre-select the matching setting
    setSelectedDefaultSettingIndices(matchedSettingIndex >= 0 ? new Set([matchedSettingIndex]) : new Set());
    setFormMode("custom");
    setIsModalOpen(true);
  }

  function handleDateChange(value: string): void {
    setFormDate(value);
    if (value) {
      const dayName = getDayNameFromDate(value);
      setFormDayOfWeek(dayName);
      setSelectedDefaultSettingIndices(new Set());
      const defaultsForDay = getSettingsForDay(dayDefaultSettings, dayName);
      setFormMode(defaultsForDay.length > 0 && !editingRowId ? "default" : "custom");
    }
  }

  function handleToggleRow(rowId: string, checked: boolean): void {
    setRows((previousRows) =>
      previousRows.map((row) => {
        if (row.id !== rowId) {
          return row;
        }
        return { ...row, checked };
      })
    );
  }

  function handleCheckAllInGroup(date: string, checked: boolean): void {
    setRows((previousRows) =>
      previousRows.map((row) => {
        if (row.date !== date) {
          return row;
        }
        return { ...row, checked };
      })
    );
  }

  function openDeleteConfirm(rowId: string): void {
    setPendingDeleteRowId(rowId);
  }

  function openDeleteDayConfirm(date: string): void {
    setPendingDeleteDayDate(date);
  }

  function openDeleteCheckedRowsConfirm(): void {
    if (selectedRows.length === 0) {
      showToast("Chưa có dòng nào được chọn.", "error");
      return;
    }

    setIsDeleteCheckedRowsModalOpen(true);
  }

  function openSettingsModal(): void {
    setIsSettingsModalOpen(true);
    setIsSettingsFormOpen(false);
    setEditingSettingId(null);
    setExpandedSettingDays(new Set());
  }

  function openExportMonthModal(): void {
    setExportMonthValue(getCurrentYearMonth());
    setIsExportMonthModalOpen(true);
  }

  function closeExportMonthModal(): void {
    setIsExportMonthModalOpen(false);
  }

  function proceedExportConfirmation(): void {
    if (!exportMonthValue) {
      showToast("Vui lòng chọn tháng muốn xuất.", "error");
      return;
    }

    const parsed = parseYearMonth(exportMonthValue);
    if (!parsed) {
      showToast("Tháng xuất không hợp lệ.", "error");
      return;
    }

    setPendingExportMonthValue(exportMonthValue);
    setIsExportMonthModalOpen(false);
    setIsExportConfirmModalOpen(true);
  }

  function cancelExportConfirmation(): void {
    setIsExportConfirmModalOpen(false);
    setPendingExportMonthValue(null);
    setIsExportMonthModalOpen(true);
  }

  async function confirmExportToGoogleSheet(): Promise<void> {
    if (!pendingExportSummary) {
      showToast("Không tìm thấy dữ liệu để xuất.", "error");
      return;
    }

    if (pendingExportSummary.dailyRows.length === 0) {
      showToast(`Không có dòng đã chọn cho ${formatMonthYearLabel(pendingExportMonthValue ?? "")}.`, "error");
      return;
    }

    setIsExporting(true);

    try {
      const fileName = `co_hong_thang_${pendingExportSummary.month}_${pendingExportSummary.year}`;
      const publicUrl = await createGoogleSheetExport({
        year: pendingExportSummary.year,
        month: pendingExportSummary.month,
        fileName,
        rows: pendingExportSummary.dailyRows
      });

      setExportPublicUrl(publicUrl);
      setIsExportConfirmModalOpen(false);
      setIsExportResultModalOpen(true);
      setPendingExportMonthValue(null);
      showToast("Xuất Google Sheet thành công.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể xuất Google Sheet.";
      showToast(message, "error");
    } finally {
      setIsExporting(false);
    }
  }

  function closeExportResultModal(): void {
    setIsExportResultModalOpen(false);
    setExportPublicUrl("");
  }

  async function handleCopyExportUrl(): Promise<void> {
    if (!exportPublicUrl) {
      showToast("Chưa có URL để sao chép.", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(exportPublicUrl);
      showToast("Đã sao chép URL thành công.", "success");
    } catch {
      showToast("Không thể sao chép URL.", "error");
    }
  }

  function closeSettingsModal(): void {
    setIsSettingsModalOpen(false);
    setIsSettingsFormOpen(false);
    setEditingSettingId(null);
  }

  function openAddSettingForm(): void {
    setEditingSettingId(null);
    setSettingFormDayOfWeek(formDayOfWeek);
    setSettingFormStartHour(DEFAULT_SLOT_PARTS.startHour);
    setSettingFormStartMinute(DEFAULT_SLOT_PARTS.startMinute);
    setSettingFormEndHour(DEFAULT_SLOT_PARTS.endHour);
    setSettingFormEndMinute(DEFAULT_SLOT_PARTS.endMinute);
    setIsSettingsFormOpen(true);
  }

  function openEditSettingForm(settingId: string): void {
    const setting = dayDefaultSettings.find((item) => item.id === settingId);
    if (!setting) {
      return;
    }

    const parts = parseSlotParts(setting.slot);
    setEditingSettingId(setting.id);
    setSettingFormDayOfWeek(setting.dayOfWeek);
    setSettingFormStartHour(parts.startHour);
    setSettingFormStartMinute(parts.startMinute);
    setSettingFormEndHour(parts.endHour);
    setSettingFormEndMinute(parts.endMinute);
    setIsSettingsFormOpen(true);
  }

  function closeSettingsForm(): void {
    setIsSettingsFormOpen(false);
    setEditingSettingId(null);
  }

  function handleDeleteDefaultSetting(settingId: string): void {
    setPendingDeleteSettingId(settingId);
  }

  function confirmDeleteDefaultSetting(): void {
    if (!pendingDeleteSettingId) {
      return;
    }

    setDayDefaultSettings((previousSettings) => previousSettings.filter((setting) => setting.id !== pendingDeleteSettingId));
    setPendingDeleteSettingId(null);
    showToast("Xóa giờ mặc định thành công", "success");
  }

  function closeDeleteSettingConfirm(): void {
    setPendingDeleteSettingId(null);
  }

  function showToast(message: string, tone: "success" | "error" = "success"): void {
    setToastState({ message, tone });
  }

  function toggleGroup(date: string): void {
    setExpandedDates((previousExpandedDates) => {
      const nextExpandedDates = new Set(previousExpandedDates);
      if (nextExpandedDates.has(date)) {
        nextExpandedDates.delete(date);
      } else {
        nextExpandedDates.add(date);
      }
      return nextExpandedDates;
    });
  }

  function toggleSettingDay(dayOfWeek: string): void {
    setExpandedSettingDays((previousDays) => {
      const nextDays = new Set(previousDays);
      if (nextDays.has(dayOfWeek)) {
        nextDays.delete(dayOfWeek);
      } else {
        nextDays.add(dayOfWeek);
      }
      return nextDays;
    });
  }

  function handleSubmitDayDefaultSetting(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const slotCalculation = calculateSlotAndHours(settingFormStartHour, settingFormStartMinute, settingFormEndHour, settingFormEndMinute);
    if (!slotCalculation.isValid) {
      showToast(slotCalculation.errorMessage || "Giờ mặc định không hợp lệ.", "error");
      return;
    }

    const normalizedDay = DAY_NAME_ALIASES[settingFormDayOfWeek] ?? settingFormDayOfWeek;

    const newSlot = slotCalculation.slotValue;
    const hasConflictSetting = dayDefaultSettings.some((setting) => {
      if (setting.id === editingSettingId || setting.dayOfWeek !== normalizedDay) {
        return false;
      }
      return areTimeRangesOverlapping(setting.slot, newSlot);
    });

    if (hasConflictSetting) {
      showToast("Ca mặc định bị trùng hoặc chồng giờ trong cùng thứ.", "error");
      return;
    }

    setDayDefaultSettings((previousSettings) => {
      if (editingSettingId) {
        return previousSettings.map((setting) => {
          if (setting.id !== editingSettingId) {
            return setting;
          }

          return {
            ...setting,
            dayOfWeek: normalizedDay,
            slot: newSlot
          };
        });
      }

      return [
        ...previousSettings,
        {
          id: createId(),
          dayOfWeek: normalizedDay,
          slot: newSlot
        }
      ];
    });

    closeSettingsForm();
    showToast(editingSettingId ? "Cập nhật giờ mặc định thành công" : "Thêm giờ mặc định thành công", "success");
  }

  function closeDeleteConfirm(): void {
    setPendingDeleteRowId(null);
  }

  function closeDeleteDayConfirm(): void {
    setPendingDeleteDayDate(null);
  }

  function confirmDeleteRow(): void {
    if (!pendingDeleteRowId) {
      return;
    }
    setRows((previousRows) => previousRows.filter((row) => row.id !== pendingDeleteRowId));
    setPendingDeleteRowId(null);
    showToast("Xóa dòng thành công", "success");
  }

  function confirmDeleteDay(): void {
    if (!pendingDeleteDayDate) {
      return;
    }

    setRows((previousRows) => previousRows.filter((row) => row.date !== pendingDeleteDayDate));
    setPendingDeleteDayDate(null);
    showToast("Xóa ngày chấm công thành công", "success");
  }

  function closeDeleteCheckedRowsModal(): void {
    setIsDeleteCheckedRowsModalOpen(false);
  }

  function confirmDeleteCheckedRows(): void {
    if (selectedRows.length === 0) {
      setIsDeleteCheckedRowsModalOpen(false);
      return;
    }

    const selectedRowIds = new Set(selectedRows.map((row) => row.id));
    setRows((previousRows) => previousRows.filter((row) => !selectedRowIds.has(row.id)));
    setIsDeleteCheckedRowsModalOpen(false);
    showToast(`Xóa ${selectedRows.length} dòng đã chọn thành công`, "success");
  }

  function handleSubmitRow(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const isEditing = Boolean(editingRowId);

    if (!formDayOfWeek || !formDate) {
      showToast("Vui lòng nhập đầy đủ thông tin hợp lệ.", "error");
      return;
    }

    if (!isEditing && formMode === "default" && dayDefaultSettingsForFormDay.length === 0) {
      setFormMode("custom");
      showToast("Ngày này chưa có ca mặc định. Vui lòng nhập giờ tùy chỉnh.", "error");
      return;
    }

    if (!isEditing && formMode === "default" && selectedDefaultSettingIndices.size === 0) {
      showToast("Vui lòng chọn ít nhất một ca mặc định.", "error");
      return;
    }

    if (!isEditing && formMode === "custom") {
      const customRowResult = createCustomRow({
        id: createId(),
        dayOfWeek: formDayOfWeek,
        date: formDate,
        startHour: formStartHour,
        startMinute: formStartMinute,
        endHour: formEndHour,
        endMinute: formEndMinute
      });

      if (!customRowResult.row) {
        showToast(customRowResult.errorMessage || "Vui lòng nhập giờ làm hợp lệ.", "error");
        return;
      }
    }

    if (isEditing) {
      const customRowResult = createCustomRow({
        id: editingRowId ?? createId(),
        dayOfWeek: formDayOfWeek,
        date: formDate,
        startHour: formStartHour,
        startMinute: formStartMinute,
        endHour: formEndHour,
        endMinute: formEndMinute
      });

      if (!customRowResult.row) {
        showToast(customRowResult.errorMessage || "Giờ làm không hợp lệ.", "error");
        return;
      }

      const newRow = customRowResult.row;

      const conflictType = getRowConflict(rows, newRow, newRow.id);
      if (conflictType === "duplicate") {
        showToast("Dòng bị trùng: cùng ngày và cùng giờ làm đã tồn tại.", "error");
        return;
      }

      if (conflictType === "overlap") {
        showToast("Ca làm bị chồng giờ với ca khác trong cùng ngày.", "error");
        return;
      }

      setRows((previousRows) =>
        previousRows.map((row) => {
          if (row.id !== editingRowId) {
            return row;
          }

          return {
            ...row,
            dayOfWeek: newRow.dayOfWeek,
            date: newRow.date,
            slot: newRow.slot,
            hours: newRow.hours
          };
        })
      );
      closeModal();
      showToast("Cập nhật dòng thành công", "success");
      return;
    }

    if (formMode === "default" && selectedDefaultSettingIndices.size > 0) {
      const newRows: WorkRow[] = [];
      const selectedSettings = selectedDefaultSettingsForFormDay;

      for (const setting of selectedSettings) {
        const parts = parseSlotParts(setting.slot);
        const customRowResult = createCustomRow({
          id: createId(),
          dayOfWeek: formDayOfWeek,
          date: formDate,
          startHour: parts.startHour,
          startMinute: parts.startMinute,
          endHour: parts.endHour,
          endMinute: parts.endMinute
        });

        if (!customRowResult.row) {
          showToast(`Giờ mặc định ${setting.slot} không hợp lệ.`, "error");
          return;
        }

        const newRow = customRowResult.row;

        const conflictType = getRowConflict([...rows, ...newRows], newRow);
        if (conflictType === "duplicate") {
          showToast(`Dòng bị trùng: cùng ngày ${formatDateWithYear(formDate)} và giờ làm ${newRow.slot} đã tồn tại.`, "error");
          return;
        }

        if (conflictType === "overlap") {
          showToast("Ca làm bị chồng giờ với ca khác trong cùng ngày.", "error");
          return;
        }

        newRows.push(newRow);
      }

      setRows((previousRows) => [...newRows, ...previousRows]);
      closeModal();
      showToast(`Thêm ${newRows.length} dòng thành công`, "success");
      return;
    }

    const customRowResult = createCustomRow({
      id: createId(),
      dayOfWeek: formDayOfWeek,
      date: formDate,
      startHour: formStartHour,
      startMinute: formStartMinute,
      endHour: formEndHour,
      endMinute: formEndMinute
    });

    if (!customRowResult.row) {
      showToast(customRowResult.errorMessage || "Giờ làm không hợp lệ.", "error");
      return;
    }

    const newRow = customRowResult.row;

    const conflictType = getRowConflict(rows, newRow);
    if (conflictType === "duplicate") {
      showToast("Dòng bị trùng: cùng ngày và cùng giờ làm đã tồn tại.", "error");
      return;
    }

    if (conflictType === "overlap") {
      showToast("Ca làm bị chồng giờ với ca khác trong cùng ngày.", "error");
      return;
    }

    setRows((previousRows) => [newRow, ...previousRows]);
    closeModal();
    showToast("Thêm dòng thành công", "success");
  }

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between bg-[#f7fafb]/80 px-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">schedule</span>
          <h1 className="text-lg font-extrabold text-primary">Quản lý giờ làm</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label="Xuất Google Sheet"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/40 bg-white/70 text-on-surface-variant transition-colors hover:bg-surface-container"
            type="button"
            onClick={openExportMonthModal}
          >
            <span className="material-symbols-outlined">ios_share</span>
          </button>
          <button
            aria-label="Mở cài đặt giờ mặc định"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/40 bg-white/70 text-on-surface-variant transition-colors hover:bg-surface-container"
            type="button"
            onClick={openSettingsModal}
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </header>

      {toastState ? (
        <div className="fixed right-4 top-[4.5rem] z-[100] max-w-[calc(100vw-2rem)]">
          <div
            className={`toast-panel rounded-xl px-4 py-2 text-center text-sm font-semibold shadow-lg ${
              toastState.tone === "error"
                ? "border border-[#d28b8b] bg-[#6f2d2d] text-[#fff1f1]"
                : "border border-[#2a5560] bg-[#133e48] text-[#eaf6f8]"
            }`}
          >
            {toastState.message}
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-lg px-4 pb-44 pt-20">
        <section className="mb-6 space-y-4">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              <span className="material-symbols-outlined text-sm text-outline">search</span>
            </div>
            <input
              autoComplete="off"
              className="w-full rounded-xl border-none bg-surface-container-highest py-3 pl-10 pr-4 text-on-surface focus:ring-2 focus:ring-primary/20"
              placeholder="Tìm kiếm theo thứ, ngày, giờ làm..."
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value.trim())}
            />
          </div>

          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((filter) => {
              const isActive = activeFilter === filter.key;
              return (
                <button
                  key={filter.key}
                  className={`flex-none rounded-full px-4 py-2 text-sm transition-all active:scale-95 ${
                    isActive
                      ? "border border-[#9ec7cf] bg-[#e7f4f7] font-semibold text-[#0f5d6b] shadow-sm"
                      : "border border-[#d5dde0] bg-[#f7fbfc] font-medium text-[#5b6669] hover:bg-[#eef4f6]"
                  }`}
                  type="button"
                  onClick={() => setActiveFilter(filter.key)}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
            <button
              className="flex-1 rounded-xl border py-3.5 font-semibold tracking-tight shadow-sm transition-all hover:bg-[#c8e2e9] active:scale-95"
              style={{ backgroundColor: "#d4eaf0", borderColor: "#7eaab3", color: "#0b4f5b" }}
              type="button"
              onClick={openModal}
            >
              <span className="material-symbols-outlined mr-1 align-middle">add</span>
              <span className="align-middle">Thêm dòng mới</span>
            </button>
            <button
              className="inline-flex h-14 w-14 items-center justify-center rounded-lg border border-[#efc6c6] bg-[#fce8e8] px-3 text-[#a63737] shadow-sm transition-all hover:bg-[#f9dede] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={selectedRows.length === 0}
              onClick={openDeleteCheckedRowsConfirm}
              aria-label="Xóa đã chọn"
            >
              <span className="material-symbols-outlined">delete</span>
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <div className="mb-2 flex items-center justify-between px-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-outline">Bảng chấm công</h2>
            <span className="rounded-full bg-tertiary-fixed px-2 py-0.5 text-[10px] font-bold text-on-tertiary-fixed">
              {visibleRows.length} dòng
            </span>
          </div>

          <div className="space-y-3">
            {groupedVisibleRows.map((group) => {
              const isExpanded = expandedDates.has(group.date);

              return (
                <div className="overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-low shadow-soft" key={group.date}>
                  <div
                    className="cursor-pointer px-4 py-3 transition-colors hover:bg-surface-container"
                    onClick={() => toggleGroup(group.date)}
                  >
                    <div className="grid grid-cols-[repeat(12,minmax(0,1fr))] items-center gap-2">
                      <div className="col-span-1 flex justify-center">
                        <input
                          checked={group.checkedCount === group.shiftCount && group.shiftCount > 0}
                          className="rounded border-outline-variant text-primary focus:ring-primary"
                          type="checkbox"
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => {
                            event.stopPropagation();
                            handleCheckAllInGroup(group.date, event.target.checked);
                          }}
                        />
                      </div>
                      <div className="col-span-4 min-w-0 text-sm font-black text-primary">
                        <span className="min-w-0 truncate">
                          {group.dayOfWeek} - {formatDate(group.date)}
                        </span>
                      </div>
                      <div className="col-span-3 flex justify-center">
                        <span className="rounded-full bg-tertiary-fixed px-2 py-0.5 text-[10px] font-bold text-on-tertiary-fixed">{group.shiftCount} ca</span>
                      </div>
                      <div className="col-span-2 text-right text-sm font-bold text-on-surface">{formatHoursAsHourMinute(group.totalHours)}</div>
                      <div className="col-span-1 flex justify-center">
                        <button
                          aria-expanded={isExpanded}
                          className="inline-flex h-6 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleGroup(group.date);
                          }}
                        >
                          <span className={`material-symbols-outlined transition-transform ${isExpanded ? "rotate-180" : "rotate-0"}`}>
                            expand_more
                          </span>
                        </button>
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <button
                          aria-label="Xóa ngày"
                          className="inline-flex h-6 w-8 items-center justify-center rounded-lg border border-[#f1dede] bg-[#fdf3f3] text-[#b45a5a] transition-colors hover:bg-[#f9e3e3] hover:text-[#a63737]"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openDeleteDayConfirm(group.date);
                          }}
                        >
                          <span className="material-symbols-outlined text-[18px] leading-none">delete</span>
                        </button>
                      </div>
                    </div>
                    <div className="mt-1 pl-9 text-[11px] font-medium text-on-surface-variant">{group.checkedCount}/{group.shiftCount} dòng đã chọn</div>
                  </div>

                  {isExpanded ? (
                    <div className="border-t border-outline-variant/15">
                      <div className="grid grid-cols-[repeat(11,minmax(0,1fr))] gap-2 bg-surface-container px-4 py-3 text-[10px] font-black uppercase tracking-tighter text-on-surface-variant">
                        <div className="col-span-1 text-center"></div>
                        <div className="col-span-1 text-center">Thứ</div>
                        <div className="col-span-2 text-center">Ngày</div>
                        <div className="col-span-2 text-center">Giờ làm</div>
                        <div className="col-span-3 text-center">Tổng giờ</div>
                        <div className="col-span-1 text-center">Sửa</div>
                        <div className="col-span-1 text-center">Xóa</div>
                      </div>

                      <div className="divide-y divide-outline-variant/15">
                        {group.rows.map((row, index) => {
                          const zebraClass = index % 2 === 0 ? "bg-surface-container-lowest" : "bg-surface-container-low";
                          return (
                            <div className={`grid grid-cols-[repeat(11,minmax(0,1fr))] items-center gap-2 px-4 py-4 text-center ${zebraClass}`} key={row.id}>
                              <div className="col-span-1 flex justify-center">
                                <input
                                  checked={row.checked}
                                  className="rounded border-outline-variant text-primary focus:ring-primary"
                                  type="checkbox"
                                  onChange={(event) => handleToggleRow(row.id, event.target.checked)}
                                />
                              </div>
                              <div className="col-span-1 text-center text-sm font-bold text-primary">{row.dayOfWeek}</div>
                              <div className="col-span-2 text-center text-xs text-on-surface-variant">{formatDate(row.date)}</div>
                              <div className="col-span-2 text-xs font-medium">{renderSlotDisplay(row.slot)}</div>
                              <div className="col-span-3 text-center text-sm font-bold">{formatHoursAsHourMinute(row.hours)}</div>
                              <div className="col-span-1 flex justify-center">
                                <button
                                  aria-label="Sửa dòng"
                                  className="inline-flex h-6 w-8 items-center justify-center rounded-lg border border-[#d8e7ea] bg-[#eef7f9] text-[#4d6f77] transition-colors hover:bg-[#dff0f4] hover:text-[#0f5d6b]"
                                  type="button"
                                  onClick={() => handleEditRow(row.id)}
                                >
                                  <span className="material-symbols-outlined text-[18px] leading-none">edit</span>
                                </button>
                              </div>
                              <div className="col-span-1 flex justify-center">
                                <button
                                  aria-label="Xóa dòng"
                                  className="inline-flex h-6 w-8 items-center justify-center rounded-lg border border-[#f1dede] bg-[#fdf3f3] text-[#b45a5a] transition-colors hover:bg-[#f9e3e3] hover:text-[#a63737]"
                                  type="button"
                                  onClick={() => openDeleteConfirm(row.id)}
                                >
                                  <span className="material-symbols-outlined text-[18px] leading-none">delete</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {visibleRows.length === 0 ? (
            <p className="rounded-xl bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
              Không có dòng nào phù hợp với bộ lọc hiện tại.
            </p>
          ) : null}

        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <div className="mx-auto max-w-lg rounded-2xl border border-primary/20 bg-gradient-to-r from-primary to-primary-container p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-on-primary/70">Tổng giờ làm đã chọn</p>
              <p className="text-2xl font-black text-on-primary">
                {formatHoursAsHourMinute(totalSelectedHours)}
                <span className="text-sm font-normal opacity-80"> giờ</span>
              </p>
              <p className="mt-1 text-xs text-on-primary/80">{selectedRows.length} dòng được chọn</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
              <span className="material-symbols-outlined text-on-primary">query_stats</span>
            </div>
          </div>
        </div>
      </div>

      <DeleteRowConfirmModal isOpen={Boolean(pendingDeleteRowId)} row={pendingDeleteRow} onClose={closeDeleteConfirm} onConfirm={confirmDeleteRow} />

      <DeleteDayConfirmModal
        isOpen={Boolean(pendingDeleteDayDate)}
        summary={pendingDeleteDaySummary}
        onClose={closeDeleteDayConfirm}
        onConfirm={confirmDeleteDay}
      />

      <DeleteCheckedRowsConfirmModal
        isOpen={isDeleteCheckedRowsModalOpen}
        summary={checkedRowsSummary}
        onClose={closeDeleteCheckedRowsModal}
        onConfirm={confirmDeleteCheckedRows}
      />

      <ExportMonthModal
        isOpen={isExportMonthModalOpen}
        monthValue={exportMonthValue}
        onMonthChange={setExportMonthValue}
        onCancel={closeExportMonthModal}
        onContinue={proceedExportConfirmation}
      />

      <ExportConfirmModal
        isOpen={isExportConfirmModalOpen}
        isExporting={isExporting}
        monthLabel={formatMonthYearLabel(pendingExportMonthValue ?? "")}
        summary={
          pendingExportSummary
            ? {
                totalDays: pendingExportSummary.totalDays,
                totalShifts: pendingExportSummary.totalShifts,
                totalHoursLabel: formatHoursAsHourMinute(pendingExportSummary.totalHours)
              }
            : null
        }
        onCancel={cancelExportConfirmation}
        onConfirm={confirmExportToGoogleSheet}
      />

      <ExportResultModal isOpen={isExportResultModalOpen} publicUrl={exportPublicUrl} onClose={closeExportResultModal} onCopy={handleCopyExportUrl} />

      <WorkRowModal
        isOpen={isModalOpen}
        editingRowId={editingRowId}
        formMode={formMode}
        formDate={formDate}
        formStartHour={formStartHour}
        formStartMinute={formStartMinute}
        formEndHour={formEndHour}
        formEndMinute={formEndMinute}
        formHoursLabel={formHoursLabel}
        dayDefaultSettingsForFormDay={dayDefaultSettingsForFormDay}
        selectedDefaultSettingIndices={selectedDefaultSettingIndices}
        onClose={closeModal}
        onSubmit={handleSubmitRow}
        onModeChange={setFormMode}
        onDateChange={handleDateChange}
        onStartHourChange={(value) => setFormStartHour(sanitizeTimeInput(value))}
        onStartMinuteChange={(value) => setFormStartMinute(sanitizeTimeInput(value))}
        onEndHourChange={(value) => setFormEndHour(sanitizeTimeInput(value))}
        onEndMinuteChange={(value) => setFormEndMinute(sanitizeTimeInput(value))}
        onToggleDefaultSettingIndex={toggleDefaultSettingIndex}
        onToggleAllDefaultSettings={toggleAllDefaultSettings}
      />

      <DeleteSettingConfirmModal
        isOpen={Boolean(pendingDeleteSettingId)}
        setting={pendingDeleteSetting}
        onClose={closeDeleteSettingConfirm}
        onConfirm={confirmDeleteDefaultSetting}
      />

      <DayDefaultSettingsModal
        isOpen={isSettingsModalOpen}
        isFormOpen={isSettingsFormOpen}
        groupedDayDefaultSettings={groupedDayDefaultSettings}
        expandedSettingDays={expandedSettingDays}
        editingSettingId={editingSettingId}
        settingFormDayOfWeek={settingFormDayOfWeek}
        settingFormStartHour={settingFormStartHour}
        settingFormStartMinute={settingFormStartMinute}
        settingFormEndHour={settingFormEndHour}
        settingFormEndMinute={settingFormEndMinute}
        settingFormSlotLabel={settingFormSlotCalculation.isValid ? formatHoursAsHourMinute(settingFormSlotCalculation.hours) : "--"}
        onClose={closeSettingsModal}
        onOpenAddSettingForm={openAddSettingForm}
        onOpenEditSettingForm={openEditSettingForm}
        onToggleSettingDay={toggleSettingDay}
        onDeleteDefaultSetting={handleDeleteDefaultSetting}
        onSettingFormDayOfWeekChange={setSettingFormDayOfWeek}
        onSettingFormStartHourChange={(value) => setSettingFormStartHour(sanitizeTimeInput(value))}
        onSettingFormStartMinuteChange={(value) => setSettingFormStartMinute(sanitizeTimeInput(value))}
        onSettingFormEndHourChange={(value) => setSettingFormEndHour(sanitizeTimeInput(value))}
        onSettingFormEndMinuteChange={(value) => setSettingFormEndMinute(sanitizeTimeInput(value))}
        onCloseForm={closeSettingsForm}
        onSubmitForm={handleSubmitDayDefaultSetting}
      />
    </>
  );
}

export default App;
