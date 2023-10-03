import { useState } from 'react';

const usePhotoSelection = () => {
  const [selection, setSelection] = useState<string[]>([]);

  const isSelected = (fileId: string) => selection.indexOf(fileId) !== -1;
  const clearSelection = () => setSelection([]);
  const isSelecting = selection.length > 0;

  const toggleSelection = (fileId: string) =>
    setSelection(
      selection.indexOf(fileId) !== -1
        ? selection.filter(selection => selection !== fileId)
        : [...selection, fileId],
    );

  const selectRange = (fileIds: string[]) =>
    setSelection(prevSelection =>
      Array.from(new Set([...prevSelection, ...fileIds])),
    );

  return {
    isSelected,
    toggleSelection,
    selectRange,
    selection,
    clearSelection,
    isSelecting,
  };
};

export default usePhotoSelection;
