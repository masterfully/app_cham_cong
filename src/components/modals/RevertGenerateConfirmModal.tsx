type RevertGenerateConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

function RevertGenerateConfirmModal({ isOpen, onClose, onConfirm }: RevertGenerateConfirmModalProps): JSX.Element | null {
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
        <h3 className="mb-2 text-lg font-bold text-on-surface">Hoàn tác tự động tạo</h3>
        <p className="mb-3 text-sm text-on-surface-variant">
          Bạn có chắc muốn xóa các dòng vừa được tạo tự động cho tháng hiện tại chưa được chọn không? Những dòng đã được chọn sẽ được giữ lại.
        </p>

        <div className="flex gap-3">
          <button className="btn btn-ghost flex-1" type="button" onClick={onClose}>
            Hủy
          </button>
          <button className="btn btn-primary flex-1" type="button" onClick={onConfirm}>
            Hoàn tác
          </button>
        </div>
      </div>
    </div>
  );
}

export default RevertGenerateConfirmModal;