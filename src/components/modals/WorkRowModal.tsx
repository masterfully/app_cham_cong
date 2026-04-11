import { FormEvent } from "react";
import { formatDateWithYear, getDayNameFromDate } from "../../utils/date";
import { DayDefaultSetting } from "../../types";

type WorkRowModalProps = {
  isOpen: boolean;
  editingRowId: string | null;
  formMode: "default" | "custom";
  formDate: string;
  formStartHour: string;
  formStartMinute: string;
  formEndHour: string;
  formEndMinute: string;
  formHoursLabel: string;
  dayDefaultSettingsForFormDay: DayDefaultSetting[];
  selectedDefaultSettingIndices: Set<number>;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onModeChange: (mode: "default" | "custom") => void;
  onDateChange: (value: string) => void;
  onStartHourChange: (value: string) => void;
  onStartMinuteChange: (value: string) => void;
  onEndHourChange: (value: string) => void;
  onEndMinuteChange: (value: string) => void;
  onToggleDefaultSettingIndex: (index: number) => void;
  onToggleAllDefaultSettings: () => void;
};

function WorkRowModal({
  isOpen,
  editingRowId,
  formMode,
  formDate,
  formStartHour,
  formStartMinute,
  formEndHour,
  formEndMinute,
  formHoursLabel,
  dayDefaultSettingsForFormDay,
  selectedDefaultSettingIndices,
  onClose,
  onSubmit,
  onModeChange,
  onDateChange,
  onStartHourChange,
  onStartMinuteChange,
  onEndHourChange,
  onEndMinuteChange,
  onToggleDefaultSettingIndex,
  onToggleAllDefaultSettings
}: WorkRowModalProps): JSX.Element | null {
  if (!isOpen) {
    return null;
  }
  const hasDefaultSettings = dayDefaultSettingsForFormDay.length > 0;
  const isDefaultMode = formMode === "default" && !editingRowId;
  const isCustomMode = formMode === "custom" || Boolean(editingRowId);
  const dayNumber = formDate ? getDayNameFromDate(formDate).replace(/^T/, "") : "--";

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
          <h3 className="text-xl font-bold text-primary">{editingRowId ? "Chỉnh sửa dòng" : "Thêm dòng mới"}</h3>
          <button
            className="flex h-6 w-8 items-center justify-center rounded-full border border-[#d5dde0] bg-white/75 text-[#5b6669] transition-colors hover:bg-[#e8f4f7] hover:text-[#0f5d6b]"
            type="button"
            onClick={onClose}
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        <form className="space-y-5" onSubmit={onSubmit}>
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
                onChange={(event) => onDateChange(event.target.value)}
              />
              <div className="flex w-full items-center justify-between gap-3 rounded-xl bg-surface-container-highest px-4 py-3 text-on-surface">
                <div className="min-w-0 flex-1">
                  <span className="block truncate">{formatDateWithYear(formDate)}</span>
                  <span className="block truncate">Thứ {dayNumber}</span>
                </div>
                <span className="material-symbols-outlined text-base text-on-surface-variant">calendar_month</span>
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
                <div className="mt-1.5 grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-center gap-2 rounded-xl bg-surface-container-highest px-3 py-3">
                  <input
                    className="w-full rounded-lg border-none bg-white/80 px-2 py-2 text-center text-on-surface focus:ring-2 focus:ring-primary/20"
                    id="formStartHour"
                    inputMode="numeric"
                    placeholder="HH"
                    value={formStartHour}
                    onChange={(event) => onStartHourChange(event.target.value)}
                  />
                  <span className="text-sm font-bold text-on-surface-variant">:</span>
                  <input
                    className="w-full rounded-lg border-none bg-white/80 px-2 py-2 text-center text-on-surface focus:ring-2 focus:ring-primary/20"
                    inputMode="numeric"
                    placeholder="MM"
                    value={formStartMinute}
                    onChange={(event) => onStartMinuteChange(event.target.value)}
                  />
                  <span className="px-1 text-sm font-black text-on-surface-variant">-</span>
                  <input
                    className="w-full rounded-lg border-none bg-white/80 px-2 py-2 text-center text-on-surface focus:ring-2 focus:ring-primary/20"
                    inputMode="numeric"
                    placeholder="HH"
                    value={formEndHour}
                    onChange={(event) => onEndHourChange(event.target.value)}
                  />
                  <span className="text-sm font-bold text-on-surface-variant">:</span>
                  <input
                    className="w-full rounded-lg border-none bg-white/80 px-2 py-2 text-center text-on-surface focus:ring-2 focus:ring-primary/20"
                    inputMode="numeric"
                    placeholder="MM"
                    value={formEndMinute}
                    onChange={(event) => onEndMinuteChange(event.target.value)}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label className="ml-1 text-[11px] font-bold uppercase text-on-surface-variant" htmlFor="formHours">
              Tổng giờ của ngày
            </label>
            <input
              className="w-full rounded-xl border-none bg-surface-container-highest px-4 py-3 text-on-surface-variant"
              id="formHours"
              readOnly
              type="text"
              value={formHoursLabel}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              className="flex-1 rounded-2xl border border-[#d5dde0] bg-white/85 py-4 font-semibold text-[#3f484b] transition-all hover:bg-[#f1f4f5] active:scale-95"
              type="button"
              onClick={onClose}
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
  );
}

export default WorkRowModal;
