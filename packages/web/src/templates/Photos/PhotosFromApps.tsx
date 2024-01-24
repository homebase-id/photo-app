import LoginNav from '../../components/Auth/LoginNav/LoginNav';
import PhotoLibrary from '../../components/Photos/PhotoLibrary/PhotoLibrary';
import PhotoSelection from '../../components/Photos/PhotoSelection/PhotoSelection';
import { PageMeta } from '../../components/ui/Layout/PageMeta/PageMeta';
import Image from '../../components/ui/Icons/Image/Image';
import { t } from '../../helpers/i18n/dictionary';
import { Suspense, lazy, useState } from 'react';
import { useParams } from 'react-router-dom';
import ActionButton from '../../components/ui/Buttons/ActionButton';
import Upload from '../../components/ui/Icons/Upload/Upload';
import Uploader from '../../components/Photos/PhotoUploader/PhotoUploader';
import { usePhotoSelection } from 'photo-app-common';

const PhotoPreview = lazy(() => import('../../components/Photos/PhotoPreview/PhotoPreview'));

const PhotosFromApps = () => {
  const [isFileSelectorOpen, setFileSelectorOpen] = useState(false);
  const { photoKey } = useParams();
  const { toggleSelection, selectRange, isSelected, selection, clearSelection, isSelecting } =
    usePhotoSelection();

  return (
    <>
      <PageMeta
        title={t('Photos from Apps')}
        icon={Image}
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
        type="apps"
      />
      <Uploader
        isFileSelectorOpen={isFileSelectorOpen}
        setFileSelectorOpen={setFileSelectorOpen}
        type="apps"
      />
      <PhotoLibrary
        toggleSelection={toggleSelection}
        selectRange={selectRange}
        type={'apps'}
        isSelected={isSelected}
        isSelecting={isSelecting}
      />
      {photoKey ? (
        <Suspense>
          <PhotoPreview fileId={photoKey} type={'apps'} urlPrefix={'/apps'} />
        </Suspense>
      ) : null}
    </>
  );
};
export default PhotosFromApps;
