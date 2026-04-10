import { WorkRow } from "../../types";
import { formatDate } from "../../utils/date";
import { formatHoursAsHourMinute } from "../../utils/time";

type DeleteRowConfirmModalProps = {
  isOpen: boolean;
  row: WorkRow | null;
  onClose: () => void;
  onConfirm: () => void;
};

function DeleteRowConfirmModal({ isOpen, row, onClose, onConfirm }: DeleteRowConfirmModalProps): JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-on-surface/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-sm rounded-t-[2rem] border-t border-white/20 bg-surface p-6 shadow-2xl sm:rounded-3xl">
        <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-surface-variant sm:hidden"></div>
        <h3 className="mb-2 text-lg font-bold text-on-surface">Xác nhận xóa</h3>
        <p className="mb-3 text-sm text-on-surface-variant">Bạn có chắc muốn xóa dòng chấm công này không?</p>
        {row ? (
          <div className="mb-6 space-y-1 rounded-xl border border-outline-variant/50 bg-surface-container-low px-3 py-3 text-sm">
            <p>
              <span className="font-semibold text-on-surface-variant">Thứ:</span> {row.dayOfWeek}
            </p>
            <p>
              <span className="font-semibold text-on-surface-variant">Ngày:</span> {formatDate(row.date)}
            </p>
            <p>
              <span className="font-semibold text-on-surface-variant">Giờ làm:</span> {row.slot}
            </p>
            <p>
              <span className="font-semibold text-on-surface-variant">Tổng giờ:</span> {formatHoursAsHourMinute(row.hours)}
            </p>
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

export default DeleteRowConfirmModal;
