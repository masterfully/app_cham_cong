import { FormEvent, useRef } from "react";
import { formatDateWithYear, getDayNameFromDate } from "../../utils/date";
import { DayDefaultSetting } from "../../types";
import TimeWheelInput from "../ui/TimeWheelInput";

const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

type WorkRowModalProps = {
  isOpen: boolean;
  editingRowId: string | null;
  isNoStudentRow: boolean;
  newRowIsNoStudent: boolean;
  formMode: "default" | "custom";
  formDate: string;
  formStartHour: string;
  formStartMinute: string;
  formEndHour: string;
  formEndMinute: string;
  formHoursLabel: string;
  noStudentShiftEnabled: boolean;
  noStudentShiftStart: string;
  noStudentShiftEnd: string;
  noStudentShiftHoursLabel: string;
  dayDefaultSettingsForFormDay: DayDefaultSetting[];
  selectedDefaultSettingIndices: Set<number>;
  onClose: () => void;
  onGenerateMonth: () => void;
  canRevertMonth: boolean;
  onRevertMonth: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onModeChange: (mode: "default" | "custom") => void;
  onDateChange: (value: string) => void;
  onStartHourChange: (value: string) => void;
  onStartMinuteChange: (value: string) => void;
  onEndHourChange: (value: string) => void;
  onEndMinuteChange: (value: string) => void;
  onNoStudentShiftEnabledChange: (enabled: boolean) => void;
  onNoStudentShiftStartChange: (value: string) => void;
  onNoStudentShiftEndChange: (value: string) => void;
  onNewRowIsNoStudentChange: (value: boolean) => void;
  onToggleDefaultSettingIndex: (index: number) => void;
  onToggleAllDefaultSettings: () => void;
};

function WorkRowModal({
  isOpen,
  editingRowId,
  isNoStudentRow,
  newRowIsNoStudent,
  formMode,
  formDate,
  formStartHour,
  formStartMinute,
  formEndHour,
  formEndMinute,
  formHoursLabel,
  noStudentShiftEnabled,
  noStudentShiftStart,
  noStudentShiftEnd,
  noStudentShiftHoursLabel,
  dayDefaultSettingsForFormDay,
  selectedDefaultSettingIndices,
  onClose,
  onGenerateMonth,
  canRevertMonth,
  onRevertMonth,
  onSubmit,
  onModeChange,
  onDateChange,
  onStartHourChange,
  onStartMinuteChange,
  onEndHourChange,
  onEndMinuteChange,
  onNoStudentShiftEnabledChange,
  onNoStudentShiftStartChange,
  onNoStudentShiftEndChange,
  onNewRowIsNoStudentChange,
  onToggleDefaultSettingIndex,
  onToggleAllDefaultSettings
}: WorkRowModalProps): JSX.Element | null {
  const dateInputRef = useRef<HTMLInputElement>(null);
  if (!isOpen) {
    return null;
  }
  const hasDefaultSettings = dayDefaultSettingsForFormDay.length > 0;
  const isDefaultMode = formMode === "default" && !editingRowId;
  const isCustomMode = formMode === "custom" || Boolean(editingRowId);
  const dateLabel = formDate ? `${getDayNameFromDate(formDate)}, ${formatDateWithYear(formDate)}` : "--, dd/mm/yyyy";
  const [noStudentStartHour = "00", noStudentStartMinute = "00"] = noStudentShiftStart.split(":");
  const [noStudentEndHour = "00", noStudentEndMinute = "00"] = noStudentShiftEnd.split(":");
  const workStartMinutes = Number(formStartHour) * 60 + Number(formStartMinute);
  const workEndMinutes = Number(formEndHour) * 60 + Number(formEndMinute);
  const hasWorkTimeRange = Number.isFinite(workStartMinutes) && Number.isFinite(workEndMinutes) && workEndMinutes > workStartMinutes;
  const noStudentHourOptions = hasWorkTimeRange
    ? Array.from(
        { length: Math.floor(workEndMinutes / 60) - Math.floor(workStartMinutes / 60) + 1 },
        (_, index) => String(Math.floor(workStartMinutes / 60) + index).padStart(2, "0")
      )
    : Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
  const getNoStudentMinuteOptions = (hour: string): string[] => {
    if (!hasWorkTimeRange) return MINUTE_OPTIONS;
    return MINUTE_OPTIONS.filter((minute) => {
      const value = Number(hour) * 60 + Number(minute);
      return value >= workStartMinutes && value <= workEndMinutes;
    });
  };
  const noStudentStartMinuteOptions = getNoStudentMinuteOptions(noStudentStartHour);
  const noStudentEndMinuteOptions = getNoStudentMinuteOptions(noStudentEndHour);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-on-surface/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="modal-panel w-full max-w-md rounded-t-[2rem] border-t border-white/20 bg-surface p-6 shadow-2xl sm:rounded-3xl">
        <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-surface-variant sm:hidden"></div>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-primary">{editingRowId ? "Chỉnh sửa dòng" : "Thêm dòng mới"}</h3>
            {isNoStudentRow ? (
              <label className="flex cursor-pointer items-center gap-2 rounded-full border border-[#e86aa3] bg-primary/5 px-2 py-1 text-[11px] font-bold text-primary">
                <span className={`relative flex h-5 w-5 shrink-0 items-center justify-center rounded ${newRowIsNoStudent ? "bg-primary text-white" : "bg-white text-primary"}`}>
                  <input
                    checked={newRowIsNoStudent}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    type="checkbox"
                    onChange={(event) => onNewRowIsNoStudentChange(event.target.checked)}
                  />
                  {newRowIsNoStudent ? <span className="material-symbols-outlined text-[15px] leading-none">check</span> : null}
                </span>
                Không có học sinh
              </label>
            ) : null}
            {!editingRowId && !canRevertMonth ? (
              <button
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary transition-colors hover:bg-primary/15 active:scale-95"
                type="button"
                aria-label="Tự động tạo dữ liệu cho tháng hiện tại"
                title="Tự động tạo dữ liệu cho tháng hiện tại"
                onClick={onGenerateMonth}
              >
                <span className="material-symbols-outlined text-[18px] leading-none">auto_awesome</span>
              </button>
            ) : null}
            {!editingRowId && canRevertMonth ? (
              <button
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-400/40 bg-red-50 text-red-600 transition-colors hover:bg-red-100 active:scale-95"
                type="button"
                aria-label="Hoàn tác tự động tạo"
                title="Hoàn tác tự động tạo"
                onClick={onRevertMonth}
              >
                <span className="material-symbols-outlined text-[18px] leading-none">undo</span>
              </button>
            ) : null}
          </div>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#d5dde0] bg-white/75 text-[#5b6669] transition-colors hover:bg-[#e8f4f7] hover:text-[#0f5d6b]"
            type="button"
            onClick={onClose}
          >
            <span className="material-symbols-outlined text-[18px] leading-none">close</span>
          </button>
        </div>

        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <label className="ml-1 text-[11px] font-bold uppercase text-on-surface-variant" htmlFor="formDate">
              Ngày
            </label>
            <div className="relative">
              <input
                ref={dateInputRef}
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                id="formDate"
                required
                type="date"
                value={formDate}
                onChange={(event) => onDateChange(event.target.value)}
              />
              <div className="flex w-full items-center justify-between gap-3 rounded-xl bg-surface-container-highest px-4 py-3 text-on-surface">
                <div className="min-w-0 flex-1">
                  <span className="block truncate whitespace-nowrap">{dateLabel}</span>
                </div>
                <span className="material-symbols-outlined text-base text-on-surface-variant">calendar_month</span>
                <button
                  className="relative z-20 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-variant/60"
                  type="button"
                  aria-label="Chỉnh sửa ngày"
                  title="Chỉnh sửa ngày"
                  onClick={() => {
                    const input = dateInputRef.current;
                    if (!input) return;
                    try {
                      input.showPicker();
                    } catch {
                      input.click();
                    }
                  }}
                >
                  <span className="material-symbols-outlined text-[18px] leading-none">edit</span>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            {!editingRowId ? (
              <div className="flex gap-2">
                <button
                  className={`flex-1 rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    formMode === "default"
                      ? "bg-primary text-on-primary"
                      : "border border-outline-variant/40 bg-white/70 text-on-surface-variant hover:bg-white/85"
                  }`}
                  disabled={!hasDefaultSettings}
                  type="button"
                  onClick={() => onModeChange("default")}
                >
                  Mặc định
                </button>
                <button
                  className={`flex-1 rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors ${
                    formMode === "custom"
                      ? "bg-primary text-on-primary"
                      : "border border-outline-variant/40 bg-white/70 text-on-surface-variant hover:bg-white/85"
                  }`}
                  type="button"
                  onClick={() => onModeChange("custom")}
                >
                  Tùy chỉnh
                </button>
              </div>
            ) : null}

            {isDefaultMode ? (
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label className="ml-1 text-[11px] font-bold uppercase text-on-surface-variant">Chọn ca làm</label>
                  <span className="text-[10px] text-on-surface-variant">
                    {selectedDefaultSettingIndices.size}/{dayDefaultSettingsForFormDay.length}
                  </span>
                </div>

                <div className="space-y-2 rounded-xl bg-surface-container-highest p-3">
                  <div className="max-h-[8.5rem] space-y-1.5 overflow-y-auto pr-1">
                    {dayDefaultSettingsForFormDay.map((setting, index) => (
                      <label key={setting.id} className="flex cursor-pointer items-center gap-3 rounded-lg bg-white/50 px-2 py-2 transition-colors hover:bg-white/70">
                        <input
                          type="checkbox"
                          className="cursor-pointer rounded border border-primary/40 accent-primary"
                          checked={selectedDefaultSettingIndices.has(index)}
                          onChange={() => onToggleDefaultSettingIndex(index)}
                        />
                        <span className="flex-1 text-base font-medium text-on-surface">{setting.slot}</span>
                      </label>
                    ))}
                  </div>

                  <label className="flex cursor-pointer items-center gap-3 border-t border-outline-variant/20 pt-2">
                    <input
                      type="checkbox"
                      className="cursor-pointer rounded border border-primary/40 accent-primary"
                      checked={selectedDefaultSettingIndices.size === dayDefaultSettingsForFormDay.length && hasDefaultSettings}
                      onChange={onToggleAllDefaultSettings}
                    />
                    <span className="text-base font-semibold text-on-surface-variant">Chọn tất cả</span>
                  </label>
                </div>
              </div>
            ) : null}

            {isCustomMode ? (
              <div>
                <label className="ml-1 text-[11px] font-bold uppercase text-on-surface-variant" htmlFor="formStartHour">
                  Giờ làm
                </label>
                <div className="mt-1.5 rounded-xl bg-surface-container-highest px-3 py-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="mb-1 block text-center text-sm font-semibold text-primary">Bắt đầu</span>
                      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                        <TimeWheelInput
                          id="formStartHourWheel"
                          value={formStartHour}
                          showArrows
                          compactArrows
                          milestones={Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"))}
                          onChange={(hour) => onStartHourChange(hour)}
                        />
                        <span className="px-1 text-sm font-black text-on-surface-variant">:</span>
                        <TimeWheelInput
                          id="formStartMinuteWheel"
                          value={formStartMinute}
                          options={MINUTE_OPTIONS}
                          showArrows
                          compactArrows
                          onChange={(minute) => onStartMinuteChange(minute)}
                        />
                      </div>
                    </div>

                    <div>
                      <span className="mb-1 block text-center text-sm font-semibold text-primary">Kết thúc</span>
                      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                        <TimeWheelInput
                          id="formEndHourWheel"
                          value={formEndHour}
                          showArrows
                          compactArrows
                          milestones={Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"))}
                          onChange={(hour) => onEndHourChange(hour)}
                        />
                        <span className="px-1 text-sm font-black text-on-surface-variant">:</span>
                        <TimeWheelInput
                          id="formEndMinuteWheel"
                          value={formEndMinute}
                          options={MINUTE_OPTIONS}
                          showArrows
                          compactArrows
                          onChange={(minute) => onEndMinuteChange(minute)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label className="ml-1 text-[11px] font-bold uppercase text-on-surface-variant" htmlFor="formHours">
              Tổng giờ của ngày
            </label>
            <div className="flex items-center rounded-xl bg-surface-container-highest pr-2">
              <input
                className="min-w-0 flex-1 rounded-xl border-none bg-transparent px-4 py-3 text-on-surface-variant"
                id="formHours"
                readOnly
                type="text"
                value={formHoursLabel}
              />
              {editingRowId && !isNoStudentRow ? <button
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${noStudentShiftEnabled ? "bg-primary/10 text-primary" : "text-on-surface-variant hover:bg-surface-variant/60"}`}
                type="button"
                aria-label="Thêm ca không có học sinh"
                aria-expanded={noStudentShiftEnabled}
                title="Thêm ca không có học sinh"
                onClick={() => {
                  if (!noStudentShiftEnabled) {
                    onNoStudentShiftStartChange(`${formStartHour.padStart(2, "0")}:${formStartMinute.padStart(2, "0")}`);
                    onNoStudentShiftEndChange(`${formEndHour.padStart(2, "0")}:${formEndMinute.padStart(2, "0")}`);
                  }
                  onNoStudentShiftEnabledChange(!noStudentShiftEnabled);
                }}
              >
                <span className="material-symbols-outlined text-[18px] leading-none">edit</span>
              </button> : null}
            </div>
            {!editingRowId ? (
              <label className="mt-2 flex cursor-pointer items-center justify-start gap-2 text-sm font-semibold text-primary">
                <span className={`relative flex h-4 w-4 shrink-0 items-center justify-center rounded border ${newRowIsNoStudent ? "border-primary bg-primary text-white" : "border-primary/40 bg-white"}`}>
                  <input
                    checked={newRowIsNoStudent}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    type="checkbox"
                    onChange={(event) => onNewRowIsNoStudentChange(event.target.checked)}
                  />
                  {newRowIsNoStudent ? <span className="material-symbols-outlined text-[13px] leading-none">check</span> : null}
                </span>
                Ca không có học sinh
              </label>
            ) : null}
            {editingRowId && !isNoStudentRow && noStudentShiftEnabled ? (
              <div className="mt-2 grid grid-cols-2 gap-3 rounded-xl border border-primary/15 bg-primary/5 p-3">
                <p className="col-span-2 text-center text-sm font-bold text-primary">Ca không có học sinh</p>
                <div>
                  <label className="mb-1 block text-center text-xs font-semibold text-on-surface-variant" htmlFor="noStudentShiftStart">Bắt đầu ca</label>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                    <TimeWheelInput
                      id="noStudentShiftStartHour"
                      value={noStudentStartHour}
                      options={noStudentHourOptions}
                      singleValue
                      milestones={Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"))}
                      onChange={(hour) => {
                        const minutes = getNoStudentMinuteOptions(hour);
                        const minute = minutes.includes(noStudentStartMinute) ? noStudentStartMinute : (minutes[0] ?? "00");
                        onNoStudentShiftStartChange(`${hour}:${minute}`);
                      }}
                    />
                    <span className="px-1 text-sm font-black text-on-surface-variant">:</span>
                    <TimeWheelInput
                      id="noStudentShiftStartMinute"
                      value={noStudentStartMinute}
                      options={noStudentStartMinuteOptions}
                      singleValue
                      onChange={(minute) => onNoStudentShiftStartChange(`${noStudentStartHour}:${minute}`)}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-center text-xs font-semibold text-on-surface-variant" htmlFor="noStudentShiftEnd">Kết thúc ca</label>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                    <TimeWheelInput
                      id="noStudentShiftEndHour"
                      value={noStudentEndHour}
                      options={noStudentHourOptions}
                      singleValue
                      milestones={Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"))}
                      onChange={(hour) => {
                        const minutes = getNoStudentMinuteOptions(hour);
                        const minute = minutes.includes(noStudentEndMinute) ? noStudentEndMinute : (minutes[0] ?? "00");
                        onNoStudentShiftEndChange(`${hour}:${minute}`);
                      }}
                    />
                    <span className="px-1 text-sm font-black text-on-surface-variant">:</span>
                    <TimeWheelInput
                      id="noStudentShiftEndMinute"
                      value={noStudentEndMinute}
                      options={noStudentEndMinuteOptions}
                      singleValue
                      onChange={(minute) => onNoStudentShiftEndChange(`${noStudentEndHour}:${minute}`)}
                    />
                  </div>
                </div>
                <div className="col-span-2 flex justify-center text-xs font-semibold text-primary">
                  <span>Thời lượng: {noStudentShiftHoursLabel}</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex gap-3 pt-4">
            <button className="btn btn-ghost flex-1" type="button" onClick={onClose}>
              Hủy
            </button>
            <button className="btn btn-primary flex-1" type="submit">
              {editingRowId ? "Cập nhật" : "Lưu lại"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default WorkRowModal;
