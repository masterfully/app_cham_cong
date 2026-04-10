import { ExportSheetDailyRow, WorkRow } from "../types";
import { formatDate, getDayNameFromDate } from "./date";
import { parseSlotRangeInMinutes } from "./time";

const EXPORT_SHEET_WEBHOOK_URL = String(import.meta.env.VITE_EXPORT_SHEET_WEBHOOK_URL ?? "").trim();

export function buildExportSheetRowsForMonth(rows: WorkRow[], year: number, month: number): ExportSheetDailyRow[] {
  const monthPrefix = `${year}-${String(month).padStart(2, "0")}-`;
  const monthRows = rows.filter((row) => row.date.startsWith(monthPrefix));
  const groupByDate = new Map<string, WorkRow[]>();

  monthRows.forEach((row) => {
    const rowsForDate = groupByDate.get(row.date);
    if (rowsForDate) {
      rowsForDate.push(row);
    } else {
      groupByDate.set(row.date, [row]);
    }
  });

  return Array.from(groupByDate.entries())
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([date, rowsForDate], index) => {
      const sortedRows = [...rowsForDate].sort((left, right) => {
        const leftRange = parseSlotRangeInMinutes(left.slot);
        const rightRange = parseSlotRangeInMinutes(right.slot);
        if (!leftRange || !rightRange) {
          return left.slot.localeCompare(right.slot);
        }
        return leftRange.start - rightRange.start;
      });

      const totalHours = sortedRows.reduce((sum, row) => sum + row.hours, 0);

      return {
        stt: index + 1,
        dayOfWeek: sortedRows[0]?.dayOfWeek ?? getDayNameFromDate(date),
        dateDisplay: formatDate(date),
        shifts: sortedRows.map((row) => row.slot).join("\n"),
        totalHours: Number(totalHours.toFixed(2))
      };
    });
}

export async function createGoogleSheetExport(params: {
  year: number;
  month: number;
  fileName: string;
  rows: ExportSheetDailyRow[];
}): Promise<string> {
  if (!EXPORT_SHEET_WEBHOOK_URL) {
    throw new Error("Chưa cấu hình VITE_EXPORT_SHEET_WEBHOOK_URL để tạo Google Sheet.");
  }

  const payload = {
    fileName: params.fileName,
    month: params.month,
    year: params.year,
    columns: ["STT", "Thứ", "Ngày", "Ca", "Tổng số giờ"],
    rows: params.rows,
    permissions: {
      anyoneCanView: true,
      ownerCanEditOnly: true
    }
  };

  const response = await fetch(EXPORT_SHEET_WEBHOOK_URL, {
    method: "POST",
    headers: {
      // Use a simple content type to avoid CORS preflight issues with Apps Script web app.
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Tạo Google Sheet thất bại (${response.status}).`);
  }

  const responseText = await response.text();
  let data: { publicUrl?: string; url?: string } = {};

  try {
    data = JSON.parse(responseText) as { publicUrl?: string; url?: string };
  } catch {
    data = {};
  }

  const publicUrl = typeof data.publicUrl === "string" ? data.publicUrl : typeof data.url === "string" ? data.url : "";

  if (!publicUrl) {
    throw new Error("Không nhận được URL public từ dịch vụ xuất file.");
  }

  return publicUrl;
}
