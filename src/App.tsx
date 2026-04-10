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
import DeleteSettingConfirmModal from "./components/modals/DeleteSettingConfirmModal";
import ExportConfirmModal from "./components/modals/ExportConfirmModal";
import ExportMonthModal from "./components/modals/ExportMonthModal";
import ExportResultModal from "./components/modals/ExportResultModal";

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
  const [toastState, setToastState] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(() => new Set());
  const [expandedSettingDays, setExpandedSettingDays] = useState<Set<string>>(() => new Set());
  const [selectedDefaultSettingIndex, setSelectedDefaultSettingIndex] = useState(-1);
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

  const totalSelectedHours = useMemo(() => {
    return selectedRows.reduce((sum, row) => sum + Number(row.hours), 0);
  }, [selectedRows]);

  const pendingDeleteRow = useMemo(() => {
    if (!pendingDeleteRowId) {
      return null;
    }
    return rows.find((row) => row.id === pendingDeleteRowId) ?? null;
  }, [rows, pendingDeleteRowId]);

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
    () => sortSettingsBySlot(dayDefaultSettings.filter((setting) => setting.dayOfWeek === formDayOfWeek)),
    [dayDefaultSettings, formDayOfWeek]
  );

  const selectedDefaultSettingForFormDay = useMemo(() => {
    if (selectedDefaultSettingIndex < 0 || selectedDefaultSettingIndex >= dayDefaultSettingsForFormDay.length) {
      return null;
    }
    return dayDefaultSettingsForFormDay[selectedDefaultSettingIndex];
  }, [dayDefaultSettingsForFormDay, selectedDefaultSettingIndex]);

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

    if (dayDefaultSettingsForFormDay.length === 0) {
      setSelectedDefaultSettingIndex(-1);
      return;
    }

    setSelectedDefaultSettingIndex((previousIndex) => {
      if (previousIndex >= 0 && previousIndex < dayDefaultSettingsForFormDay.length) {
        return previousIndex;
      }
      return 0;
    });
  }, [isModalOpen, dayDefaultSettingsForFormDay]);

  function applyDefaultSettingToForm(setting: DayDefaultSetting): void {
    const parts = parseSlotParts(setting.slot);
    setFormStartHour(parts.startHour);
    setFormStartMinute(parts.startMinute);
    setFormEndHour(parts.endHour);
    setFormEndMinute(parts.endMinute);
  }

  function applyFirstDefaultForDay(dayOfWeek: string): void {
    const defaultsForDay = sortSettingsBySlot(dayDefaultSettings.filter((setting) => setting.dayOfWeek === dayOfWeek));
    if (defaultsForDay.length === 0) {
      setSelectedDefaultSettingIndex(-1);
      return;
    }

    setSelectedDefaultSettingIndex(0);
    applyDefaultSettingToForm(defaultsForDay[0]);
  }

  function selectDefaultSettingByIndex(index: number): void {
    const selectedSetting = dayDefaultSettingsForFormDay[index];
    if (!selectedSetting) {
      return;
    }

    setSelectedDefaultSettingIndex(index);
    applyDefaultSettingToForm(selectedSetting);
  }

  function openModal(): void {
    const defaultDate = toISODate(new Date());
    const defaultDayOfWeek = getDayNameFromDate(defaultDate);
    setEditingRowId(null);
    setFormDate(defaultDate);
    setFormDayOfWeek(defaultDayOfWeek);
    const defaultSettingsForDay = sortSettingsBySlot(dayDefaultSettings.filter((setting) => setting.dayOfWeek === defaultDayOfWeek));
    const parts = defaultSettingsForDay.length > 0 ? parseSlotParts(defaultSettingsForDay[0].slot) : DEFAULT_SLOT_PARTS;
    setFormStartHour(parts.startHour);
    setFormStartMinute(parts.startMinute);
    setFormEndHour(parts.endHour);
    setFormEndMinute(parts.endMinute);
    setSelectedDefaultSettingIndex(defaultSettingsForDay.length > 0 ? 0 : -1);
    setIsModalOpen(true);
  }

  function closeModal(): void {
    setEditingRowId(null);
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
    const settingsForDay = sortSettingsBySlot(dayDefaultSettings.filter((setting) => setting.dayOfWeek === rowToEdit.dayOfWeek));
    const matchedSettingIndex = settingsForDay.findIndex((setting) => setting.slot === rowToEdit.slot);
    const slotParts = parseSlotParts(rowToEdit.slot);
    setFormStartHour(slotParts.startHour);
    setFormStartMinute(slotParts.startMinute);
    setFormEndHour(slotParts.endHour);
    setFormEndMinute(slotParts.endMinute);
    setSelectedDefaultSettingIndex(matchedSettingIndex >= 0 ? matchedSettingIndex : -1);
    setIsModalOpen(true);
  }

  function handleFormDayOfWeekChange(value: string): void {
    setFormDayOfWeek(value);
    applyFirstDefaultForDay(value);
  }

  function handleDateChange(value: string): void {
    setFormDate(value);
    if (value) {
      const dayName = getDayNameFromDate(value);
      setFormDayOfWeek(dayName);
      applyFirstDefaultForDay(dayName);
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

  function confirmDeleteRow(): void {
    if (!pendingDeleteRowId) {
      return;
    }
    setRows((previousRows) => previousRows.filter((row) => row.id !== pendingDeleteRowId));
    setPendingDeleteRowId(null);
    showToast("Xóa dòng thành công", "success");
  }

  function handleSubmitRow(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const isEditing = Boolean(editingRowId);

    if (!formDayOfWeek || !formDate) {
      showToast("Vui lòng nhập đầy đủ thông tin hợp lệ.", "error");
      return;
    }

    const slotCalculation = calculateSlotAndHours(formStartHour, formStartMinute, formEndHour, formEndMinute);
    if (!slotCalculation.isValid) {
      showToast(slotCalculation.errorMessage || "Giờ làm không hợp lệ.", "error");
      return;
    }

    const newRow = normalizeRow({
      id: editingRowId ?? createId(),
      dayOfWeek: formDayOfWeek.trim(),
      date: formDate,
      slot: slotCalculation.slotValue,
      hours: slotCalculation.hours,
      checked: false
    });

    const isDuplicateRow = rows.some((row) => row.id !== newRow.id && row.date === newRow.date && row.slot === newRow.slot);
    if (isDuplicateRow) {
      showToast("Dòng bị trùng: cùng ngày và cùng giờ làm đã tồn tại.", "error");
      return;
    }

    const newSlotRange = parseSlotRangeInMinutes(newRow.slot);
    if (!newSlotRange) {
      showToast("Giờ làm không hợp lệ.", "error");
      return;
    }

    const hasOverlappingSlot = rows.some((row) => {
      if (row.id === newRow.id || row.date !== newRow.date) {
        return false;
      }

      const existingSlotRange = parseSlotRangeInMinutes(row.slot);
      if (!existingSlotRange) {
        return false;
      }

      return newSlotRange.start < existingSlotRange.end && existingSlotRange.start < newSlotRange.end;
    });

    if (hasOverlappingSlot) {
      showToast("Ca làm bị chồng giờ với ca khác trong cùng ngày.", "error");
      return;
    }

    setRows((previousRows) => {
      if (!editingRowId) {
        return [newRow, ...previousRows];
      }

      return previousRows.map((row) => {
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
      });
    });
    closeModal();
    showToast(isEditing ? "Cập nhật dòng thành công" : "Thêm dòng thành công", "success");
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

          <button
            className="w-full rounded-xl border py-3.5 font-semibold tracking-tight shadow-sm transition-all hover:bg-[#c8e2e9] active:scale-95"
            style={{ backgroundColor: "#d4eaf0", borderColor: "#7eaab3", color: "#0b4f5b" }}
            type="button"
            onClick={openModal}
          >
            <span className="material-symbols-outlined mr-1 align-middle">add</span>
            <span className="align-middle">Thêm dòng mới</span>
          </button>
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
                    <div className="grid grid-cols-[repeat(11,minmax(0,1fr))] items-center gap-2">
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
                      <div className="col-span-4 text-sm font-black text-primary">
                        {group.dayOfWeek} - {formatDate(group.date)}
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

      {isModalOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-on-surface/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="modal-panel w-full max-w-md rounded-t-[2rem] border-t border-white/20 bg-surface p-6 shadow-2xl sm:rounded-3xl">
            <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-surface-variant sm:hidden"></div>
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-primary">{editingRowId ? "Chỉnh sửa dòng" : "Thêm dòng mới"}</h3>
              <button
                className="flex h-6 w-8 items-center justify-center rounded-full border border-[#d5dde0] bg-white/75 text-[#5b6669] transition-colors hover:bg-[#e8f4f7] hover:text-[#0f5d6b]"
                type="button"
                onClick={closeModal}
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form className="space-y-5" onSubmit={handleSubmitRow}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="ml-1 text-[11px] font-bold uppercase text-on-surface-variant" htmlFor="formDayOfWeek">Thứ</label>
                  <select
                    className="w-full rounded-xl border-none bg-surface-container-highest px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary/20"
                    id="formDayOfWeek"
                    required
                    value={formDayOfWeek}
                    onChange={(event) => handleFormDayOfWeekChange(event.target.value)}
                  >
                    {DAY_NAMES.map((dayName) => (
                      <option key={dayName} value={dayName}>
                        {dayName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="ml-1 text-[11px] font-bold uppercase text-on-surface-variant" htmlFor="formDate">
                    Ngày
                  </label>
                  <div className="relative">
                    <input
                      className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                      id="formDate"
                      required
                      type="date"
                      value={formDate}
                      onChange={(event) => handleDateChange(event.target.value)}
                    />
                    <div className="flex w-full items-center justify-between rounded-xl bg-surface-container-highest px-4 py-3 text-on-surface">
                      <span>{formatDateWithYear(formDate)}</span>
                      <span className="material-symbols-outlined text-base text-on-surface-variant">calendar_month</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="ml-1 text-[11px] font-bold uppercase text-on-surface-variant" htmlFor="formStartHour">
                    Giờ làm (HH:MM - HH:MM)
                  </label>
                  {dayDefaultSettingsForFormDay.length > 0 ? (
                    <div className="ml-auto flex items-center gap-1">
                      <button
                        aria-label="Khung giờ mặc định trước"
                        className="inline-flex h-6 w-7 items-center justify-center rounded-md border border-outline-variant/40 bg-white/70 text-on-surface-variant disabled:opacity-40"
                        disabled={selectedDefaultSettingIndex <= 0}
                        type="button"
                        onClick={() => selectDefaultSettingByIndex(selectedDefaultSettingIndex - 1)}
                      >
                        <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                      </button>
                      <span className="min-w-10 text-center text-[11px] font-semibold text-on-surface-variant">
                        {selectedDefaultSettingIndex >= 0 ? `${selectedDefaultSettingIndex + 1}/${dayDefaultSettingsForFormDay.length}` : `0/${dayDefaultSettingsForFormDay.length}`}
                      </span>
                      <button
                        aria-label="Khung giờ mặc định tiếp theo"
                        className="inline-flex h-6 w-7 items-center justify-center rounded-md border border-outline-variant/40 bg-white/70 text-on-surface-variant disabled:opacity-40"
                        disabled={selectedDefaultSettingIndex < 0 || selectedDefaultSettingIndex >= dayDefaultSettingsForFormDay.length - 1}
                        type="button"
                        onClick={() => selectDefaultSettingByIndex(selectedDefaultSettingIndex + 1)}
                      >
                        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                      </button>
                    </div>
                  ) : null}
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-center gap-2 rounded-xl bg-surface-container-highest px-3 py-3">
                  <input
                    className="w-full rounded-lg border-none bg-white/80 px-2 py-2 text-center text-on-surface focus:ring-2 focus:ring-primary/20"
                    id="formStartHour"
                    inputMode="numeric"
                    placeholder="HH"
                    required
                    value={formStartHour}
                    onChange={(event) => setFormStartHour(sanitizeTimeInput(event.target.value))}
                  />
                  <span className="text-sm font-bold text-on-surface-variant">:</span>
                  <input
                    className="w-full rounded-lg border-none bg-white/80 px-2 py-2 text-center text-on-surface focus:ring-2 focus:ring-primary/20"
                    inputMode="numeric"
                    placeholder="MM"
                    required
                    value={formStartMinute}
                    onChange={(event) => setFormStartMinute(sanitizeTimeInput(event.target.value))}
                  />
                  <span className="px-1 text-sm font-black text-on-surface-variant">-</span>
                  <input
                    className="w-full rounded-lg border-none bg-white/80 px-2 py-2 text-center text-on-surface focus:ring-2 focus:ring-primary/20"
                    inputMode="numeric"
                    placeholder="HH"
                    required
                    value={formEndHour}
                    onChange={(event) => setFormEndHour(sanitizeTimeInput(event.target.value))}
                  />
                  <span className="text-sm font-bold text-on-surface-variant">:</span>
                  <input
                    className="w-full rounded-lg border-none bg-white/80 px-2 py-2 text-center text-on-surface focus:ring-2 focus:ring-primary/20"
                    inputMode="numeric"
                    placeholder="MM"
                    required
                    value={formEndMinute}
                    onChange={(event) => setFormEndMinute(sanitizeTimeInput(event.target.value))}
                  />
                </div>
                {selectedDefaultSettingForFormDay ? (
                  <p className="ml-1 text-[11px] text-on-surface-variant">
                    Gợi ý mặc định: {selectedDefaultSettingForFormDay.slot}. Bạn vẫn có thể chỉnh tay.
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label className="ml-1 text-[11px] font-bold uppercase text-on-surface-variant" htmlFor="formHours">
                  Tổng giờ của ca
                </label>
                <input
                  className="w-full rounded-xl border-none bg-surface-container-highest px-4 py-3 text-on-surface-variant"
                  id="formHours"
                  readOnly
                  type="text"
                  value={formSlotCalculation.isValid ? formatHoursAsHourMinute(formSlotCalculation.hours) : "--"}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  className="flex-1 rounded-2xl border border-[#d5dde0] bg-white/85 py-4 font-semibold text-[#3f484b] transition-all hover:bg-[#f1f4f5] active:scale-95"
                  type="button"
                  onClick={closeModal}
                >
                  Hủy
                </button>
                <button
                  className="flex-1 rounded-2xl border border-[#9ec7cf] bg-[#e7f4f7] py-4 font-semibold text-[#0f5d6b] shadow-sm transition-all hover:bg-[#dff0f4] active:scale-95"
                  type="submit"
                >
                  {editingRowId ? "Cập nhật" : "Lưu lại"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <DeleteSettingConfirmModal
        isOpen={Boolean(pendingDeleteSettingId)}
        setting={pendingDeleteSetting}
        onClose={closeDeleteSettingConfirm}
        onConfirm={confirmDeleteDefaultSetting}
      />

      {isSettingsModalOpen ? (
        <div
          className="fixed inset-0 z-[75] flex items-end justify-center bg-on-surface/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeSettingsModal();
            }
          }}
        >
          <div className="w-full max-w-md rounded-t-[2rem] border-t border-white/20 bg-surface p-6 shadow-2xl sm:rounded-3xl">
            <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-surface-variant sm:hidden"></div>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-primary">Giờ mặc định theo thứ</h3>
              <button
                className="flex h-6 w-8 items-center justify-center rounded-full border border-[#d5dde0] bg-white/75 text-[#5b6669] transition-colors hover:bg-[#e8f4f7] hover:text-[#0f5d6b]"
                type="button"
                onClick={closeSettingsModal}
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {!isSettingsFormOpen ? (
              <div className="space-y-4">
                <button
                  className="w-full rounded-xl border border-[#9ec7cf] bg-[#e7f4f7] py-3 text-sm font-semibold text-[#0f5d6b] transition-all hover:bg-[#dff0f4] active:scale-95"
                  type="button"
                  onClick={openAddSettingForm}
                >
                  <span className="material-symbols-outlined mr-1 align-middle text-base">add</span>
                  <span className="align-middle">Thêm cài đặt mới</span>
                </button>

                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {groupedDayDefaultSettings.length === 0 ? (
                    <p className="rounded-xl bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">Chưa có giờ mặc định nào.</p>
                  ) : (
                    groupedDayDefaultSettings.map((group) => {
                      const isCollapsible = group.settings.length > 1;
                      const isExpanded = !isCollapsible || expandedSettingDays.has(group.dayOfWeek);

                      return (
                        <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2" key={group.dayOfWeek}>
                          <button
                            className="flex w-full items-center justify-between py-1 text-left"
                            disabled={!isCollapsible}
                            type="button"
                            onClick={() => toggleSettingDay(group.dayOfWeek)}
                          >
                            <p className="text-sm font-bold text-primary">{group.dayOfWeek}</p>
                            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                              <span>{group.settings.length} khung giờ</span>
                              {isCollapsible ? (
                                <span className={`material-symbols-outlined text-base transition-transform ${isExpanded ? "rotate-180" : "rotate-0"}`}>
                                  expand_more
                                </span>
                              ) : null}
                            </div>
                          </button>

                          {isExpanded ? (
                            <div className="mt-1 space-y-1.5 border-t border-outline-variant/30 pt-2">
                              {group.settings.map((setting) => (
                                <div className="flex items-center justify-between rounded-lg bg-white/70 px-2 py-2" key={setting.id}>
                                  <p className="text-xs text-on-surface-variant">{setting.slot}</p>
                                  <div className="flex gap-1">
                                    <button
                                      className="inline-flex h-7 w-9 items-center justify-center rounded-lg border border-[#d8e7ea] bg-[#eef7f9] text-[#4d6f77] transition-colors hover:bg-[#dff0f4] hover:text-[#0f5d6b]"
                                      type="button"
                                      onClick={() => openEditSettingForm(setting.id)}
                                    >
                                      <span className="material-symbols-outlined text-[18px] leading-none">edit</span>
                                    </button>
                                    <button
                                      aria-label="Xóa giờ mặc định"
                                      className="inline-flex h-7 w-9 items-center justify-center rounded-lg border border-[#f1dede] bg-[#fdf3f3] text-[#b45a5a] transition-colors hover:bg-[#f9e3e3] hover:text-[#a63737]"
                                      type="button"
                                      onClick={() => handleDeleteDefaultSetting(setting.id)}
                                    >
                                      <span className="material-symbols-outlined text-[18px] leading-none">delete</span>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmitDayDefaultSetting}>
                <div className="space-y-1.5">
                  <label className="ml-1 text-[11px] font-bold uppercase text-on-surface-variant" htmlFor="settingFormDayOfWeek">
                    Thứ
                  </label>
                  <select
                    className="w-full rounded-xl border-none bg-surface-container-highest px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary/20"
                    id="settingFormDayOfWeek"
                    required
                    value={settingFormDayOfWeek}
                    onChange={(event) => setSettingFormDayOfWeek(event.target.value)}
                  >
                    {DAY_NAMES.map((dayName) => (
                      <option key={dayName} value={dayName}>
                        {dayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="ml-1 text-[11px] font-bold uppercase text-on-surface-variant" htmlFor="settingFormStartHour">
                    Giờ mặc định (HH:MM - HH:MM)
                  </label>
                  <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-center gap-2 rounded-xl bg-surface-container-highest px-3 py-3">
                    <input
                      className="w-full rounded-lg border-none bg-white/80 px-2 py-2 text-center text-on-surface focus:ring-2 focus:ring-primary/20"
                      id="settingFormStartHour"
                      inputMode="numeric"
                      placeholder="HH"
                      required
                      value={settingFormStartHour}
                      onChange={(event) => setSettingFormStartHour(sanitizeTimeInput(event.target.value))}
                    />
                    <span className="text-sm font-bold text-on-surface-variant">:</span>
                    <input
                      className="w-full rounded-lg border-none bg-white/80 px-2 py-2 text-center text-on-surface focus:ring-2 focus:ring-primary/20"
                      inputMode="numeric"
                      placeholder="MM"
                      required
                      value={settingFormStartMinute}
                      onChange={(event) => setSettingFormStartMinute(sanitizeTimeInput(event.target.value))}
                    />
                    <span className="px-1 text-sm font-black text-on-surface-variant">-</span>
                    <input
                      className="w-full rounded-lg border-none bg-white/80 px-2 py-2 text-center text-on-surface focus:ring-2 focus:ring-primary/20"
                      inputMode="numeric"
                      placeholder="HH"
                      required
                      value={settingFormEndHour}
                      onChange={(event) => setSettingFormEndHour(sanitizeTimeInput(event.target.value))}
                    />
                    <span className="text-sm font-bold text-on-surface-variant">:</span>
                    <input
                      className="w-full rounded-lg border-none bg-white/80 px-2 py-2 text-center text-on-surface focus:ring-2 focus:ring-primary/20"
                      inputMode="numeric"
                      placeholder="MM"
                      required
                      value={settingFormEndMinute}
                      onChange={(event) => setSettingFormEndMinute(sanitizeTimeInput(event.target.value))}
                    />
                  </div>
                  <p className="ml-1 text-[11px] text-on-surface-variant">
                    Tổng giờ: {settingFormSlotCalculation.isValid ? formatHoursAsHourMinute(settingFormSlotCalculation.hours) : "--"}
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    className="flex-1 rounded-2xl border border-[#d5dde0] bg-white/85 py-3 font-semibold text-[#3f484b] transition-all hover:bg-[#f1f4f5] active:scale-95"
                    type="button"
                    onClick={closeSettingsForm}
                  >
                    Hủy
                  </button>
                  <button
                    className="flex-1 rounded-2xl border border-[#9ec7cf] bg-[#e7f4f7] py-3 font-semibold text-[#0f5d6b] shadow-sm transition-all hover:bg-[#dff0f4] active:scale-95"
                    type="submit"
                  >
                    {editingSettingId ? "Cập nhật" : "Lưu lại"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

export default App;
