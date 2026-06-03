type MonthPickerModalProps = {
  isOpen: boolean;
  monthOptions: string[];
  selectedMonth: string | null;
  onSelectMonth: (monthValue: string) => void;
  onClose: () => void;
};

function formatMonthOption(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return value;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  return `Tháng ${month}/${year}`;
}

function MonthPickerModal({ isOpen, monthOptions, selectedMonth, onSelectMonth, onClose }: MonthPickerModalProps): JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[78] flex items-end justify-center bg-on-surface/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-sm rounded-t-[2rem] border-t border-white/20 bg-surface p-6 shadow-2xl sm:rounded-3xl">
        <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-surface-variant sm:hidden"></div>
        <h3 className="mb-2 text-lg font-bold text-on-surface">Chọn tháng có dữ liệu</h3>
        <p className="mb-4 text-sm text-on-surface-variant">Chỉ hiển thị những tháng đã có dòng chấm công trong trang hiện tại.</p>

        {monthOptions.length > 0 ? (
          <div className="grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto pr-1">
            {monthOptions.map((monthValue) => {
              const isActive = selectedMonth === monthValue;
              return (
                <button
                  key={monthValue}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all active:scale-[0.99] ${
                    isActive
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-outline-variant/30 bg-surface-container-highest text-on-surface hover:bg-surface-container"
                  }`}
                  type="button"
                  onClick={() => {
                    onSelectMonth(monthValue);
                    onClose();
                  }}
                >
                  {formatMonthOption(monthValue)}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-4 text-sm text-on-surface-variant">
            Không có dữ liệu để chọn theo tháng.
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button className="btn btn-ghost flex-1" type="button" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

export default MonthPickerModal;