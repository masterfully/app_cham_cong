import { formatDate } from "../../utils/date";

type CheckedDaySummary = {
  date: string;
  dayOfWeek: string;
  shiftCount: number;
  totalHoursLabel: string;
};

type DeleteCheckedRowsConfirmModalProps = {
  isOpen: boolean;
  summary: {
    totalDays: number;
    totalShifts: number;
    totalHoursLabel: string;
    days: CheckedDaySummary[];
  } | null;
  onClose: () => void;
  onConfirm: () => void;
};

function DeleteCheckedRowsConfirmModal({ isOpen, summary, onClose, onConfirm }: DeleteCheckedRowsConfirmModalProps): JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[77] flex items-end justify-center bg-on-surface/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-sm rounded-t-[2rem] border-t border-white/20 bg-surface p-6 shadow-2xl sm:rounded-3xl">
        <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-surface-variant sm:hidden"></div>
        <h3 className="mb-2 text-lg font-bold text-on-surface">Xóa dòng đã chọn</h3>
        <p className="mb-3 text-sm text-on-surface-variant">Bạn có chắc muốn xóa các dòng đang được chọn không?</p>

        {summary ? (
          <div className="mb-6 space-y-2 rounded-xl border border-outline-variant/50 bg-surface-container-low px-3 py-3 text-sm">
            <p>
              <span className="font-semibold text-on-surface-variant">Số ngày:</span> {summary.totalDays}
            </p>
            <p>
              <span className="font-semibold text-on-surface-variant">Số ca:</span> {summary.totalShifts}
            </p>
            <p>
              <span className="font-semibold text-on-surface-variant">Tổng giờ:</span> {summary.totalHoursLabel}
            </p>

            <div className="max-h-44 space-y-1 overflow-y-auto pt-2">
              {summary.days.map((day) => (
                <div className="rounded-lg bg-white/75 px-2 py-2 text-xs text-on-surface-variant" key={day.date}>
                  <p className="font-semibold text-on-surface">
                    {day.dayOfWeek} - {formatDate(day.date)}
                  </p>
                  <p>
                    {day.shiftCount} ca · {day.totalHoursLabel}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex gap-3">
          <button
            className="flex-1 rounded-2xl border border-[#d5dde0] bg-white/85 py-3 font-semibold text-[#3f484b] transition-all hover:bg-[#f1f4f5] active:scale-95"
            type="button"
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            className="flex-1 rounded-2xl border border-[#efc6c6] bg-[#fce8e8] py-3 font-semibold text-[#a63737] transition-all hover:bg-[#f9dede] active:scale-95"
            type="button"
            onClick={onConfirm}
          >
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteCheckedRowsConfirmModal;