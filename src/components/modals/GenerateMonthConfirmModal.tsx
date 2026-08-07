type GenerateMonthConfirmModalProps = {
  isOpen: boolean;
  monthLabel: string;
  onClose: () => void;
  onConfirm: () => void;
};

function GenerateMonthConfirmModal({ isOpen, monthLabel, onClose, onConfirm }: GenerateMonthConfirmModalProps): JSX.Element | null {
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
      <div className="w-full max-w-sm rounded-t-[2rem] border-t border-white/20 bg-surface p-6 shadow-2xl sm:rounded-3xl">
        <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-surface-variant sm:hidden"></div>
        <h3 className="mb-2 text-lg font-bold text-on-surface">Tự động tạo dữ liệu cho tháng</h3>
        <p className="mb-3 text-sm text-on-surface-variant">
          Bạn có chắc muốn tự động tạo toàn bộ dòng cho <span className="font-semibold text-primary">{monthLabel}</span> theo giờ mặc
          định không?
        </p>

        <div className="flex gap-3">
          <button className="btn btn-ghost flex-1" type="button" onClick={onClose}>
            Hủy
          </button>
          <button className="btn btn-primary flex-1" type="button" onClick={onConfirm}>
            Tạo ngay
          </button>
        </div>
      </div>
    </div>
  );
}

export default GenerateMonthConfirmModal;