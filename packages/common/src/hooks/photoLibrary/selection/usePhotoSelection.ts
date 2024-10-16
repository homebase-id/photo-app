import { useCallback, useMemo, useState } from 'react';

export const usePhotoSelection = () => {
  const [clearingSelection, setPendingClear] = useState<number>(0);

  const [selection, setSelection] = useState<string[]>([]);
  const isSelected = useCallback((fileId: string) => selection.indexOf(fileId) !== -1, [selection]);
  const clearSelection = useCallback(() => {
    setSelection([]);
    setPendingClear((old) => old + 1);
  }, []);
  const isSelecting = useMemo(() => selection.length > 0, [selection]);

  const toggleSelection = useCallback(
    (fileId: string) => {
      return new Promise<boolean>((resolve) => {
        setSelection((oldSelection) => {
          const becomesSelected = oldSelection.indexOf(fileId) === -1;

          resolve(becomesSelected);

          return !becomesSelected
            ? oldSelection.filter((selection) => selection !== fileId)
            : [...oldSelection, fileId];
        });
      });
    },
    [setSelection]
  );

  const selectRange = useCallback(
    (fileIds: string[]) =>
      setSelection((prevSelection) => Array.from(new Set([...prevSelection, ...fileIds]))),
    [setSelection]
  );

  return {
    isSelected,
    toggleSelection,
    selectRange,
    selection,
    clearSelection,
    clearingSelection,
    isSelecting,
  };
};
