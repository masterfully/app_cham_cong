type ExportResultModalProps = {
  isOpen: boolean;
  publicUrl: string;
  onClose: () => void;
  onCopy: () => void;
};

function ExportResultModal({ isOpen, publicUrl, onClose, onCopy }: ExportResultModalProps): JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-on-surface/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-sm rounded-t-[2rem] border-t border-white/20 bg-surface p-6 shadow-2xl sm:rounded-3xl">
        <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-surface-variant sm:hidden"></div>
        <h3 className="mb-2 text-lg font-bold text-on-surface">Xuất file thành công</h3>
        <p className="mb-4 text-sm text-on-surface-variant">Sao chép URL public để chia sẻ cho mọi người xem online.</p>
        <div className="mb-6 space-y-2">
          <label className="ml-1 text-[11px] font-bold uppercase text-on-surface-variant" htmlFor="exportPublicUrl">
            URL public
          </label>
          <input
            className="w-full rounded-xl border-none bg-surface-container-highest px-4 py-3 text-sm text-on-surface"
            id="exportPublicUrl"
            readOnly
            type="text"
            value={publicUrl}
          />
        </div>
        <div className="flex gap-3">
          <button
            className="flex-1 rounded-2xl border border-[#d5dde0] bg-white/85 py-3 font-semibold text-[#3f484b] transition-all hover:bg-[#f1f4f5] active:scale-95"
            type="button"
            onClick={onClose}
          >
            Đóng
          </button>
          <button
            className="flex-1 rounded-2xl border border-[#9ec7cf] bg-[#e7f4f7] py-3 font-semibold text-[#0f5d6b] shadow-sm transition-all hover:bg-[#dff0f4] active:scale-95"
            type="button"
            onClick={onCopy}
          >
            Sao chép
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportResultModal;
