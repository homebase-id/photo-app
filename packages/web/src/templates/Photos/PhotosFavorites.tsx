import LoginNav from '../../components/Auth/LoginNav/LoginNav';
import PhotoLibrary from '../../components/Photos/PhotoLibrary/PhotoLibrary';
import PhotoSelection from '../../components/Photos/PhotoSelection/PhotoSelection';
import { PageMeta } from '../../components/ui/Layout/PageMeta/PageMeta';
import { t } from '../../helpers/i18n/dictionary';
import { Suspense, lazy, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SolidHeart } from '../../components/ui/Icons/Heart/Heart';
import Uploader from '../../components/Photos/PhotoUploader/PhotoUploader';
import ActionButton from '../../components/ui/Buttons/ActionButton';
import Upload from '../../components/ui/Icons/Upload/Upload';
import { PhotoConfig, usePhotoSelection } from 'photo-app-common';

const PhotoPreview = lazy(() => import('../../components/Photos/PhotoPreview/PhotoPreview'));

const PhotosFavorites = () => {
  const [isFileSelectorOpen, setFileSelectorOpen] = useState(false);
  const { photoKey } = useParams();
  const { toggleSelection, selectRange, isSelected, selection, clearSelection, isSelecting } =
    usePhotoSelection();

  return (
    <>
      <PageMeta
        title={t('Favorites')}
        icon={SolidHeart}
        actions={
          <>
            <ActionButton
              icon={Upload}
              type="secondary"
              size="square"
              onClick={() => setFileSelectorOpen(true)}
            >
              <span className="hidden md:inline">{t('Upload')}</span>
            </ActionButton>
            <LoginNav />
          </>
        }
      />
      <PhotoSelection
        isSelecting={isSelecting}
        selection={selection}
        clearSelection={clearSelection}
        albumKey={PhotoConfig.FavoriteTag}
      />
      <Uploader
        isFileSelectorOpen={isFileSelectorOpen}
        setFileSelectorOpen={setFileSelectorOpen}
        albumKey={PhotoConfig.FavoriteTag}
      />
      <PhotoLibrary
        toggleSelection={toggleSelection}
        selectRange={selectRange}
        type={'favorites'}
        isSelected={isSelected}
        isSelecting={isSelecting}
      />
      {photoKey ? (
        <Suspense>
          <PhotoPreview fileId={photoKey} type={'favorites'} urlPrefix={'/favorites'} />
        </Suspense>
      ) : null}
    </>
  );
};
export default PhotosFavorites;
