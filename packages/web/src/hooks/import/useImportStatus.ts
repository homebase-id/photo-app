import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

const DB_NAME = 'OdinPhotosDatabase';
const UPLOADED_FILES_STORE = 'uploadedFiles';
const JSON_FILES_STORE = 'jsonFiles';

let db: IDBDatabase;

const useImportStatus = () => {
  const [isOpen, setIsOpen] = useState(false);

  const openDatabase = () => {
    if (db && isOpen) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onerror = function () {
        reject('Error opening database.');
      };
      request.onsuccess = function () {
        db = request.result;
        setIsOpen(true);
        resolve();
      };
      request.onupgradeneeded = function () {
        db = this.result;
        db.createObjectStore(UPLOADED_FILES_STORE, { keyPath: 'uniquename' });
        db.createObjectStore(JSON_FILES_STORE, { keyPath: 'uniquename' });
      };
    });
  };

  openDatabase().catch(console.error); // Open database

  const countRowsInStores = async (): Promise<{
    uploadedFilesCount: number;
    jsonFilesCount: number;
  }> => {
    const transactionUploadedFiles = db.transaction(
      [UPLOADED_FILES_STORE],
      'readonly',
    );
    const storeUploadedFiles =
      transactionUploadedFiles.objectStore(UPLOADED_FILES_STORE);
    const requestUploadedFiles = storeUploadedFiles.count();

    const transactionJsonFiles = db.transaction([JSON_FILES_STORE], 'readonly');
    const storeJsonFiles = transactionJsonFiles.objectStore(JSON_FILES_STORE);
    const requestJsonFiles = storeJsonFiles.count();

    return Promise.all([
      new Promise((resolve, reject) => {
        requestUploadedFiles.onsuccess = () => {
          resolve(requestUploadedFiles.result);
        };
        requestUploadedFiles.onerror = () => {
          reject('Error counting uploaded files.');
        };
      }),
      new Promise((resolve, reject) => {
        requestJsonFiles.onsuccess = () => {
          resolve(requestJsonFiles.result);
        };
        requestJsonFiles.onerror = () => {
          reject('Error counting JSON files.');
        };
      }),
    ]).then(
      ([uploadedFilesCount, jsonFilesCount]) =>
        ({ uploadedFilesCount, jsonFilesCount }) as {
          uploadedFilesCount: number;
          jsonFilesCount: number;
        },
    );
  };

  const countRowsWithStatus = (status: number): Promise<number> => {
    const transactionUploadedFiles = db.transaction(
      [UPLOADED_FILES_STORE],
      'readonly',
    );
    const storeUploadedFiles =
      transactionUploadedFiles.objectStore(UPLOADED_FILES_STORE);

    let count = 0;

    return new Promise((resolve, reject) => {
      storeUploadedFiles.openCursor().onsuccess = event => {
        const cursor = (event.target as any)?.result;
        if (cursor) {
          if (cursor.value.status === status) {
            count++;
          }
          cursor.continue();
        } else {
          resolve(count);
        }
      };

      storeUploadedFiles.openCursor().onerror = () => {
        reject('Error counting uploaded files with status.');
      };
    });
  };

  return useQuery({
    queryKey: ['status'],
    queryFn: async () => {
      const { uploadedFilesCount, jsonFilesCount } = await countRowsInStores();

      return {
        pictures: uploadedFilesCount,
        jsons: jsonFilesCount,
        picturesMissingMeta: await countRowsWithStatus(0),
        picturesWithMeta: await countRowsWithStatus(1),
      };
    },
    enabled: isOpen,
  });
};

export default useImportStatus;
