import { useEffect } from 'react';
import { t } from '../../../helpers/i18n/dictionary';
import ActionButton from '../../ui/Buttons/ActionButton';
import { ActionButtonWithOptions } from '../../ui/Buttons/ActionButtonWithOptions';
import Archive from '../../ui/Icons/Archive/Archive';
import Heart from '../../ui/Icons/Heart/Heart';
import Times from '../../ui/Icons/Times/Times';
import { usePhoto, PhotoConfig, useAlbums, LibraryType } from 'photo-app-common';
import ErrorNotification from '../../ui/Alerts/ErrorNotification/ErrorNotification';
import { ActionGroup } from '../../ui/Buttons/ActionGroup';
import { ArrowDown } from '../../ui/Icons/Arrow/Arrow';

const PhotoSelection = ({
  selection,
  clearSelection,
  isSelecting,
  albumKey,
  type,
}: {
  selection: string[];
  clearSelection: () => void;
  isSelecting: boolean;
  albumKey?: string;
  type: LibraryType;
}) => {
  const {
    remove: { mutateAsync: removePhoto, error: removeError },
    deleteFile: { mutateAsync: deletePhoto, error: deleteError },
    archive: { mutateAsync: archivePhoto, error: archiveError },
    restore: { mutateAsync: restorePhoto, error: restoreError },
    addTags: { mutateAsync: addTagsToPhoto, error: addTagsError },
    removeTags: { mutateAsync: removeTagsFromPhoto, error: removeTagsError },
  } = usePhoto(PhotoConfig.PhotoDrive);
  const { data: albums } = useAlbums().fetch;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSelecting) {
        e.preventDefault();
        e.stopPropagation();

        clearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelecting]); // We need new handlers to reflect the new fileId

  if (!isSelecting) {
    return null;
  }

  const removeSelection = async () => {
    await Promise.all(
      selection.map(async (fileId) => {
        await removePhoto({ photoFileId: fileId });
      })
    );

    clearSelection();
  };

  const deleteSelection = async () => {
    await Promise.all(
      selection.map(async (fileId) => {
        await deletePhoto({ photoFileId: fileId });
      })
    );

    clearSelection();
  };

  const archiveSelection = async () => {
    await Promise.all(
      selection.map(async (fileId) => {
        await archivePhoto({ photoFileId: fileId });
      })
    );

    clearSelection();
  };

  const restoreSelection = async () => {
    await Promise.all(
      selection.map(async (fileId) => {
        await restorePhoto({ photoFileId: fileId });
      })
    );

    clearSelection();
  };

  const favoriteSelection = async () => {
    await Promise.all(
      selection.map(async (fileId) => {
        addTagsToPhoto({
          targetDrive: PhotoConfig.PhotoDrive,
          fileId: fileId,
          addTags: [PhotoConfig.FavoriteTag],
        });
      })
    );

    clearSelection();
  };

  const addSelectionToAlbum = async (albumTag: string) => {
    if (!albumTag) return;

    await Promise.all(
      selection.map(async (fileId) => {
        addTagsToPhoto({
          targetDrive: PhotoConfig.PhotoDrive,
          fileId: fileId,
          addTags: [albumTag],
        });
      })
    );

    clearSelection();
  };

  const removeSelectionFromAlbum = async (albumTag: string) => {
    if (!albumTag) return;

    await Promise.all(
      selection.map(async (fileId) => {
        removeTagsFromPhoto({
          targetDrive: PhotoConfig.PhotoDrive,
          fileId: fileId,
          removeTags: [albumTag],
        });
      })
    );

    clearSelection();
  };

  return (
    <>
      <ErrorNotification
        error={
          removeError ||
          deleteError ||
          archiveError ||
          restoreError ||
          addTagsError ||
          removeTagsError
        }
      />
      <div className="sticky top-0 z-10 -mx-2 -mt-10 flex flex-row items-center bg-indigo-400 p-3 shadow-md sm:-mx-10">
        <button className="mr-2 px-1 text-white" onClick={clearSelection}>
          <Times className="w-h-6 h-6" />
        </button>
        <p className="text-white">
          {selection?.length ? (
            <>
              {selection.length} {t('Selected')}
            </>
          ) : (
            t('Tap to select photos')
          )}
        </p>
        <div className="ml-auto flex flex-row-reverse gap-2">
          {type !== 'bin' ? (
            <ActionButton
              icon={'trash'}
              onClick={async () => {
                removeSelection();
              }}
              size="square"
              type="secondary"
              confirmOptions={{
                type: 'warning',
                title: t('Remove Photos'),
                body: `${t('Are you sure you want to remove')} ${selection.length} ${t('photos?')}`,
                buttonText: t('Remove'),
              }}
            />
          ) : null}
          {type !== 'archive' ? (
            <ActionButton
              icon={Archive}
              onClick={async () => {
                archiveSelection();
              }}
              size="square"
              type="secondary"
              confirmOptions={{
                type: 'info',
                title: t('Archive Photos'),
                body: `${t('Are you sure you want to archive')} ${selection.length} ${t('photos?')}`,
                buttonText: t('Archive'),
              }}
            />
          ) : null}

          {type === 'bin' ? (
            <ActionButton onClick={() => deleteSelection()}>{t('Delete permanently')}</ActionButton>
          ) : null}
          {type === 'archive' || type === 'bin' ? (
            <ActionButton onClick={() => restoreSelection()}>{t('Restore')}</ActionButton>
          ) : (
            <>
              <ActionButton
                icon={Heart}
                size="square"
                type="secondary"
                onClick={() => favoriteSelection()}
              />
              {albums && albums?.length && !albumKey ? (
                <ActionGroup
                  type="secondary"
                  options={albums.map((album) => {
                    return {
                      label: album.name,
                      value: album.name,
                      onClick: () => addSelectionToAlbum(album.tag),
                    };
                  })}
                  icon={ArrowDown}
                >
                  {t('Add to album')}
                </ActionGroup>
              ) : null}
              {albumKey ? (
                albumKey === PhotoConfig.FavoriteTag ? (
                  <ActionButton onClick={() => removeSelectionFromAlbum(albumKey)}>
                    {t('Remove from favorites')}
                  </ActionButton>
                ) : (
                  <ActionButton onClick={() => removeSelectionFromAlbum(albumKey)}>
                    {t('Remove from album')}
                  </ActionButton>
                )
              ) : null}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default PhotoSelection;
