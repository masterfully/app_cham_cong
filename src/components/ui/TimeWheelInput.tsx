import { useEffect, useMemo, useRef } from "react";

type TimeWheelInputProps = {
  id: string;
  value: string;
  options?: string[];
  onChange: (value: string) => void;
};

const DEFAULT_OPTIONS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const ITEM_HEIGHT = 40;

function normalizeValue(value: string, options: string[]): string {
  if (options.includes(value)) {
    return value;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return options[0] ?? "";
  }

  const normalized = String(parsed).padStart(2, "0");
  return options.includes(normalized) ? normalized : (options[0] ?? normalized);
}

function TimeWheelInput({ id, value, options = DEFAULT_OPTIONS, onChange }: TimeWheelInputProps): JSX.Element {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const selectedValue = useMemo(() => normalizeValue(value, options), [value, options]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    const selectedIndex = options.indexOf(selectedValue);
    if (selectedIndex < 0) {
      return;
    }

    const topPadding = container.clientHeight / 2 - ITEM_HEIGHT / 2;
    container.scrollTo({ top: selectedIndex * ITEM_HEIGHT - topPadding, behavior: "auto" });
  }, [selectedValue, options]);

  const updateFromScroll = (): void => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    const centerPosition = container.scrollTop + container.clientHeight / 2;
    const selectedIndex = Math.min(
      options.length - 1,
      Math.max(0, Math.round((centerPosition - ITEM_HEIGHT / 2) / ITEM_HEIGHT))
    );
    const nextValue = options[selectedIndex];

    if (nextValue !== selectedValue) {
      onChange(nextValue);
    }
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-outline-variant/30 bg-white/80 shadow-inner">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-white/90 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-white/90 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-10 -translate-y-1/2 rounded-md border-y border-primary/25 bg-primary/10 shadow-[0_0_0_1px_rgba(214,51,132,0.06)]" />
      <div
        ref={scrollRef}
        className="no-scrollbar h-56 overflow-y-auto py-[108px] snap-y snap-mandatory touch-pan-y"
        id={id}
        onScroll={updateFromScroll}
      >
        {options.map((option) => {
          const isActive = option === selectedValue;
          return (
            <button
              key={option}
              className={`flex h-10 w-full snap-center items-center justify-center rounded-md transition-all ${
                isActive ? "scale-105 text-[17px] font-bold text-primary" : "text-[15px] text-on-surface-variant"
              }`}
              type="button"
              onClick={() => onChange(option)}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default TimeWheelInput;