import { FormEvent } from "react";
import { DAY_NAMES } from "../../constants";
import { DayDefaultSettingGroup } from "../../types";
import TimeWheelInput from "../ui/TimeWheelInput";

const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

type DayDefaultSettingsModalProps = {
  isOpen: boolean;
  isFormOpen: boolean;
  groupedDayDefaultSettings: DayDefaultSettingGroup[];
  expandedSettingDays: Set<string>;
  editingSettingId: string | null;
  settingFormDayOfWeek: string;
  settingFormStartHour: string;
  settingFormStartMinute: string;
  settingFormEndHour: string;
  settingFormEndMinute: string;
  settingFormSlotLabel: string;
  onClose: () => void;
  onOpenAddSettingForm: () => void;
  onOpenEditSettingForm: (settingId: string) => void;
  onToggleSettingDay: (dayOfWeek: string) => void;
  onDeleteDefaultSetting: (settingId: string) => void;
  onSettingFormDayOfWeekChange: (value: string) => void;
  onSettingFormStartHourChange: (value: string) => void;
  onSettingFormStartMinuteChange: (value: string) => void;
  onSettingFormEndHourChange: (value: string) => void;
  onSettingFormEndMinuteChange: (value: string) => void;
  onCloseForm: () => void;
  onSubmitForm: (event: FormEvent<HTMLFormElement>) => void;
};

function DayDefaultSettingsModal({
  isOpen,
  isFormOpen,
  groupedDayDefaultSettings,
  expandedSettingDays,
  editingSettingId,
  settingFormDayOfWeek,
  settingFormStartHour,
  settingFormStartMinute,
  settingFormEndHour,
  settingFormEndMinute,
  settingFormSlotLabel,
  onClose,
  onOpenAddSettingForm,
  onOpenEditSettingForm,
  onToggleSettingDay,
  onDeleteDefaultSetting,
  onSettingFormDayOfWeekChange,
  onSettingFormStartHourChange,
  onSettingFormStartMinuteChange,
  onSettingFormEndHourChange,
  onSettingFormEndMinuteChange,
  onCloseForm,
  onSubmitForm
}: DayDefaultSettingsModalProps): JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[75] flex items-end justify-center bg-on-surface/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md rounded-t-[2rem] border-t border-white/20 bg-surface p-6 shadow-2xl sm:rounded-3xl">
        <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-surface-variant sm:hidden"></div>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-bold text-primary">Giờ mặc định theo thứ</h3>
          <button
            className="flex h-6 w-8 items-center justify-center rounded-full border border-outline-variant bg-white/75 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
            type="button"
            onClick={onClose}
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {!isFormOpen ? (
          <div className="space-y-4">
            <button
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-on-primary transition-all hover:bg-primary-container active:scale-95"
              type="button"
              onClick={onOpenAddSettingForm}
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
                        onClick={() => onToggleSettingDay(group.dayOfWeek)}
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
                                  className="inline-flex h-7 w-9 items-center justify-center rounded-lg border border-outline-variant bg-white/85 text-on-surface transition-colors hover:bg-surface-container hover:text-on-surface"
                                  type="button"
                                  onClick={() => onOpenEditSettingForm(setting.id)}
                                >
                                  <span className="material-symbols-outlined text-[18px] leading-none">edit</span>
                                </button>
                                <button
                                  aria-label="Xóa giờ mặc định"
                                  className="inline-flex h-7 w-9 items-center justify-center rounded-lg bg-primary text-on-primary"
                                  type="button"
                                  onClick={() => onDeleteDefaultSetting(setting.id)}
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
          <form className="space-y-4" onSubmit={onSubmitForm}>
            <div className="space-y-1.5">
              <label className="ml-1 text-[11px] font-bold uppercase text-on-surface-variant" htmlFor="settingFormDayOfWeek">
                Thứ
              </label>
              <select
                className="w-full rounded-xl border-none bg-surface-container-highest px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary/20"
                id="settingFormDayOfWeek"
                required
                value={settingFormDayOfWeek}
                onChange={(event) => onSettingFormDayOfWeekChange(event.target.value)}
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
              <div className="rounded-xl bg-surface-container-highest px-3 py-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="mb-1 block text-center text-sm font-semibold text-primary">Bắt đầu</span>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                      <TimeWheelInput
                        id="settingFormStartHourWheel"
                        value={settingFormStartHour}
                        onChange={(hour) => onSettingFormStartHourChange(hour)}
                      />
                      <span className="px-1 text-sm font-black text-on-surface-variant">:</span>
                      <TimeWheelInput
                        id="settingFormStartMinuteWheel"
                        value={settingFormStartMinute}
                        options={MINUTE_OPTIONS}
                        showArrows
                        onChange={(minute) => onSettingFormStartMinuteChange(minute)}
                      />
                    </div>
                  </div>

                  <div>
                    <span className="mb-1 block text-center text-sm font-semibold text-primary">Kết thúc</span>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                      <TimeWheelInput
                        id="settingFormEndHourWheel"
                        value={settingFormEndHour}
                        onChange={(hour) => onSettingFormEndHourChange(hour)}
                      />
                      <span className="px-1 text-sm font-black text-on-surface-variant">:</span>
                      <TimeWheelInput
                        id="settingFormEndMinuteWheel"
                        value={settingFormEndMinute}
                        options={MINUTE_OPTIONS}
                        showArrows
                        onChange={(minute) => onSettingFormEndMinuteChange(minute)}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <p className="ml-1 text-[11px] text-on-surface-variant">Tổng giờ: {settingFormSlotLabel}</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                className="flex-1 rounded-2xl border border-outline-variant bg-white/85 py-3 font-semibold text-on-surface transition-all hover:bg-surface-container active:scale-95"
                type="button"
                onClick={onCloseForm}
              >
                Hủy
              </button>
              <button
                className="flex-1 rounded-2xl bg-primary py-3 font-semibold text-on-primary shadow-sm transition-all hover:bg-primary-container active:scale-95"
                type="submit"
              >
                {editingSettingId ? "Cập nhật" : "Lưu lại"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default DayDefaultSettingsModal;
