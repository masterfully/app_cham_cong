import { useState } from "react";
import { getCurrentYearMonth } from "../utils/date";

export interface ExportWorkflowState {
  exportMonthValue: string;
  pendingExportMonthValue: string | null;
  exportPublicUrl: string;
  isExporting: boolean;
}

export interface UseExportWorkflowReturn extends ExportWorkflowState {
  setExportMonthValue: (value: string) => void;
  setPendingExportMonthValue: (value: string | null) => void;
  setExportPublicUrl: (value: string) => void;
  setIsExporting: (value: boolean) => void;
  resetExport: () => void;
}

export function useExportWorkflow(): UseExportWorkflowReturn {
  const [exportMonthValue, setExportMonthValue] = useState(getCurrentYearMonth());
  const [pendingExportMonthValue, setPendingExportMonthValue] = useState<string | null>(null);
  const [exportPublicUrl, setExportPublicUrl] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  function resetExport(): void {
    setExportMonthValue(getCurrentYearMonth());
    setPendingExportMonthValue(null);
    setExportPublicUrl("");
    setIsExporting(false);
  }

  return {
    exportMonthValue,
    pendingExportMonthValue,
    exportPublicUrl,
    isExporting,
    setExportMonthValue,
    setPendingExportMonthValue,
    setExportPublicUrl,
    setIsExporting,
    resetExport
  };
}
