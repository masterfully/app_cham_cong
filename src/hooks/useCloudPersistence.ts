import { useEffect, useRef, useState } from "react";
import { User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { DayDefaultSetting, WorkRow } from "../types";

type CloudData = {
  rows?: WorkRow[];
  dayDefaultSettings?: DayDefaultSetting[];
  goldRows?: WorkRow[];
  goldDayDefaultSettings?: DayDefaultSetting[];
};

type UseCloudPersistenceOptions = CloudData & {
  user: User | null;
  setRows: (rows: WorkRow[]) => void;
  setDayDefaultSettings: (settings: DayDefaultSetting[]) => void;
  setGoldRows: (rows: WorkRow[]) => void;
  setGoldDayDefaultSettings: (settings: DayDefaultSetting[]) => void;
};

export function useCloudPersistence(options: UseCloudPersistenceOptions): { isCloudLoaded: boolean; error: string | null } {
  const {
    user,
    rows,
    dayDefaultSettings,
    goldRows,
    goldDayDefaultSettings,
    setRows,
    setDayDefaultSettings,
    setGoldRows,
    setGoldDayDefaultSettings
  } = options;
  const [isCloudLoaded, setIsCloudLoaded] = useState(false);
  const [isCloudAvailable, setIsCloudAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const documentRef = useRef(user ? doc(db, "users", user.uid, "app", "data") : null);

  useEffect(() => {
    if (!user) {
      documentRef.current = null;
      setIsCloudLoaded(false);
      return;
    }

    const nextDocumentRef = doc(db, "users", user.uid, "app", "data");
    documentRef.current = nextDocumentRef;
    let isCurrent = true;

    async function loadCloudData(): Promise<void> {
      try {
        setError(null);
        const snapshot = await getDoc(nextDocumentRef);
        if (!isCurrent) {
          return;
        }

        if (snapshot.exists()) {
          const cloudData = snapshot.data() as CloudData;
          if (Array.isArray(cloudData.rows)) setRows(cloudData.rows);
          if (Array.isArray(cloudData.dayDefaultSettings)) setDayDefaultSettings(cloudData.dayDefaultSettings);
          if (Array.isArray(cloudData.goldRows)) setGoldRows(cloudData.goldRows);
          if (Array.isArray(cloudData.goldDayDefaultSettings)) setGoldDayDefaultSettings(cloudData.goldDayDefaultSettings);
        } else {
          await setDoc(nextDocumentRef, {
            rows: [],
            dayDefaultSettings: [],
            goldRows: [],
            goldDayDefaultSettings: []
          });
        }

        setIsCloudAvailable(true);
        setIsCloudLoaded(true);
      } catch (loadError) {
        console.error("Không thể tải dữ liệu Firestore", loadError);
        if (isCurrent) {
          const errorCode = typeof loadError === "object" && loadError !== null && "code" in loadError ? String(loadError.code) : "unknown";
          setIsCloudAvailable(false);
          setError(`Firestore chưa được bật (${errorCode}). Vào Firebase Console > Firestore Database > Create database.`);
          setIsCloudLoaded(false);
        }
      }
    }

    void loadCloudData();
    return () => {
      isCurrent = false;
    };
  }, [user, setDayDefaultSettings, setGoldDayDefaultSettings, setGoldRows, setRows]);

  useEffect(() => {
    const currentDocumentRef = documentRef.current;
    if (!isCloudLoaded || !isCloudAvailable || !currentDocumentRef) {
      return;
    }

    void setDoc(currentDocumentRef, { rows }, { merge: true }).catch((saveError) => {
      console.error("Không thể lưu rows lên Firestore", saveError);
      setError("Không thể lưu dữ liệu đám mây.");
    });
  }, [isCloudAvailable, isCloudLoaded, rows]);

  useEffect(() => {
    const currentDocumentRef = documentRef.current;
    if (!isCloudLoaded || !isCloudAvailable || !currentDocumentRef) {
      return;
    }

    void setDoc(currentDocumentRef, { dayDefaultSettings }, { merge: true }).catch((saveError) => {
      console.error("Không thể lưu cài đặt lên Firestore", saveError);
      setError("Không thể lưu dữ liệu đám mây.");
    });
  }, [dayDefaultSettings, isCloudAvailable, isCloudLoaded]);

  useEffect(() => {
    const currentDocumentRef = documentRef.current;
    if (!isCloudLoaded || !isCloudAvailable || !currentDocumentRef) {
      return;
    }

    void setDoc(currentDocumentRef, { goldRows }, { merge: true }).catch((saveError) => {
      console.error("Không thể lưu goldRows lên Firestore", saveError);
      setError("Không thể lưu dữ liệu đám mây.");
    });
  }, [goldRows, isCloudAvailable, isCloudLoaded]);

  useEffect(() => {
    const currentDocumentRef = documentRef.current;
    if (!isCloudLoaded || !isCloudAvailable || !currentDocumentRef) {
      return;
    }

    void setDoc(currentDocumentRef, { goldDayDefaultSettings }, { merge: true }).catch((saveError) => {
      console.error("Không thể lưu cài đặt Gold lên Firestore", saveError);
      setError("Không thể lưu dữ liệu đám mây.");
    });
  }, [goldDayDefaultSettings, isCloudAvailable, isCloudLoaded]);

  return { isCloudLoaded, error };
}

export default useCloudPersistence;
