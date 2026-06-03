import { WorkRowGroup } from "../types";
import { formatDate } from "../utils/date";
import { formatHoursAsHourMinute } from "../utils/time";
import { renderSlotDisplay } from "../utils/uiHelpers";
import { FILTERS } from "../constants";

interface PageContentSectionProps {
  title: string;
  slotLabel: string; // "Giờ làm" or "Giờ dạy"
  groupedVisibleRows: WorkRowGroup[];
  expandedDates: Set<string>;
  visibleRowsCount: number;
  activeFilter: "all" | "today" | "this_week" | "this_month";
  onToggleGroup: (date: string) => void;
  onToggleRow: (rowId: string, checked: boolean) => void;
  onCheckAllInGroup: (date: string, checked: boolean) => void;
  onEditRow: (rowId: string) => void;
  onDeleteRow: (rowId: string) => void;
  onDeleteDay: (date: string) => void;
  onFilterChange: (filter: "all" | "today" | "this_week" | "this_month") => void;
  onAddRow: () => void;
  onDeleteCheckedRows: () => void;
  selectedRowsCount: number;
}

export default function PageContentSection({
  title,
  slotLabel,
  groupedVisibleRows,
  expandedDates,
  visibleRowsCount,
  activeFilter,
  onToggleGroup,
  onToggleRow,
  onCheckAllInGroup,
  onEditRow,
  onDeleteRow,
  onDeleteDay,
  onFilterChange,
  onAddRow,
  onDeleteCheckedRows,
  selectedRowsCount
}: PageContentSectionProps): JSX.Element {
  return (
    <main className="mx-auto max-w-lg px-4 pb-44 pt-20">
      <section className="mb-6 space-y-4">
        {/* Search removed per request */}

        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {FILTERS.map((filter) => {
            const isActive = activeFilter === filter.key;
            return (
              <button
                key={filter.key}
                    className={`flex-none rounded-full px-4 py-2 text-sm transition-all active:scale-95 ${
                      isActive
                        ? "border border-[#f3a6d1] bg-[#fff1f7] font-semibold text-[#7b0b4f] shadow-sm"
                        : "border border-[#f0c7d9] bg-[#fff7fb] font-medium text-[#6b4b5b] hover:bg-[#fff0f6]"
                    }`}
                type="button"
                onClick={() => onFilterChange(filter.key as any)}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <button className="btn btn-primary flex-1" type="button" onClick={onAddRow}>
            <span className="material-symbols-outlined mr-1 align-middle">add</span>
            <span className="align-middle">Thêm dòng mới</span>
          </button>
          <button className="btn btn-ghost btn-icon" type="button" disabled={selectedRowsCount === 0} onClick={onDeleteCheckedRows} aria-label="Xóa đã chọn">
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="mb-2 flex items-center justify-between px-2">
          <h2 className="text-xs font-black uppercase tracking-wider text-outline">{title}</h2>
          <span className="rounded-full bg-tertiary-fixed px-2 py-0.5 text-[10px] font-bold text-on-tertiary-fixed">
            {visibleRowsCount} dòng
          </span>
        </div>

        <div className="space-y-3">
          {groupedVisibleRows.map((group) => {
            const isExpanded = expandedDates.has(group.date);

            return (
              <div className="overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-low shadow-soft" key={group.date}>
                <div
                  className="cursor-pointer px-4 py-3 transition-colors hover:bg-surface-container"
                  onClick={() => onToggleGroup(group.date)}
                >
                  <div className="grid grid-cols-[repeat(12,minmax(0,1fr))] items-center gap-2">
                    <div className="col-span-1 flex justify-center">
                      <input
                        checked={group.checkedCount === group.shiftCount && group.shiftCount > 0}
                        className="rounded border-outline-variant text-primary focus:ring-primary"
                        type="checkbox"
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => {
                          event.stopPropagation();
                          onCheckAllInGroup(group.date, event.target.checked);
                        }}
                      />
                    </div>
                    <div className="col-span-4 min-w-0 text-sm font-black text-primary">
                      <span className="min-w-0 truncate">
                        {group.dayOfWeek} - {formatDate(group.date)}
                      </span>
                    </div>
                    <div className="col-span-3 flex justify-center">
                      <span className="rounded-full bg-tertiary-fixed px-2 py-0.5 text-[10px] font-bold text-on-tertiary-fixed">{group.shiftCount} ca</span>
                    </div>
                    <div className="col-span-2 text-right text-sm font-bold text-on-surface">{formatHoursAsHourMinute(group.totalHours)}</div>
                    <div className="col-span-1 flex justify-center">
                      <button
                        aria-expanded={isExpanded}
                        className="inline-flex h-6 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleGroup(group.date);
                        }}
                      >
                        <span className={`material-symbols-outlined transition-transform ${isExpanded ? "rotate-180" : "rotate-0"}`}>
                          expand_more
                        </span>
                      </button>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button
                        aria-label="Xóa ngày"
                          className="inline-flex h-6 w-8 items-center justify-center rounded-lg bg-primary text-on-primary transition-colors hover:bg-primary-container"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteDay(group.date);
                        }}
                      >
                        <span className="material-symbols-outlined text-[18px] leading-none">delete</span>
                      </button>
                    </div>
                  </div>
                  <div className="mt-1 pl-9 text-[11px] font-medium text-on-surface-variant">{group.checkedCount}/{group.shiftCount} dòng đã chọn</div>
                </div>

                {isExpanded ? (
                  <div className="border-t border-outline-variant/15">
                    <div className="grid grid-cols-[repeat(11,minmax(0,1fr))] gap-2 bg-surface-container px-4 py-3 text-[10px] font-black uppercase tracking-tighter text-on-surface-variant">
                      <div className="col-span-1 text-center"></div>
                      <div className="col-span-1 text-center">Thứ</div>
                      <div className="col-span-2 text-center">Ngày</div>
                      <div className="col-span-2 text-center">{slotLabel}</div>
                      <div className="col-span-3 text-center">Tổng giờ</div>
                      <div className="col-span-1 text-center">Sửa</div>
                      <div className="col-span-1 text-center">Xóa</div>
                    </div>

                    <div className="divide-y divide-outline-variant/15">
                      {group.rows.map((row, index) => {
                        const zebraClass = index % 2 === 0 ? "bg-surface-container-lowest" : "bg-surface-container-low";
                        return (
                          <div className={`grid grid-cols-[repeat(11,minmax(0,1fr))] items-center gap-2 px-4 py-4 text-center ${zebraClass}`} key={row.id}>
                            <div className="col-span-1 flex justify-center">
                              <input
                                checked={row.checked}
                                className="rounded border-outline-variant text-primary focus:ring-primary"
                                type="checkbox"
                                onChange={(event) => onToggleRow(row.id, event.target.checked)}
                              />
                            </div>
                            <div className="col-span-1 text-center text-sm font-bold text-primary">{row.dayOfWeek}</div>
                            <div className="col-span-2 text-center text-xs text-on-surface-variant">{formatDate(row.date)}</div>
                            <div className="col-span-2 text-xs font-medium">{renderSlotDisplay(row.slot)}</div>
                            <div className="col-span-3 text-center text-sm font-bold">{formatHoursAsHourMinute(row.hours)}</div>
                            <div className="col-span-1 flex justify-center">
                              <button
                                aria-label="Sửa dòng"
                                className="inline-flex h-6 w-8 items-center justify-center rounded-lg border border-outline-variant bg-white/85 text-on-surface transition-colors hover:bg-surface-container"
                                type="button"
                                onClick={() => onEditRow(row.id)}
                              >
                                <span className="material-symbols-outlined text-[18px] leading-none">edit</span>
                              </button>
                            </div>
                            <div className="col-span-1 flex justify-center">
                              <button
                                aria-label="Xóa dòng"
                                className="inline-flex h-6 w-8 items-center justify-center rounded-lg bg-primary text-on-primary"
                                type="button"
                                onClick={() => onDeleteRow(row.id)}
                              >
                                <span className="material-symbols-outlined text-[18px] leading-none">delete</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {visibleRowsCount === 0 ? (
          <p className="rounded-xl bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
            Không có dòng nào phù hợp với bộ lọc hiện tại.
          </p>
        ) : null}
      </section>
    </main>
  );
}
