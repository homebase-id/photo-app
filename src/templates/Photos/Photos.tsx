import { lazy, Suspense, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import NewAlbumDialog from '../../components/Dialog/NewAlbumDialog/NewAlbumDialog';
import PhotoLibrary from '../../components/Photos/PhotoLibrary/PhotoLibrary';
import Uploader from '../../components/Photos/PhotoUploader/PhotoUploader';
import ActionButton from '../../components/ui/Buttons/ActionButton';
import ActionButtonWithOptions from '../../components/ui/Buttons/ActionButtonWithOptions';
import Heart from '../../components/ui/Icons/Heart/Heart';
import Image from '../../components/ui/Icons/Image/Image';
import Times from '../../components/ui/Icons/Times/Times';
import Upload from '../../components/ui/Icons/Upload/Upload';
import PageMeta from '../../components/ui/Layout/PageMeta/PageMeta';
import { t } from '../../helpers/i18n/dictionary';
import useAlbum from '../../hooks/photoLibrary/useAlbum';
import useAlbums from '../../hooks/photoLibrary/useAlbums';
import usePhoto from '../../hooks/photoLibrary/usePhoto';
import usePhotoSelection from '../../hooks/photoLibrary/usePhotoSelection';
import { PhotoConfig } from '../../provider/photos/PhotoTypes';

const PhotoPreview = lazy(() => import('../../components/Photos/PhotoPreview/PhotoPreview'));

const Photos = () => {
  const [isFileSelectorOpen, setFileSelectorOpen] = useState(false);
  const { photoKey, albumKey } = useParams();
  const { data: album } = useAlbum(albumKey).fetch;

  const { toggleSelection, isSelected, selection, clearSelection, isSelecting } =
    usePhotoSelection();
  const navigate = useNavigate();

  return (
    <>
      <PageMeta
        title={album?.name || t('Photos')}
        icon={Image}
        actions={
          <ActionButton icon={Upload} type="secondary" onClick={() => setFileSelectorOpen(true)}>
            {t('Upload')}
          </ActionButton>
        }
      />
      <PhotoSelection
        isSelecting={isSelecting}
        selection={selection}
        clearSelection={clearSelection}
        albumKey={albumKey}
      />
      <Uploader
        isFileSelectorOpen={isFileSelectorOpen}
        setFileSelectorOpen={setFileSelectorOpen}
        albumKey={albumKey}
      />
      <PhotoLibrary
        toggleSelection={toggleSelection}
        setFileSelectorOpen={setFileSelectorOpen}
        albumKey={albumKey}
        isSelected={isSelected}
        isSelecting={isSelecting}
      />
      {photoKey ? (
        <Suspense>
          <PhotoPreview fileId={photoKey} albumKey={albumKey} />
        </Suspense>
      ) : null}
      {albumKey === 'new' ? (
        <>
          <NewAlbumDialog isOpen={true} onCancel={() => navigate(-1)} />
        </>
      ) : null}
    </>
  );
};

const PhotoSelection = ({
  selection,
  clearSelection,
  isSelecting,
  albumKey,
}: {
  selection: string[];
  clearSelection: () => void;
  isSelecting: boolean;
  albumKey?: string;
}) => {
  const {
    remove: { mutateAsync: removePhoto },
    addTags: { mutateAsync: addTagsToPhoto },
    removeTags: { mutateAsync: removeTagsFromPhoto },
  } = usePhoto(PhotoConfig.PhotoDrive);
  const navigate = useNavigate();

  const { data: albums } = useAlbums().fetch;

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
    <div className="sticky top-0 z-10 -mx-2 -mt-10 flex flex-row items-center bg-indigo-400 p-3 shadow-md sm:-mx-10">
      <button className="mr-2 px-1 text-white" onClick={clearSelection}>
        <Times className="w-h-6 h-6" />
      </button>
      <p className="text-white">
        {selection.length} {t('Selected')}
      </p>
      <div className="ml-auto flex flex-row-reverse gap-2">
        <ActionButton
          icon={'trash'}
          onClick={async () => {
            removeSelection();
          }}
          className="p-3"
          size="square"
          type="secondary"
          confirmOptions={{
            title: t('Remove Photos'),
            body: `${t('Are you sure you want to remove')} ${selection.length} ${t('photos?')}`,
            buttonText: t('Remove'),
          }}
        />
        <ActionButton
          icon={Heart}
          className="p-3"
          size="square"
          type="secondary"
          onClick={() => favoriteSelection()}
        />
        {albums && !albumKey ? (
          <ActionButtonWithOptions
            type="secondary"
            options={[
              ...albums.map((album) => {
                return { name: album.name, onClick: () => addSelectionToAlbum(album.tag) };
              }),
              { name: `+ ${t('new album')}`, onClick: () => navigate('/album/new') },
            ]}
          >
            {t('Add to album')}
          </ActionButtonWithOptions>
        ) : null}

        {albumKey ? (
          <ActionButton onClick={() => removeSelectionFromAlbum(albumKey)}>
            {t('Remove from album')}
          </ActionButton>
        ) : null}
      </div>
    </div>
  );
};

export default Photos;
