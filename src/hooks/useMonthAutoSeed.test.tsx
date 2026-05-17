import { useState } from "react";
import { render, waitFor } from "@testing-library/react";
import { test, expect } from "vitest";

// navigator available on window from jsdom
import useMonthAutoSeed from "./useMonthAutoSeed";
import type { WorkRow, DayDefaultSetting } from "../types";

function Host(props: { initialRows?: WorkRow[]; dayDefaults?: DayDefaultSetting[]; goldDefaults?: DayDefaultSetting[]; showToast?: (m: string) => void; force?: boolean }) {
  const [rows, setRows] = useState<WorkRow[]>(props.initialRows ?? []);
  const [goldRows, setGoldRows] = useState<WorkRow[]>([]);
  useMonthAutoSeed({ rows, setRows, dayDefaultSettings: props.dayDefaults ?? [], goldRows, setGoldRows, goldDayDefaultSettings: props.goldDefaults ?? [], showToast: props.showToast ?? (() => {}), forceSeedMonth: props.force ?? false });
  return (
    <div>
      <span data-testid="main-count">{rows.length}</span>
      <span data-testid="gold-count">{goldRows.length}</span>
    </div>
  );
}

test("seeds month when system date is first of month", async () => {
  const { getByTestId } = render(<Host force={true} />);

  await waitFor(() => {
    const txt = getByTestId("main-count").textContent ?? "0";
    const mainCount = Number(txt);
    expect(mainCount).toBeGreaterThan(0);
  });
});
