type BottomSummaryBarProps = {
  title: string;
  totalHoursLabel: string;
  selectedCount: number;
  onNavigate: () => void;
  navigateAriaLabel: string;
  navigateIcon: "arrow_forward" | "arrow_back";
};

function BottomSummaryBar({ title, totalHoursLabel, selectedCount, onNavigate, navigateAriaLabel, navigateIcon }: BottomSummaryBarProps): JSX.Element {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
      <div className="mx-auto max-w-lg rounded-2xl border border-primary/20 bg-gradient-to-r from-primary to-primary-container p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-on-primary/70">{title}</p>
            <p className="text-2xl font-black text-on-primary">
              {totalHoursLabel}
              <span className="text-sm font-normal opacity-80"> giờ</span>
            </p>
            <p className="mt-1 text-xs text-on-primary/80">{selectedCount} dòng được chọn</p>
          </div>
          <button
            type="button"
            onClick={onNavigate}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
            aria-label={navigateAriaLabel}
          >
            <span className="material-symbols-outlined text-on-primary">{navigateIcon}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default BottomSummaryBar;
