type ExportSummary = {
  totalDays: number;
  totalShifts: number;
  totalHoursLabel: string;
};

type ExportConfirmModalProps = {
  isOpen: boolean;
  isExporting: boolean;
  monthLabel: string;
  summary: ExportSummary | null;
  onCancel: () => void;
  onConfirm: () => void;
};

function ExportConfirmModal({ isOpen, isExporting, monthLabel, summary, onCancel, onConfirm }: ExportConfirmModalProps): JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[79] flex items-end justify-center bg-on-surface/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isExporting) {
          onCancel();
        }
      }}
    >
      <div className="w-full max-w-sm rounded-t-[2rem] border-t border-white/20 bg-surface p-6 shadow-2xl sm:rounded-3xl">
        <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-surface-variant sm:hidden"></div>
        <h3 className="mb-2 text-lg font-bold text-on-surface">Xác nhận xuất file</h3>
        <p className="mb-3 text-sm text-on-surface-variant">Bạn có chắc muốn xuất {monthLabel} sang Google Sheet không?</p>
        {summary ? (
          <div className="mb-6 space-y-1 rounded-xl border border-outline-variant/50 bg-surface-container-low px-3 py-3 text-sm">
            <p>
              <span className="font-semibold text-on-surface-variant">Số ngày:</span> {summary.totalDays}
            </p>
            <p>
              <span className="font-semibold text-on-surface-variant">Số ca:</span> {summary.totalShifts}
            </p>
            <p>
              <span className="font-semibold text-on-surface-variant">Tổng giờ:</span> {summary.totalHoursLabel}
            </p>
          </div>
        ) : null}
        <div className="flex gap-3">
          <button
            className="flex-1 rounded-2xl border border-[#d5dde0] bg-white/85 py-3 font-semibold text-[#3f484b] transition-all hover:bg-[#f1f4f5] active:scale-95 disabled:opacity-60"
            disabled={isExporting}
            type="button"
            onClick={onCancel}
          >
            Hủy
          </button>
          <button
            className="flex-1 rounded-2xl border border-[#9ec7cf] bg-[#e7f4f7] py-3 font-semibold text-[#0f5d6b] shadow-sm transition-all hover:bg-[#dff0f4] active:scale-95 disabled:opacity-60"
            disabled={isExporting}
            type="button"
            onClick={onConfirm}
          >
            {isExporting ? "Đang xuất..." : "Xác nhận"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportConfirmModal;
