import { FormEvent, useEffect, useMemo, useState } from "react";

type FilterType = "all" | "week" | "month";

type WorkRow = {
  id: string;
  dayOfWeek: string;
  date: string;
  slot: string;
  hours: number;
  checked: boolean;
};

type WorkRowInput = Partial<WorkRow>;

type WorkRowGroup = {
  date: string;
  dayOfWeek: string;
  rows: WorkRow[];
  shiftCount: number;
  checkedCount: number;
  totalHours: number;
};

type SlotParts = {
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
};

type SlotCalculation = {
  isValid: boolean;
  slotValue: string;
  hours: number;
  errorMessage?: string;
};

const STORAGE_KEY = "app-cham-cong-rows-v1";
const DAY_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const DAY_NAME_ALIASES: Record<string, string> = {
  "Chủ Nhật": "CN",
  "Thứ 2": "T2",
  "Thứ 3": "T3",
  "Thứ 4": "T4",
  "Thứ 5": "T5",
  "Thứ 6": "T6",
  "Thứ 7": "T7",
  CN: "CN",
  T2: "T2",
  T3: "T3",
  T4: "T4",
  T5: "T5",
  T6: "T6",
  T7: "T7"
};

const FILTERS: Array<{ key: FilterType; label: string }> = [
  { key: "all", label: "Tất cả" },
  { key: "week", label: "Tuần này" },
  { key: "month", label: "Tháng này" }
];

const DEFAULT_SLOT_PARTS: SlotParts = {
  startHour: "08",
  startMinute: "00",
  endHour: "12",
  endMinute: "00"
};

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateOnly(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(dateString: string): string {
  if (!dateString) {
    return "";
  }
  const [, month, day] = dateString.split("-");
  return `${day}/${month}`;
}

function formatDateWithYear(dateString: string): string {
  if (!dateString) {
    return "dd/mm/yyyy";
  }
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

function formatHoursAsHourMinute(hours: number): string {
  if (!Number.isFinite(hours) || hours < 0) {
    return "0h00p";
  }

  const totalMinutes = Math.round(hours * 60);
  const hourPart = Math.floor(totalMinutes / 60);
  const minutePart = totalMinutes % 60;
  return `${hourPart}h${String(minutePart).padStart(2, "0")}p`;
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toTwoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

function sanitizeTimeInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 2);
}

function parseSlotParts(slot: string): SlotParts {
  const match = slot.match(/^\s*(\d{1,2})\s*:\s*(\d{1,2})\s*-\s*(\d{1,2})\s*:\s*(\d{1,2})\s*$/);
  if (!match) {
    return DEFAULT_SLOT_PARTS;
  }

  const startHour = Number(match[1]);
  const startMinute = Number(match[2]);
  const endHour = Number(match[3]);
  const endMinute = Number(match[4]);

  const isValid =
    Number.isInteger(startHour) &&
    Number.isInteger(startMinute) &&
    Number.isInteger(endHour) &&
    Number.isInteger(endMinute) &&
    startHour >= 0 &&
    startHour <= 23 &&
    startMinute >= 0 &&
    startMinute <= 59 &&
    endHour >= 0 &&
    endHour <= 23 &&
    endMinute >= 0 &&
    endMinute <= 59;

  if (!isValid) {
    return DEFAULT_SLOT_PARTS;
  }

  return {
    startHour: toTwoDigits(startHour),
    startMinute: toTwoDigits(startMinute),
    endHour: toTwoDigits(endHour),
    endMinute: toTwoDigits(endMinute)
  };
}

function parseSlotRangeInMinutes(slot: string): { start: number; end: number } | null {
  const match = slot.match(/^\s*(\d{1,2})\s*:\s*(\d{1,2})\s*-\s*(\d{1,2})\s*:\s*(\d{1,2})\s*$/);
  if (!match) {
    return null;
  }

  const startHour = Number(match[1]);
  const startMinute = Number(match[2]);
  const endHour = Number(match[3]);
  const endMinute = Number(match[4]);

  const isValid =
    Number.isInteger(startHour) &&
    Number.isInteger(startMinute) &&
    Number.isInteger(endHour) &&
    Number.isInteger(endMinute) &&
    startHour >= 0 &&
    startHour <= 23 &&
    startMinute >= 0 &&
    startMinute <= 59 &&
    endHour >= 0 &&
    endHour <= 23 &&
    endMinute >= 0 &&
    endMinute <= 59;

  if (!isValid) {
    return null;
  }

  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;

  if (end <= start) {
    return null;
  }

  return { start, end };
}

function calculateSlotAndHours(startHourText: string, startMinuteText: string, endHourText: string, endMinuteText: string): SlotCalculation {
  if (!startHourText || !startMinuteText || !endHourText || !endMinuteText) {
    return {
      isValid: false,
      slotValue: "",
      hours: 0,
      errorMessage: "Vui lòng nhập đủ giờ bắt đầu và giờ kết thúc."
    };
  }

  const startHour = Number(startHourText);
  const startMinute = Number(startMinuteText);
  const endHour = Number(endHourText);
  const endMinute = Number(endMinuteText);

  const isValidTime =
    Number.isInteger(startHour) &&
    Number.isInteger(startMinute) &&
    Number.isInteger(endHour) &&
    Number.isInteger(endMinute) &&
    startHour >= 0 &&
    startHour <= 23 &&
    startMinute >= 0 &&
    startMinute <= 59 &&
    endHour >= 0 &&
    endHour <= 23 &&
    endMinute >= 0 &&
    endMinute <= 59;

  if (!isValidTime) {
    return {
      isValid: false,
      slotValue: "",
      hours: 0,
      errorMessage: "Giờ làm không hợp lệ. Giờ từ 00-23, phút từ 00-59."
    };
  }

  const startTotalMinute = startHour * 60 + startMinute;
  const endTotalMinute = endHour * 60 + endMinute;
  if (endTotalMinute <= startTotalMinute) {
    return {
      isValid: false,
      slotValue: "",
      hours: 0,
      errorMessage: "Giờ kết thúc phải sau giờ bắt đầu."
    };
  }

  const durationMinutes = endTotalMinute - startTotalMinute;
  const hours = durationMinutes / 60;
  const slotValue = `${toTwoDigits(startHour)}:${toTwoDigits(startMinute)} - ${toTwoDigits(endHour)}:${toTwoDigits(endMinute)}`;

  return {
    isValid: true,
    slotValue,
    hours
  };
}

function getStartOfWeek(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const offsetToMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offsetToMonday);
  return start;
}

function buildSeedRows(): WorkRow[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const templates = [
    { dayOffset: 0, slot: "08:00 - 12:00", hours: 4.0, checked: true },
    { dayOffset: 1, slot: "13:00 - 17:00", hours: 4.0, checked: true },
    { dayOffset: 2, slot: "09:00 - 12:00", hours: 3.0, checked: false },
    { dayOffset: 4, slot: "18:00 - 20:00", hours: 2.0, checked: true },
    { dayOffset: 6, slot: "08:00 - 11:00", hours: 3.0, checked: false }
  ];

  return templates.map((template) => {
    const rowDate = new Date(today);
    rowDate.setDate(today.getDate() - template.dayOffset);
    return {
      id: createId(),
      dayOfWeek: DAY_NAMES[rowDate.getDay()],
      date: toISODate(rowDate),
      slot: template.slot,
      hours: template.hours,
      checked: template.checked
    };
  });
}

function normalizeRow(row: WorkRowInput): WorkRow {
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(String(row.date ?? "")) ? String(row.date) : toISODate(new Date());
  const dateObj = toDateOnly(safeDate);
  const safeHours = Number(row.hours);
  const rawDayOfWeek = typeof row.dayOfWeek === "string" ? row.dayOfWeek.trim() : "";

  return {
    id: typeof row.id === "string" ? row.id : createId(),
    dayOfWeek: DAY_NAME_ALIASES[rawDayOfWeek] ?? DAY_NAMES[dateObj.getDay()],
    date: safeDate,
    slot: String(row.slot ?? "").trim(),
    hours: Number.isFinite(safeHours) && safeHours > 0 ? safeHours : 0.5,
    checked: Boolean(row.checked)
  };
}

function loadRows(): WorkRow[] {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (!rawData) {
      return buildSeedRows();
    }

    const parsedData: unknown = JSON.parse(rawData);
    if (!Array.isArray(parsedData) || parsedData.length === 0) {
      return buildSeedRows();
    }

    return parsedData.map((row) => normalizeRow(row as WorkRowInput));
  } catch (error) {
    console.warn("Dữ liệu localStorage không hợp lệ", error);
    return buildSeedRows();
  }
}

function persistRows(rows: WorkRow[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch (error) {
    console.warn("Không thể lưu localStorage", error);
  }
}

function getDayNameFromDate(dateString: string): string {
  return DAY_NAMES[toDateOnly(dateString).getDay()];
}

function isInFilter(dateString: string, activeFilter: FilterType): boolean {
  if (activeFilter === "all") {
    return true;
  }

  const rowDate = toDateOnly(dateString);
  rowDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (activeFilter === "week") {
    const weekStart = getStartOfWeek(today);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return rowDate >= weekStart && rowDate <= weekEnd;
  }

  return rowDate.getMonth() === today.getMonth() && rowDate.getFullYear() === today.getFullYear();
}

function matchesSearch(row: WorkRow, searchQuery: string): boolean {
  if (!searchQuery) {
    return true;
  }

  const normalizedQuery = searchQuery.toLowerCase();
  const searchableText = `${row.dayOfWeek} ${formatDate(row.date)} ${row.slot} ${row.hours}`.toLowerCase();
  return searchableText.includes(normalizedQuery);
}

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

function areDateSetsEqual(left: Set<string>, right: Set<string>): boolean {
  if (left.size !== right.size) {
    return false;
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }
  return true;
}

function App(): JSX.Element {
  const [rows, setRows] = useState<WorkRow[]>(() => loadRows());
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [pendingDeleteRowId, setPendingDeleteRowId] = useState<string | null>(null);
  const [toastState, setToastState] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(() => new Set());

  const [formDayOfWeek, setFormDayOfWeek] = useState("T2");
  const [formDate, setFormDate] = useState(toISODate(new Date()));
  const [formStartHour, setFormStartHour] = useState(DEFAULT_SLOT_PARTS.startHour);
  const [formStartMinute, setFormStartMinute] = useState(DEFAULT_SLOT_PARTS.startMinute);
  const [formEndHour, setFormEndHour] = useState(DEFAULT_SLOT_PARTS.endHour);
  const [formEndMinute, setFormEndMinute] = useState(DEFAULT_SLOT_PARTS.endMinute);

  useEffect(() => {
    persistRows(rows);
  }, [rows]);

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

      if (visibleDateSet.has(todayDate)) {
        nextExpandedDates.add(todayDate);
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

  const formSlotCalculation = useMemo(
    () => calculateSlotAndHours(formStartHour, formStartMinute, formEndHour, formEndMinute),
    [formStartHour, formStartMinute, formEndHour, formEndMinute]
  );

  function openModal(): void {
    const defaultDate = toISODate(new Date());
    setEditingRowId(null);
    setFormDate(defaultDate);
    setFormDayOfWeek(getDayNameFromDate(defaultDate));
    setFormStartHour(DEFAULT_SLOT_PARTS.startHour);
    setFormStartMinute(DEFAULT_SLOT_PARTS.startMinute);
    setFormEndHour(DEFAULT_SLOT_PARTS.endHour);
    setFormEndMinute(DEFAULT_SLOT_PARTS.endMinute);
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
    const slotParts = parseSlotParts(rowToEdit.slot);
    setFormStartHour(slotParts.startHour);
    setFormStartMinute(slotParts.startMinute);
    setFormEndHour(slotParts.endHour);
    setFormEndMinute(slotParts.endMinute);
    setIsModalOpen(true);
  }

  function handleDateChange(value: string): void {
    setFormDate(value);
    if (value) {
      setFormDayOfWeek(getDayNameFromDate(value));
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

  function openDeleteConfirm(rowId: string): void {
    setPendingDeleteRowId(rowId);
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
        <span className="material-symbols-outlined text-on-surface-variant">account_circle</span>
      </header>

      {toastState ? (
        <div className="fixed right-4 top-[4.5rem] z-[80] max-w-[calc(100vw-2rem)]">
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
                  <button
                    aria-expanded={isExpanded}
                    className="w-full px-4 py-3 text-left transition-colors hover:bg-surface-container"
                    type="button"
                    onClick={() => toggleGroup(group.date)}
                  >
                    <div className="grid grid-cols-[repeat(11,minmax(0,1fr))] items-center gap-2">
                      <div className="col-span-1 flex justify-center">
                        <span className={`material-symbols-outlined text-on-surface-variant transition-transform ${isExpanded ? "rotate-180" : "rotate-0"}`}>
                          expand_more
                        </span>
                      </div>
                      <div className="col-span-4 text-sm font-black text-primary">
                        {group.dayOfWeek} - {formatDate(group.date)}
                      </div>
                      <div className="col-span-3 flex justify-center">
                        <span className="rounded-full bg-tertiary-fixed px-2 py-0.5 text-[10px] font-bold text-on-tertiary-fixed">{group.shiftCount} ca</span>
                      </div>
                      <div className="col-span-3 text-right text-sm font-bold text-on-surface">{formatHoursAsHourMinute(group.totalHours)}</div>
                    </div>
                    <div className="mt-1 pl-9 text-[11px] font-medium text-on-surface-variant">{group.checkedCount}/{group.shiftCount} dòng đã chọn</div>
                  </button>

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

      {pendingDeleteRowId ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-on-surface/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeDeleteConfirm();
            }
          }}
        >
          <div className="w-full max-w-sm rounded-t-[2rem] border-t border-white/20 bg-surface p-6 shadow-2xl sm:rounded-3xl">
            <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-surface-variant sm:hidden"></div>
            <h3 className="mb-2 text-lg font-bold text-on-surface">Xác nhận xóa</h3>
            <p className="mb-3 text-sm text-on-surface-variant">Bạn có chắc muốn xóa dòng chấm công này không?</p>
            {pendingDeleteRow ? (
              <div className="mb-6 space-y-1 rounded-xl border border-outline-variant/50 bg-surface-container-low px-3 py-3 text-sm">
                <p>
                  <span className="font-semibold text-on-surface-variant">Thứ:</span> {pendingDeleteRow.dayOfWeek}
                </p>
                <p>
                  <span className="font-semibold text-on-surface-variant">Ngày:</span> {formatDate(pendingDeleteRow.date)}
                </p>
                <p>
                  <span className="font-semibold text-on-surface-variant">Giờ làm:</span> {pendingDeleteRow.slot}
                </p>
                <p>
                  <span className="font-semibold text-on-surface-variant">Tổng giờ:</span> {formatHoursAsHourMinute(pendingDeleteRow.hours)}
                </p>
              </div>
            ) : null}
            <div className="flex gap-3">
              <button
                className="flex-1 rounded-2xl border border-[#d5dde0] bg-white/85 py-3 font-semibold text-[#3f484b] transition-all hover:bg-[#f1f4f5] active:scale-95"
                type="button"
                onClick={closeDeleteConfirm}
              >
                Hủy
              </button>
              <button
                className="flex-1 rounded-2xl border border-[#efc6c6] bg-[#fce8e8] py-3 font-semibold text-[#a63737] transition-all hover:bg-[#f9dede] active:scale-95"
                type="button"
                onClick={confirmDeleteRow}
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
                  <label className="ml-1 text-[11px] font-bold uppercase text-on-surface-variant" htmlFor="formDayOfWeek">
                    Thứ
                  </label>
                  <select
                    className="w-full rounded-xl border-none bg-surface-container-highest px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary/20"
                    id="formDayOfWeek"
                    required
                    value={formDayOfWeek}
                    onChange={(event) => setFormDayOfWeek(event.target.value)}
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
                <label className="ml-1 text-[11px] font-bold uppercase text-on-surface-variant" htmlFor="formStartHour">
                  Giờ làm (HH:MM - HH:MM)
                </label>
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
    </>
  );
}

export default App;
