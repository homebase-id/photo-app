import { useEffect, useMemo, useState } from 'react';
import { PhotoInfo } from './PhotoInfo/PhotoInfo';
import { PhotoActions } from './PhotoActions';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import PhotoPreviewSlider from './PhotoPreviewSlider';
import {
  PhotoConfig,
  useFileHeader,
  useFlatPhotosByMonth,
  usePhotosInfinte,
} from 'photo-app-common';
import useAuth from '../../../hooks/auth/useAuth';

const targetDrive = PhotoConfig.PhotoDrive;
const PhotoPreview = (props: {
  fileId: string;
  albumKey?: string;
  type?: 'archive' | 'apps' | 'bin' | 'favorites';
  urlPrefix?: string;
}) => {
  const { data: fileHeader } = useFileHeader({
    targetDrive,
    photoFileId: props.fileId,
  });

  if (props.albumKey) return <PhotoAlbumPreview {...props} dsr={fileHeader || undefined} />;
  else return <PhotoLibPreview {...props} dsr={fileHeader || undefined} />;
};

const PhotoLibPreview = ({
  dsr: fileHeader,
  fileId,
  albumKey,
  type,
  urlPrefix: urlPrefixProp,
}: {
  dsr?: DriveSearchResult;
  fileId: string;
  albumKey?: string;
  type?: 'archive' | 'apps' | 'bin' | 'favorites';
  urlPrefix?: string;
}) => {
  const urlPrefix = urlPrefixProp || (albumKey ? `/album/${albumKey}` : '');

  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [loadOriginal, setLoadOriginal] = useState(false);

  const currentDate = fileHeader
    ? new Date(fileHeader?.fileMetadata.appData.userDate || fileHeader?.fileMetadata.created)
    : undefined;

  useEffect(() => {
    document.documentElement.classList.add('overflow-hidden');
    return () => document.documentElement.classList.remove('overflow-hidden');
  }, []);

  const {
    data: photosInCache,
    hasNextPage: hasOlderPage,
    fetchNextPage: fetchOlderPage,
    isFetchingNextPage: isFetchingOlderPage,

    hasPreviousPage: hasNewerPage,
    fetchPreviousPage: fetchNewerPage,
    isFetchingPreviousPage: isFetchingNewerPage,
  } = useFlatPhotosByMonth({
    targetDrive,
    type,
    date: currentDate,
  }).fetchPhotos;

  const flatPhotos = useMemo(
    () => photosInCache?.pages.flatMap((page) => page.results) || [],
    [photosInCache, photosInCache?.pages]
  );

  const currentIndex = flatPhotos.findIndex((photo) => photo.fileId === fileId);
  const nextSibling = flatPhotos[currentIndex + 1];
  const prevSibling = flatPhotos[currentIndex - 1];

  return (
    <div className={`fixed inset-0 z-40 overflow-auto bg-black backdrop-blur-sm dark:bg-black`}>
      <div className="flex h-screen max-w-[100vw] flex-row justify-center">
        <div className={`relative ${isInfoOpen ? 'w-full md:w-[calc(100%-27rem)]' : 'w-full'}`}>
          <PhotoActions
            fileId={fileId}
            current={fileHeader}
            setIsInfoOpen={setIsInfoOpen}
            isInfoOpen={isInfoOpen}
            urlPrefix={urlPrefix}
            nextSibling={nextSibling}
            prevSibling={prevSibling}
            loadOriginal={loadOriginal}
            setLoadOriginal={setLoadOriginal}
          />
          {flatPhotos?.length ? (
            <PhotoPreviewSlider
              fileId={fileId}
              urlPrefix={urlPrefix}
              hasOlderPage={hasOlderPage}
              fetchOlderPage={fetchOlderPage}
              isFetchingOlderPage={isFetchingOlderPage}
              hasNewerPage={hasNewerPage}
              fetchNewerPage={fetchNewerPage}
              isFetchingNewerPage={isFetchingNewerPage}
              flatPhotos={flatPhotos}
              original={loadOriginal}
            />
          ) : null}
        </div>
        {isInfoOpen ? (
          <PhotoInfo
            current={fileHeader}
            setIsInfoOpen={setIsInfoOpen}
            loadOriginal={loadOriginal}
            key={fileId}
          />
        ) : null}
      </div>
    </div>
  );
};

const PhotoAlbumPreview = ({
  dsr: fileHeader,
  fileId,
  albumKey,
  type,
  urlPrefix: urlPrefixProp,
}: {
  dsr?: DriveSearchResult;
  fileId: string;
  albumKey?: string;
  type?: 'archive' | 'apps' | 'bin' | 'favorites';
  urlPrefix?: string;
}) => {
  const urlPrefix = urlPrefixProp || (albumKey ? `/album/${albumKey}` : '');

  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [loadOriginal, setLoadOriginal] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('overflow-hidden');
    return () => document.documentElement.classList.remove('overflow-hidden');
  }, []);

  const {
    data: photos,
    fetchNextPage: fetchOlderPage,
    hasNextPage: hasOlderPage,
    isFetchingNextPage: isFetchingOlderPage,
  } = usePhotosInfinte({
    targetDrive,
    album: albumKey,
    type,
    direction: 'newer',
  }).fetchPhotos;

  const flatPhotos = photos?.pages.flatMap((page) => page.results) || [];

  const currentIndex = flatPhotos.findIndex((photo) => photo.fileId === fileId);
  const nextSibling = flatPhotos[currentIndex + 1];
  const prevSibling = flatPhotos[currentIndex - 1];

  return (
    <div className={`fixed inset-0 z-40 overflow-auto bg-black backdrop-blur-sm dark:bg-black`}>
      <div className="flex h-screen max-w-[100vw] flex-row justify-center">
        <div className={`relative ${isInfoOpen ? 'w-full md:w-[calc(100%-27rem)]' : 'w-full'}`}>
          <PhotoActions
            fileId={fileId}
            current={fileHeader}
            setIsInfoOpen={setIsInfoOpen}
            isInfoOpen={isInfoOpen}
            urlPrefix={urlPrefix}
            nextSibling={nextSibling}
            prevSibling={prevSibling}
            loadOriginal={loadOriginal}
            setLoadOriginal={setLoadOriginal}
          />
          {flatPhotos?.length ? (
            <PhotoPreviewSlider
              fileId={fileId}
              urlPrefix={urlPrefix}
              fetchOlderPage={fetchOlderPage}
              hasOlderPage={hasOlderPage}
              isFetchingOlderPage={isFetchingOlderPage}
              flatPhotos={flatPhotos}
              original={loadOriginal}
            />
          ) : null}
        </div>
        {isInfoOpen ? (
          <PhotoInfo
            current={fileHeader}
            setIsInfoOpen={setIsInfoOpen}
            loadOriginal={loadOriginal}
            key={fileId}
          />
        ) : null}
      </div>
    </div>
  );
};

export default PhotoPreview;
