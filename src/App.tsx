import { FormEvent, useEffect, useMemo, useState } from "react";
import { DAY_NAME_ALIASES, DAY_NAMES, DEFAULT_SLOT_PARTS } from "./constants";
import {
  formatDateWithYear,
  formatMonthYearLabel,
  getCurrentYearMonth,
  parseYearMonth,
  toISODate
} from "./utils/date";
import { buildExportSheetRowsForMonth, createGoogleSheetExport } from "./utils/exportSheet";
import { createId, getDayNameFromDate } from "./utils/storage";
import { areTimeRangesOverlapping, calculateSlotAndHours, formatHoursAsHourMinute, parseSlotParts, sanitizeTimeInput, sortSettingsBySlot } from "./utils/time";
import { getSettingsForDay, getSelectedDefaultSettings, getTotalHoursForSettings, getRowConflict } from "./utils/appHelpers";
import { createCustomRow } from "./utils/rowFactory";
import { DayDefaultSetting, DayDefaultSettingGroup, WorkRow } from "./types";
import DeleteRowConfirmModal from "./components/modals/DeleteRowConfirmModal";
import DeleteCheckedRowsConfirmModal from "./components/modals/DeleteCheckedRowsConfirmModal";
import DeleteDayConfirmModal from "./components/modals/DeleteDayConfirmModal";
import DeleteSettingConfirmModal from "./components/modals/DeleteSettingConfirmModal";
import GenerateMonthConfirmModal from "./components/modals/GenerateMonthConfirmModal";
import RevertGenerateConfirmModal from "./components/modals/RevertGenerateConfirmModal";
import DayDefaultSettingsModal from "./components/modals/DayDefaultSettingsModal";
import ExportConfirmModal from "./components/modals/ExportConfirmModal";
import ExportMonthModal from "./components/modals/ExportMonthModal";
import ExportResultModal from "./components/modals/ExportResultModal";
import WorkRowModal from "./components/modals/WorkRowModal";
import PageHeader from "./components/ui/PageHeader";
import BottomSummaryBar from "./components/ui/BottomSummaryBar";
import ToastPanel from "./components/ui/ToastPanel";
import PageContentSection from "./components/PageContentSection";
import { usePageContent } from "./hooks/usePageContent";
import { useRowSelection } from "./hooks/useRowSelection";
import { useToast } from "./hooks/useToast";
import { useExportWorkflow } from "./hooks/useExportWorkflow";
import { useWorkRowForm } from "./hooks/useWorkRowForm";
import { useSettingsForm } from "./hooks/useSettingsForm";
import useMonthAutoSeed, { generateMonthRows } from "./hooks/useMonthAutoSeed";
import useModalEscape from "./hooks/useModalEscape";
import useCloudPersistence from "./hooks/useCloudPersistence";
import LoginScreen from "./components/LoginScreen";
import { auth } from "./firebase";
import { onAuthStateChanged, User } from "firebase/auth";

function AuthenticatedApp({ user }: { user: User }): JSX.Element {
  const [currentPage, setCurrentPage] = useState<"main" | "gold">("main");
  
  // Main page state
  const [rows, setRows] = useState<WorkRow[]>([]);
  const [dayDefaultSettings, setDayDefaultSettings] = useState<DayDefaultSetting[]>([]);
  const [mainSelectedMonth, setMainSelectedMonth] = useState<string | null>(getCurrentYearMonth());
  const mainPageContent = usePageContent({
    rows,
    dayDefaultSettings,
    activeFilter: "month",
    selectedMonth: mainSelectedMonth,
  });
  
  // Gold page state
  const [goldRows, setGoldRows] = useState<WorkRow[]>([]);
  const [goldDayDefaultSettings, setGoldDayDefaultSettings] = useState<DayDefaultSetting[]>([]);
  const [goldSelectedMonth, setGoldSelectedMonth] = useState<string | null>(getCurrentYearMonth());
  
  const goldPageContent = usePageContent({
    rows: goldRows,
    dayDefaultSettings: goldDayDefaultSettings,
    activeFilter: "month",
    selectedMonth: goldSelectedMonth,
  });

  const { toastState, showToast } = useToast();
  const {
    exportMonthValue,
    pendingExportMonthValue,
    exportPublicUrl,
    isExporting,
    setExportMonthValue,
    setPendingExportMonthValue,
    setExportPublicUrl,
    setIsExporting
  } = useExportWorkflow();

  const {
    dayOfWeek: formDayOfWeek,
    date: formDate,
    startHour: formStartHour,
    startMinute: formStartMinute,
    endHour: formEndHour,
    endMinute: formEndMinute,
    mode: formMode,
    editingRowId,
    selectedDefaultSettingIndices,
    setDayOfWeek: setFormDayOfWeek,
    setDate: setFormDate,
    setStartHour: setFormStartHour,
    setStartMinute: setFormStartMinute,
    setEndHour: setFormEndHour,
    setEndMinute: setFormEndMinute,
    setMode: setFormMode,
    setSelectedDefaultSettingIndices,
    toggleDefaultSettingIndex,
    toggleAllDefaultSettings,
    resetForm: resetWorkRowForm,
    setFormFromRow
  } = useWorkRowForm();

  const {
    dayOfWeek: settingFormDayOfWeek,
    startHour: settingFormStartHour,
    startMinute: settingFormStartMinute,
    endHour: settingFormEndHour,
    endMinute: settingFormEndMinute,
    editingSettingId,
    isFormOpen: isSettingsFormOpen,
    expandedSettingDays,
    setDayOfWeek: setSettingFormDayOfWeek,
    setStartHour: setSettingFormStartHour,
    setStartMinute: setSettingFormStartMinute,
    setEndHour: setSettingFormEndHour,
    setEndMinute: setSettingFormEndMinute,
    setExpandedSettingDays,
    toggleSettingDay,
    openAddSettingForm: openSettingsFormForAdd,
    openEditSettingForm: openSettingsFormForEdit,
    closeSettingsForm: closeSettingsFormHook
  } = useSettingsForm("T2");
  
  // Page-aware state accessors
  const currentRows = currentPage === "main" ? rows : goldRows;
  const setCurrentRows = currentPage === "main" ? setRows : setGoldRows;
  const currentDayDefaultSettings = currentPage === "main" ? dayDefaultSettings : goldDayDefaultSettings;
  const setCurrentDayDefaultSettings = currentPage === "main" ? setDayDefaultSettings : setGoldDayDefaultSettings;
  
  const currentPageContent = currentPage === "main" ? mainPageContent : goldPageContent;
  const mainSelection = useRowSelection(mainPageContent.visibleRows);
  const goldSelection = useRowSelection(goldPageContent.visibleRows);
  const currentSelection = currentPage === "main" ? mainSelection : goldSelection;
  const { isCloudLoaded, error: cloudError } = useCloudPersistence({
    user,
    rows,
    dayDefaultSettings,
    goldRows,
    goldDayDefaultSettings,
    setRows,
    setDayDefaultSettings,
    setGoldRows,
    setGoldDayDefaultSettings
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isGenerateMonthConfirmOpen, setIsGenerateMonthConfirmOpen] = useState(false);
  const [isRevertConfirmOpen, setIsRevertConfirmOpen] = useState(false);
  const [lastGeneratedRowIds, setLastGeneratedRowIds] = useState<string[]>([]);
  const [pendingDeleteRowId, setPendingDeleteRowId] = useState<string | null>(null);
  const [pendingDeleteDayDate, setPendingDeleteDayDate] = useState<string | null>(null);
  const [isDeleteCheckedRowsModalOpen, setIsDeleteCheckedRowsModalOpen] = useState(false);
  const [pendingDeleteSettingId, setPendingDeleteSettingId] = useState<string | null>(null);
  const [isExportMonthModalOpen, setIsExportMonthModalOpen] = useState(false);
  const [isExportConfirmModalOpen, setIsExportConfirmModalOpen] = useState(false);
  const [isExportResultModalOpen, setIsExportResultModalOpen] = useState(false);

  // Cloud Firestore is the only persistence layer.
  useMonthAutoSeed({ rows, setRows, dayDefaultSettings, showToast });
  useModalEscape(isModalOpen, () => setIsModalOpen(false));

  const visibleRows = useMemo(() => {
    return currentPageContent.visibleRows;
  }, [currentPageContent.visibleRows]);

  const groupedVisibleRows = useMemo(() => {
    return currentPageContent.groupedVisibleRows;
  }, [currentPageContent.groupedVisibleRows]);

  const selectedRows = useMemo(() => {
    return currentSelection.selectedRows;
  }, [currentSelection.selectedRows]);

  const checkedRowsSummary = useMemo(() => {
    return currentSelection.checkedRowsSummary;
  }, [currentSelection.checkedRowsSummary]);

  const totalSelectedHours = useMemo(() => {
    return currentSelection.totalSelectedHours;
  }, [currentSelection.totalSelectedHours]);

  useEffect(() => {
    localStorage.removeItem("app-cham-cong-rows-v1");
    localStorage.removeItem("app-cham-cong-day-defaults-v1");
    localStorage.removeItem("goldRows");
    localStorage.removeItem("goldDayDefaultSettings");
  }, []);

  const pendingDeleteRow = useMemo(() => {
    if (!pendingDeleteRowId) {
      return null;
    }
    return currentRows.find((row) => row.id === pendingDeleteRowId) ?? null;
  }, [currentRows, pendingDeleteRowId]);

  const pendingDeleteDaySummary = useMemo(() => {
    if (!pendingDeleteDayDate) {
      return null;
    }

    const dayRows = currentRows.filter((row) => row.date === pendingDeleteDayDate);
    if (dayRows.length === 0) {
      return null;
    }

    return {
      date: pendingDeleteDayDate,
      dayOfWeek: dayRows[0]?.dayOfWeek ?? getDayNameFromDate(pendingDeleteDayDate),
      shiftCount: dayRows.length,
      totalHoursLabel: formatHoursAsHourMinute(dayRows.reduce((sum, row) => sum + Number(row.hours), 0))
    };
  }, [pendingDeleteDayDate, currentRows]);

  const pendingDeleteSetting = useMemo(() => {
    if (!pendingDeleteSettingId) {
      return null;
    }
    return currentDayDefaultSettings.find((setting) => setting.id === pendingDeleteSettingId) ?? null;
  }, [currentDayDefaultSettings, pendingDeleteSettingId]);

  const pendingExportSummary = useMemo(() => {
    if (!pendingExportMonthValue) {
      return null;
    }

    const parsed = parseYearMonth(pendingExportMonthValue);
    if (!parsed) {
      return null;
    }

    const monthPrefix = `${parsed.year}-${String(parsed.month).padStart(2, "0")}-`;
    const mainMonthRows = rows.filter((row) => row.checked && row.date.startsWith(monthPrefix));
    const goldMonthRows = goldRows.filter((row) => row.checked && row.date.startsWith(monthPrefix));
    const mainDailyRows = buildExportSheetRowsForMonth(rows, parsed.year, parsed.month);
    const goldDailyRows = buildExportSheetRowsForMonth(goldRows, parsed.year, parsed.month);
    const mainTotalHours = mainMonthRows.reduce((sum, row) => sum + Number(row.hours), 0);
    const goldTotalHours = goldMonthRows.reduce((sum, row) => sum + Number(row.hours), 0);

    return {
      year: parsed.year,
      month: parsed.month,
      main: {
        totalShifts: mainMonthRows.length,
        totalDays: mainDailyRows.length,
        totalHours: mainTotalHours,
        dailyRows: mainDailyRows
      },
      gold: {
        totalShifts: goldMonthRows.length,
        totalDays: goldDailyRows.length,
        totalHours: goldTotalHours,
        dailyRows: goldDailyRows
      }
    };
  }, [pendingExportMonthValue, rows, goldRows]);

  const currentMonthValue = currentPage === "main" ? mainSelectedMonth : goldSelectedMonth;
  const setCurrentMonthValue = currentPage === "main" ? setMainSelectedMonth : setGoldSelectedMonth;
  const currentPageRows = currentPage === "main" ? rows : goldRows;

  const availableMonthOptions = useMemo(() => {
    const monthValues = new Set<string>();

    for (const row of currentPageRows) {
      const monthValue = row.date.slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(monthValue)) {
        monthValues.add(monthValue);
      }
    }

    return Array.from(monthValues).sort((left, right) => right.localeCompare(left));
  }, [currentPageRows]);

  const monthButtonLabel = currentMonthValue ? formatMonthYearLabel(currentMonthValue) : "Chọn tháng";

  const formSlotCalculation = useMemo(
    () => calculateSlotAndHours(formStartHour, formStartMinute, formEndHour, formEndMinute),
    [formStartHour, formStartMinute, formEndHour, formEndMinute]
  );

  const settingFormSlotCalculation = useMemo(
    () => calculateSlotAndHours(settingFormStartHour, settingFormStartMinute, settingFormEndHour, settingFormEndMinute),
    [settingFormStartHour, settingFormStartMinute, settingFormEndHour, settingFormEndMinute]
  );

  const dayDefaultSettingsForFormDay = useMemo(
    () => getSettingsForDay(currentDayDefaultSettings, formDayOfWeek),
    [currentDayDefaultSettings, formDayOfWeek]
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
      const settings = sortSettingsBySlot(currentDayDefaultSettings.filter((setting) => setting.dayOfWeek === dayName));
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
  }, [currentDayDefaultSettings]);

  function toggleGroup(date: string): void {
    currentPageContent.toggleGroup(date);
  }

  function openModal(): void {
    const defaultDate = toISODate(new Date());
    const defaultDayOfWeek = getDayNameFromDate(defaultDate);
    resetWorkRowForm();
    const defaultSettingsForDay = getSettingsForDay(currentDayDefaultSettings, defaultDayOfWeek);
    const parts = defaultSettingsForDay.length > 0 ? parseSlotParts(defaultSettingsForDay[0].slot) : DEFAULT_SLOT_PARTS;
    setFormStartHour(parts.startHour);
    setFormStartMinute(parts.startMinute);
    setFormEndHour(parts.endHour);
    setFormEndMinute(parts.endMinute);
    setFormMode(defaultSettingsForDay.length > 0 ? "default" : "custom");
    setIsModalOpen(true);
  }

  function handleSelectMonth(monthValue: string): void {
    setCurrentMonthValue(monthValue);
    currentPageContent.setActiveFilter("month");
  }

  function handleFilterChange(filter: any): void {
    if (filter === "month") {
      setCurrentMonthValue(null);
    }

    currentPageContent.setActiveFilter(filter);
  }

  function closeModal(): void {
    resetWorkRowForm();
    setIsModalOpen(false);
  }

  function handleEditRow(rowId: string): void {
    const rowToEdit = currentRows.find((row) => row.id === rowId);
    if (!rowToEdit) {
      return;
    }

    const settingsForDay = getSettingsForDay(currentDayDefaultSettings, rowToEdit.dayOfWeek);
    const matchedSettingIndex = settingsForDay.findIndex((setting) => setting.slot === rowToEdit.slot);
    setFormFromRow(rowId, rowToEdit.dayOfWeek, rowToEdit.date, rowToEdit.slot, matchedSettingIndex);
    setIsModalOpen(true);
  }

  function handleDateChange(value: string): void {
    if (value) {
      const dayName = getDayNameFromDate(value);
      setFormDate(value);
      setFormDayOfWeek(dayName);
      setSelectedDefaultSettingIndices(new Set());
      const defaultsForDay = getSettingsForDay(currentDayDefaultSettings, dayName);
      setFormMode(defaultsForDay.length > 0 && !editingRowId ? "default" : "custom");
    }
  }

  function handleToggleRow(rowId: string, checked: boolean): void {
    setCurrentRows((previousRows) =>
      previousRows.map((row) => {
        if (row.id !== rowId) {
          return row;
        }
        return { ...row, checked };
      })
    );
  }

  function handleCheckAllInGroup(date: string, checked: boolean): void {
    setCurrentRows((previousRows) =>
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
    setExpandedSettingDays(new Set());
    closeSettingsFormHook();
  }

  function handleGenerateCurrentMonth(): void {
    const today = new Date();
    const year = today.getFullYear();
    const monthIndex = today.getMonth();
    const monthPrefix = `${year}-${String(monthIndex + 1).padStart(2, "0")}-`;

    if (currentRows.some((row) => row.date.startsWith(monthPrefix))) {
      showToast("Tháng hiện tại đã có dòng. Không tạo thêm.", "error");
      return;
    }

    setIsGenerateMonthConfirmOpen(true);
  }

  function confirmGenerateCurrentMonth(): void {
    setIsGenerateMonthConfirmOpen(false);
    closeSettingsFormHook();

    const today = new Date();
    const year = today.getFullYear();
    const monthIndex = today.getMonth();

    const generated = generateMonthRows(currentDayDefaultSettings, year, monthIndex);
    if (generated.length === 0) {
      showToast("Không có dòng nào để tạo.", "error");
      return;
    }

    setCurrentRows((previousRows) => [...generated, ...previousRows]);
    setLastGeneratedRowIds(generated.map((row) => row.id));
    showToast(`Đã tạo ${generated.length} dòng cho tháng hiện tại.`, "success");
  }

  function revertGeneratedRows(): void {
    if (lastGeneratedRowIds.length === 0) {
      return;
    }

    setIsRevertConfirmOpen(true);
  }

  function confirmRevertGeneratedRows(): void {
    setIsRevertConfirmOpen(false);

    const generatedSet = new Set(lastGeneratedRowIds);
    const stillPresent = currentRows.filter((row) => generatedSet.has(row.id) && row.checked).map((row) => row.id);

    setCurrentRows((previousRows) => previousRows.filter((row) => !generatedSet.has(row.id) || row.checked));
    setLastGeneratedRowIds(stillPresent);
    showToast("Đã hoàn tác các dòng được tạo chưa chọn.", "success");
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

    if (pendingExportSummary.main.dailyRows.length === 0 && pendingExportSummary.gold.dailyRows.length === 0) {
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
        mainRows: pendingExportSummary.main.dailyRows,
        goldRows: pendingExportSummary.gold.dailyRows
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
    closeSettingsFormHook();
  }

  function handleDeleteDefaultSetting(settingId: string): void {
    setPendingDeleteSettingId(settingId);
  }

  function confirmDeleteDefaultSetting(): void {
    if (!pendingDeleteSettingId) {
      return;
    }

    setCurrentDayDefaultSettings((previousSettings) => previousSettings.filter((setting) => setting.id !== pendingDeleteSettingId));
    setPendingDeleteSettingId(null);
    showToast("Xóa giờ mặc định thành công", "success");
  }

  function closeDeleteSettingConfirm(): void {
    setPendingDeleteSettingId(null);
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
    const hasConflictSetting = currentDayDefaultSettings.some((setting) => {
      if (setting.id === editingSettingId || setting.dayOfWeek !== normalizedDay) {
        return false;
      }
      return areTimeRangesOverlapping(setting.slot, newSlot);
    });

    if (hasConflictSetting) {
      showToast("Ca mặc định bị trùng hoặc chồng giờ trong cùng thứ.", "error");
      return;
    }

    setCurrentDayDefaultSettings((previousSettings) => {
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

    closeSettingsFormHook();
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
    setCurrentRows((previousRows) => previousRows.filter((row) => row.id !== pendingDeleteRowId));
    setPendingDeleteRowId(null);
    showToast("Xóa dòng thành công", "success");
  }

  function confirmDeleteDay(): void {
    if (!pendingDeleteDayDate) {
      return;
    }

    setCurrentRows((previousRows) => previousRows.filter((row) => row.date !== pendingDeleteDayDate));
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
    setCurrentRows((previousRows) => previousRows.filter((row) => !selectedRowIds.has(row.id)));
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

    // Combine rows from both pages for cross-page duplicate validation
    const allRowsAcrossPages = currentPage === "main" ? [...rows, ...goldRows] : [...goldRows, ...rows];

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

      const conflictType = getRowConflict(allRowsAcrossPages, newRow, newRow.id);
      if (conflictType === "duplicate") {
        showToast("Dòng bị trùng: cùng ngày và cùng giờ làm đã tồn tại trên trang khác.", "error");
        return;
      }

      if (conflictType === "overlap") {
        showToast("Ca làm bị chồng giờ với ca khác trong cùng ngày trên trang khác.", "error");
        return;
      }

      setCurrentRows((previousRows) =>
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

        const conflictType = getRowConflict([...allRowsAcrossPages, ...newRows], newRow);
        if (conflictType === "duplicate") {
          showToast(`Dòng bị trùng: cùng ngày ${formatDateWithYear(formDate)} và giờ làm ${newRow.slot} đã tồn tại trên trang khác.`, "error");
          return;
        }

        if (conflictType === "overlap") {
          showToast("Ca làm bị chồng giờ với ca khác trong cùng ngày trên trang khác.", "error");
          return;
        }

        newRows.push(newRow);
      }

      setCurrentRows((previousRows) => [...newRows, ...previousRows]);
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

    const conflictType = getRowConflict(allRowsAcrossPages, newRow);
    if (conflictType === "duplicate") {
      showToast("Dòng bị trùng: cùng ngày và cùng giờ làm đã tồn tại trên trang khác.", "error");
      return;
    }

    if (conflictType === "overlap") {
      showToast("Ca làm bị chồng giờ với ca khác trong cùng ngày trên trang khác.", "error");
      return;
    }

    setCurrentRows((previousRows) => [newRow, ...previousRows]);
    closeModal();
    showToast("Thêm dòng thành công", "success");
  }

  if (!isCloudLoaded) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-sm font-semibold text-primary">{cloudError ?? "Đang tải dữ liệu..."}</div>;
  }

  return (
    <>
      {currentPage === "main" ? (
        <>
          <PageHeader title="Quản lý giờ làm" onExport={openExportMonthModal} onOpenSettings={openSettingsModal} />
          <ToastPanel toastState={toastState} />
          <PageContentSection
            title="Bảng chấm công"
            slotLabel="Giờ làm"
            groupedVisibleRows={groupedVisibleRows}
            expandedDates={currentPageContent.expandedDates}
            visibleRowsCount={visibleRows.length}
            activeFilter={currentPageContent.activeFilter as any}
            monthButtonLabel={monthButtonLabel}
            monthOptions={availableMonthOptions}
            selectedMonth={currentMonthValue}
            onToggleGroup={toggleGroup}
            onToggleRow={handleToggleRow}
            onCheckAllInGroup={handleCheckAllInGroup}
            onEditRow={handleEditRow}
            onDeleteRow={openDeleteConfirm}
            onDeleteDay={openDeleteDayConfirm}
            onFilterChange={handleFilterChange}
            onSelectMonth={handleSelectMonth}
            onAddRow={openModal}
            onDeleteCheckedRows={openDeleteCheckedRowsConfirm}
            selectedRowsCount={selectedRows.length}
            sortAscending={currentPageContent.sortAscending}
            onToggleSort={currentPageContent.toggleSort}
          />
          <BottomSummaryBar
            title="Tổng giờ làm đã chọn"
            totalHoursLabel={formatHoursAsHourMinute(totalSelectedHours)}
            selectedCount={selectedRows.length}
            onNavigate={() => setCurrentPage("gold")}
            navigateAriaLabel="Xem giờ dạy cho Gold"
            navigateIcon="arrow_forward"
          />
        </>
      ) : (
        <>
          <PageHeader
            title="Giờ dạy - Gold"
            showBackButton
            backAriaLabel="Quay lại"
            onBack={() => setCurrentPage("main")}
            onExport={openExportMonthModal}
            onOpenSettings={openSettingsModal}
          />
          <ToastPanel toastState={toastState} />
          <PageContentSection
            title="Bảng giờ dạy Gold"
            slotLabel="Giờ dạy"
            groupedVisibleRows={groupedVisibleRows}
            expandedDates={currentPageContent.expandedDates}
            visibleRowsCount={visibleRows.length}
            activeFilter={currentPageContent.activeFilter as any}
            monthButtonLabel={monthButtonLabel}
            monthOptions={availableMonthOptions}
            selectedMonth={currentMonthValue}
            onToggleGroup={toggleGroup}
            onToggleRow={handleToggleRow}
            onCheckAllInGroup={handleCheckAllInGroup}
            onEditRow={handleEditRow}
            onDeleteRow={openDeleteConfirm}
            onDeleteDay={openDeleteDayConfirm}
            onFilterChange={handleFilterChange}
            onSelectMonth={handleSelectMonth}
            onAddRow={openModal}
            onDeleteCheckedRows={openDeleteCheckedRowsConfirm}
            selectedRowsCount={selectedRows.length}
            sortAscending={currentPageContent.sortAscending}
            onToggleSort={currentPageContent.toggleSort}
          />
          <BottomSummaryBar
            title="Tổng giờ dạy cho Gold đã chọn"
            totalHoursLabel={formatHoursAsHourMinute(totalSelectedHours)}
            selectedCount={selectedRows.length}
            onNavigate={() => setCurrentPage("main")}
            navigateAriaLabel="Quay lại trang chính"
            navigateIcon="arrow_back"
          />
        </>
      )}

      {/* Modals - shared across both pages */}
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
                main: {
                  totalDays: pendingExportSummary.main.totalDays,
                  totalShifts: pendingExportSummary.main.totalShifts,
                  totalHoursLabel: formatHoursAsHourMinute(pendingExportSummary.main.totalHours)
                },
                gold: {
                  totalDays: pendingExportSummary.gold.totalDays,
                  totalShifts: pendingExportSummary.gold.totalShifts,
                  totalHoursLabel: formatHoursAsHourMinute(pendingExportSummary.gold.totalHours)
                },
                overallHoursLabel: formatHoursAsHourMinute(pendingExportSummary.main.totalHours + pendingExportSummary.gold.totalHours)
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
        onGenerateMonth={handleGenerateCurrentMonth}
        canRevertMonth={lastGeneratedRowIds.some((id) => currentRows.some((row) => row.id === id))}
        onRevertMonth={revertGeneratedRows}
        onSubmit={handleSubmitRow}
        onModeChange={setFormMode}
        onDateChange={handleDateChange}
        onStartHourChange={(value) => setFormStartHour(sanitizeTimeInput(value))}
        onStartMinuteChange={(value) => setFormStartMinute(sanitizeTimeInput(value))}
        onEndHourChange={(value) => setFormEndHour(sanitizeTimeInput(value))}
        onEndMinuteChange={(value) => setFormEndMinute(sanitizeTimeInput(value))}
        onToggleDefaultSettingIndex={toggleDefaultSettingIndex}
        onToggleAllDefaultSettings={() => toggleAllDefaultSettings(dayDefaultSettingsForFormDay.length)}
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
        onOpenAddSettingForm={() => openSettingsFormForAdd(formDayOfWeek)}
        onOpenEditSettingForm={(settingId) => {
          const setting = currentDayDefaultSettings.find((item) => item.id === settingId);
          if (!setting) {
            return;
          }

          openSettingsFormForEdit(setting.dayOfWeek, setting.slot, setting.id);
        }}
        onToggleSettingDay={toggleSettingDay}
        onDeleteDefaultSetting={handleDeleteDefaultSetting}
        onSettingFormDayOfWeekChange={setSettingFormDayOfWeek}
        onSettingFormStartHourChange={(value) => setSettingFormStartHour(sanitizeTimeInput(value))}
        onSettingFormStartMinuteChange={(value) => setSettingFormStartMinute(sanitizeTimeInput(value))}
        onSettingFormEndHourChange={(value) => setSettingFormEndHour(sanitizeTimeInput(value))}
        onSettingFormEndMinuteChange={(value) => setSettingFormEndMinute(sanitizeTimeInput(value))}
        onCloseForm={closeSettingsFormHook}
        onSubmitForm={handleSubmitDayDefaultSetting}
      />
      <GenerateMonthConfirmModal
        isOpen={isGenerateMonthConfirmOpen}
        monthLabel={formatMonthYearLabel(getCurrentYearMonth())}
        onClose={() => setIsGenerateMonthConfirmOpen(false)}
        onConfirm={confirmGenerateCurrentMonth}
      />
      <RevertGenerateConfirmModal
        isOpen={isRevertConfirmOpen}
        onClose={() => setIsRevertConfirmOpen(false)}
        onConfirm={confirmRevertGeneratedRows}
      />
    </>
  );
}

function App(): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setIsAuthLoading(false);
    });
  }, []);

  if (isAuthLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-sm font-semibold text-primary">Đang kiểm tra đăng nhập...</div>;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <AuthenticatedApp user={user} />;
}

export default App;
