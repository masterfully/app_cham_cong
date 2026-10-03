import { ExportSheetDailyRow } from "../types";

const escapeXml = (value: string): string => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&apos;");

export function buildExportTableImage(rows: ExportSheetDailyRow[]): string {
  const widths = [92, 136, 136, 242, 166];
  const headers = ["STT", "Thứ", "Ngày", "Ca", "Tổng số giờ"];
  const headerHeight = 38;
  const rowHeights = rows.map((row) => Math.max(40, row.shiftEntries.length * 24 + 16));
  const totalHeight = headerHeight + rowHeights.reduce((sum, height) => sum + height, 0) + 40;
  const width = widths.reduce((sum, item) => sum + item, 0);
  const totalHours = rows.reduce((sum, row) => sum + row.totalHours, 0);
  let y = headerHeight;
  const body: string[] = [];

  rows.forEach((row, index) => {
    const height = rowHeights[index];
    let x = 0;
      const values = [String(row.stt), row.dayOfWeek, row.dateDisplay, row.shifts, String(row.totalHours)];
    values.forEach((value, column) => {
      const cellWidth = widths[column];
      body.push(`<rect x="${x}" y="${y}" width="${cellWidth}" height="${height}" fill="#fff" stroke="#d1d5db"/>`);
      const lines = column === 3 ? row.shiftEntries.map((entry) => entry.value) : value.split("\n");
      const lineHeight = 24;
      const startY = y + (height - lines.length * lineHeight) / 2 + 18;
      lines.forEach((line, lineIndex) => {
        const isNoStudent = column === 3 && row.shiftEntries[lineIndex]?.isNoStudent;
        body.push(`<text x="${x + cellWidth / 2}" y="${startY + lineIndex * lineHeight}" text-anchor="middle" font-size="19" ${isNoStudent ? 'font-weight="700" fill="#dc2626"' : 'fill="#111827"'}>${escapeXml(line)}</text>`);
      });
      x += cellWidth;
    });
    y += height;
  });

  let x = 0;
  widths.forEach((cellWidth, column) => {
    body.push(`<rect x="${x}" y="${y}" width="${cellWidth}" height="40" fill="#f3f4f6" stroke="#d1d5db"/>`);
    if (column === 3) body.push(`<text x="${x + cellWidth / 2}" y="${y + 26}" text-anchor="middle" font-size="18" font-weight="700">Tổng giờ</text>`);
    if (column === 4) body.push(`<text x="${x + cellWidth / 2}" y="${y + 26}" text-anchor="middle" font-size="18" font-weight="700">${totalHours}</text>`);
    x += cellWidth;
  });

  let hx = 0;
  headers.forEach((header, index) => {
    body.push(`<rect x="${hx}" y="0" width="${widths[index]}" height="${headerHeight}" fill="#d9edf7" stroke="#b8cbd5"/>`);
    body.push(`<text x="${hx + widths[index] / 2}" y="26" text-anchor="middle" font-size="18" font-weight="700">${escapeXml(header)}</text>`);
    hx += widths[index];
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}" viewBox="0 0 ${width} ${totalHeight}"><rect width="100%" height="100%" fill="#fff"/><g font-family="Arial, sans-serif">${body.join("")}</g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function convertImageToPng(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth * scale;
      canvas.height = image.naturalHeight * scale;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Không thể tạo ảnh PNG."));
        return;
      }
      context.scale(scale, scale);
      context.drawImage(image, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => reject(new Error("Không thể chuyển bảng chấm công sang PNG."));
    image.src = imageUrl;
  });
}
