import { useState } from "react";

export interface ModalState {
  isModalOpen: boolean;
  isSettingsModalOpen: boolean;
  isDeleteCheckedRowsModalOpen: boolean;
  isExportMonthModalOpen: boolean;
  isExportConfirmModalOpen: boolean;
  isExportResultModalOpen: boolean;
  pendingDeleteRowId: string | null;
  pendingDeleteDayDate: string | null;
  pendingDeleteSettingId: string | null;
}

export interface UseModalStateReturn extends ModalState {
  openModal: () => void;
  closeModal: () => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  openDeleteConfirm: (rowId: string) => void;
  closeDeleteConfirm: () => void;
  openDeleteDayConfirm: (date: string) => void;
  closeDeleteDayConfirm: () => void;
  openDeleteCheckedRowsConfirm: () => void;
  closeDeleteCheckedRowsModal: () => void;
  openDeleteSettingConfirm: (settingId: string) => void;
  closeDeleteSettingConfirm: () => void;
  openExportMonthModal: () => void;
  closeExportMonthModal: () => void;
  openExportConfirmModal: () => void;
  closeExportConfirmModal: () => void;
  openExportResultModal: () => void;
  closeExportResultModal: () => void;
}

export function useModalState(): UseModalStateReturn {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isDeleteCheckedRowsModalOpen, setIsDeleteCheckedRowsModalOpen] = useState(false);
  const [isExportMonthModalOpen, setIsExportMonthModalOpen] = useState(false);
  const [isExportConfirmModalOpen, setIsExportConfirmModalOpen] = useState(false);
  const [isExportResultModalOpen, setIsExportResultModalOpen] = useState(false);
  const [pendingDeleteRowId, setPendingDeleteRowId] = useState<string | null>(null);
  const [pendingDeleteDayDate, setPendingDeleteDayDate] = useState<string | null>(null);
  const [pendingDeleteSettingId, setPendingDeleteSettingId] = useState<string | null>(null);

  return {
    isModalOpen,
    isSettingsModalOpen,
    isDeleteCheckedRowsModalOpen,
    isExportMonthModalOpen,
    isExportConfirmModalOpen,
    isExportResultModalOpen,
    pendingDeleteRowId,
    pendingDeleteDayDate,
    pendingDeleteSettingId,
    openModal: () => setIsModalOpen(true),
    closeModal: () => setIsModalOpen(false),
    openSettingsModal: () => setIsSettingsModalOpen(true),
    closeSettingsModal: () => setIsSettingsModalOpen(false),
    openDeleteConfirm: (rowId: string) => setPendingDeleteRowId(rowId),
    closeDeleteConfirm: () => setPendingDeleteRowId(null),
    openDeleteDayConfirm: (date: string) => setPendingDeleteDayDate(date),
    closeDeleteDayConfirm: () => setPendingDeleteDayDate(null),
    openDeleteCheckedRowsConfirm: () => setIsDeleteCheckedRowsModalOpen(true),
    closeDeleteCheckedRowsModal: () => setIsDeleteCheckedRowsModalOpen(false),
    openDeleteSettingConfirm: (settingId: string) => setPendingDeleteSettingId(settingId),
    closeDeleteSettingConfirm: () => setPendingDeleteSettingId(null),
    openExportMonthModal: () => setIsExportMonthModalOpen(true),
    closeExportMonthModal: () => setIsExportMonthModalOpen(false),
    openExportConfirmModal: () => setIsExportConfirmModalOpen(true),
    closeExportConfirmModal: () => setIsExportConfirmModalOpen(false),
    openExportResultModal: () => setIsExportResultModalOpen(true),
    closeExportResultModal: () => setIsExportResultModalOpen(false)
  };
}
