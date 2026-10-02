type PageHeaderProps = {
  title: string;
  showBackButton?: boolean;
  backAriaLabel?: string;
  onBack?: () => void;
  onOpenAI: () => void;
  onExport: () => void;
  onOpenSettings: () => void;
};

function PageHeader({ title, showBackButton = false, backAriaLabel = "Quay lại", onBack, onOpenAI, onExport, onOpenSettings }: PageHeaderProps): JSX.Element {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between bg-background/80 px-4 backdrop-blur-md">
      <div className="flex items-center gap-3">
        {showBackButton ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/40 bg-white/70 text-on-surface-variant transition-colors hover:bg-surface-container"
            aria-label={backAriaLabel}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        ) : null}
        <h1 className="text-lg font-extrabold text-primary">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          aria-label="Mở trợ lý AI"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary shadow-sm transition-colors hover:bg-primary/20"
          type="button"
          onClick={onOpenAI}
        >
          <span className="material-symbols-outlined">auto_awesome</span>
        </button>
        <button
          aria-label="Xuất Google Sheet"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/40 bg-white/70 text-on-surface-variant transition-colors hover:bg-surface-container"
          type="button"
          onClick={onExport}
        >
          <span className="material-symbols-outlined">ios_share</span>
        </button>
        <button
          aria-label="Mở cài đặt giờ mặc định"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/40 bg-white/70 text-on-surface-variant transition-colors hover:bg-surface-container"
          type="button"
          onClick={onOpenSettings}
        >
          <span className="material-symbols-outlined">settings</span>
        </button>
      </div>
    </header>
  );
}

export default PageHeader;
