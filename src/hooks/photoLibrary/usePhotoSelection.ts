import { useState } from 'react';

const usePhotoSelection = () => {
  const [selection, setSelection] = useState<string[]>([]);

  return {
    isSelected: (fileId: string) => selection.indexOf(fileId) !== -1,
    toggleSelection: (fileId: string) =>
      setSelection(
        selection.indexOf(fileId) !== -1
          ? selection.filter((selection) => selection !== fileId)
          : [...selection, fileId]
      ),
    selection,
    clearSelection: () => setSelection([]),
    isSelecting: selection.length > 0,
  };
};

export default usePhotoSelection;
