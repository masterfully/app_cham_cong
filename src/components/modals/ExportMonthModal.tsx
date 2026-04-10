type ExportMonthModalProps = {
  isOpen: boolean;
  monthValue: string;
  onMonthChange: (value: string) => void;
  onCancel: () => void;
  onContinue: () => void;
};

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1).padStart(2, "0"),
  label: `Tháng ${index + 1}`
}));

function ExportMonthModal({ isOpen, monthValue, onMonthChange, onCancel, onContinue }: ExportMonthModalProps): JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  const [yearPart, monthPart] = monthValue.split("-");
  const currentYear = new Date().getFullYear();
  const parsedYear = Number(yearPart);
  const selectedYear = Number.isInteger(parsedYear) ? parsedYear : currentYear;
  const selectedMonth = /^\d{2}$/.test(monthPart ?? "") ? monthPart : "01";
  const yearOptions = Array.from({ length: 11 }, (_, offset) => currentYear - 5 + offset);

  const handleYearChange = (nextYear: string): void => {
    onMonthChange(`${nextYear}-${selectedMonth}`);
  };

  const handleMonthChange = (nextMonth: string): void => {
    onMonthChange(`${String(selectedYear)}-${nextMonth}`);
  };

  return (
    <div
      className="fixed inset-0 z-[78] flex items-end justify-center bg-on-surface/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div className="w-full max-w-sm rounded-t-[2rem] border-t border-white/20 bg-surface p-6 shadow-2xl sm:rounded-3xl">
        <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-surface-variant sm:hidden"></div>
        <h3 className="mb-2 text-lg font-bold text-on-surface">Chọn tháng xuất file</h3>
        <p className="mb-4 text-sm text-on-surface-variant">Chọn tháng bạn muốn xuất sang Google Sheet.</p>
        <div className="mb-6 space-y-1.5">
          <label className="ml-1 text-[11px] font-bold uppercase text-on-surface-variant" htmlFor="exportMonthInput">
            Tháng xuất
          </label>
          <div className="grid grid-cols-2 gap-2">
            <select
              className="w-full rounded-xl border-none bg-surface-container-highest px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary/20"
              id="exportMonthInput"
              value={selectedMonth}
              onChange={(event) => handleMonthChange(event.target.value)}
            >
              {MONTH_OPTIONS.map((monthOption) => (
                <option key={monthOption.value} value={monthOption.value}>
                  {monthOption.label}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded-xl border-none bg-surface-container-highest px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary/20"
              value={String(selectedYear)}
              onChange={(event) => handleYearChange(event.target.value)}
            >
              {yearOptions.map((yearOption) => (
                <option key={yearOption} value={yearOption}>
                  Năm {yearOption}
                </option>
              ))}
            </select>
          </div>
          <p className="ml-1 text-[11px] text-on-surface-variant">Đang chọn: Tháng {Number(selectedMonth)}/{selectedYear}</p>
        </div>
        <div className="flex gap-3">
          <button
            className="flex-1 rounded-2xl border border-[#d5dde0] bg-white/85 py-3 font-semibold text-[#3f484b] transition-all hover:bg-[#f1f4f5] active:scale-95"
            type="button"
            onClick={onCancel}
          >
            Hủy
          </button>
          <button
            className="flex-1 rounded-2xl border border-[#9ec7cf] bg-[#e7f4f7] py-3 font-semibold text-[#0f5d6b] shadow-sm transition-all hover:bg-[#dff0f4] active:scale-95"
            type="button"
            onClick={onContinue}
          >
            Tiếp tục
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportMonthModal;
