type ExportResultModalProps = {
  isOpen: boolean;
  publicUrl: string;
  imageUrl: string;
  imagePngUrl: string;
  onClose: () => void;
  onCopy: () => void;
};

function ExportResultModal({ isOpen, publicUrl, imageUrl, imagePngUrl, onClose, onCopy }: ExportResultModalProps): JSX.Element | null {
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
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-t-[2rem] border-t border-white/20 bg-surface p-6 shadow-2xl sm:rounded-3xl">
        <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-surface-variant sm:hidden"></div>
        <h3 className="mb-2 text-lg font-bold text-on-surface">Xuất file thành công</h3>
        <p className="mb-4 text-sm text-on-surface-variant">Ảnh bảng chấm công và URL Google Sheet đã sẵn sàng.</p>
        {imageUrl && (
          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-on-surface">Ảnh bảng chấm công</span>
              <a className="btn btn-ghost export-image-download text-xs" href={imagePngUrl} download="bang-cham-cong.png">Tải ảnh</a>
            </div>
            <div className="max-h-80 overflow-auto rounded-xl border border-outline-variant bg-white">
              <img className="h-auto w-full" src={imageUrl} alt="Bảng chấm công đã xuất" />
            </div>
          </div>
        )}
        <div className="mb-6 space-y-2">
          <label className="ml-1 text-[11px] font-bold uppercase text-on-surface-variant" htmlFor="exportPublicUrl">
            Đường dẫn Google Sheet
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
          <button className="btn btn-ghost flex-1" type="button" onClick={onClose}>
            Đóng
          </button>
          <button className="btn btn-primary flex-1" type="button" onClick={onCopy}>
            Sao chép
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportResultModal;
