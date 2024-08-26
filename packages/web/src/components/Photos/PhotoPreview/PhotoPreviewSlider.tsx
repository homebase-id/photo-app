import { HomebaseFile } from '@homebase-id/js-lib/core';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useRef, useEffect, useState, useMemo } from 'react';
import useDebounce from '../../../hooks/debounce/useDebounce';
import MediaWithLoader from './MediaLoader';
import { useNavigate } from 'react-router-dom';

const PhotoPreviewSlider = ({
  fileId,
  urlPrefix,

  fetchOlderPage,
  hasOlderPage,
  isFetchingOlderPage,

  fetchNewerPage,
  hasNewerPage,
  isFetchingNewerPage,

  flatPhotos,
  original,
}: {
  fileId: string;
  urlPrefix?: string;

  fetchOlderPage: () => void;
  hasOlderPage?: boolean;
  isFetchingOlderPage: boolean;

  fetchNewerPage?: () => void;
  hasNewerPage?: boolean;
  isFetchingNewerPage?: boolean;

  flatPhotos: HomebaseFile[];
  original?: boolean;
}) => {
  const scrollContainer = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fileIndex = useMemo(
    () => flatPhotos.findIndex((photo) => stringGuidsEqual(photo.fileId, fileId)),
    [flatPhotos, fileId]
  );
  const slideWidth = scrollContainer.current?.parentElement?.clientWidth || window.innerWidth; // Not widow.clientWidth as the scrollbar is removed by disabling scrolling on the body

  // Get the current, next and previous photos;
  const currentPhoto = flatPhotos[fileIndex];
  const nextPhoto = flatPhotos[fileIndex + 1];
  const [photosToShow, setPhotosToShow] = useState<HomebaseFile[]>(
    Array.from(new Set([...flatPhotos.slice(0, fileIndex), currentPhoto, nextPhoto])).filter(
      (photo) => photo
    )
  );
  useEffect(() => {
    const indexInPhotosToshow = photosToShow.findIndex((photo) =>
      stringGuidsEqual(photo.fileId, fileId)
    );
    if (indexInPhotosToshow === photosToShow.length - 1) {
      // We're last, we need to append the next photo
      const nextPhoto = flatPhotos[fileIndex + 1];
      if (nextPhoto) setPhotosToShow([...photosToShow, nextPhoto]);
    } else if (indexInPhotosToshow === 0) {
      // We're first, we need to prepend the previous photo
      const prevPhoto = flatPhotos[fileIndex - 1];
      if (prevPhoto) setPhotosToShow([prevPhoto, ...photosToShow]);
    } else if (indexInPhotosToshow === -1) {
      console.log('Photo not found in photosToShow');
    }
  }, [fileIndex]);

  // Fetch older/newer pages when reaching the end of the current page
  const isFetching = isFetchingOlderPage || isFetchingNewerPage;
  useEffect(() => {
    if (isFetching) return;
    if (fileIndex >= flatPhotos.length - 1 && hasOlderPage) fetchOlderPage();
    if (fileIndex <= 1 && hasNewerPage && fetchNewerPage) fetchNewerPage();
    if (fileIndex === -1) {
      if (hasOlderPage) fetchOlderPage();
      else if (hasNewerPage && fetchNewerPage) fetchNewerPage();
    }
  }, [fileIndex, flatPhotos, hasNewerPage, hasOlderPage, fetchNewerPage, fetchOlderPage]);

  // Update the url with the current fileId when scrolling
  const scrollListener = useDebounce(
    () => {
      const currentIndex = Math.round((scrollContainer.current?.scrollLeft ?? 0) / slideWidth);

      // Update the url with the current fileId when scrolling
      if (!photosToShow || stringGuidsEqual(photosToShow[currentIndex]?.fileId, fileId)) return;

      const paths = window.location.pathname.split('/');
      if (paths[paths.length - 1] === photosToShow?.[currentIndex]?.fileId) return; // Already on the correct url
      if (paths[paths.length - 2] !== 'photo') return; // No longer on preview

      navigate(`${urlPrefix ? urlPrefix : ''}/photo/${photosToShow?.[currentIndex]?.fileId}`);
    },
    [photosToShow, fileId],
    500
  );

  useEffect(() => {
    scrollContainer.current?.addEventListener('scroll', scrollListener, {
      passive: true,
    });
    return () => scrollContainer.current?.removeEventListener('scroll', scrollListener);
  }, [flatPhotos, scrollListener]);

  // Scroll to the current photo when the photosToShow change
  const currentPhotoIndex = photosToShow.findIndex((photo) =>
    stringGuidsEqual(photo.fileId, fileId)
  );
  useEffect(() => {
    if (!scrollContainer.current) return;
    const newScrollLeft = currentPhotoIndex * slideWidth;
    if (scrollContainer.current.scrollLeft !== newScrollLeft) {
      scrollContainer.current.scrollLeft = currentPhotoIndex * slideWidth;
    }
  }, [photosToShow, currentPhotoIndex]);

  return (
    <div
      className="no-scrollbar flex h-full snap-x snap-mandatory flex-row overflow-y-hidden overflow-x-scroll"
      ref={scrollContainer}
    >
      {photosToShow.map((photo, index) => {
        return (
          <div
            className="h-full w-screen relative"
            key={photo.fileId}
            data-fileid={photo.fileId}
            data-index={index}
          >
            <div className="relative flex overflow-hidden h-screen w-screen snap-start">
              <MediaWithLoader
                media={photo}
                fileId={photo.fileId}
                lastModified={photo.fileMetadata.updated}
                original={original}
                key={`${photo.fileId}-${original}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PhotoPreviewSlider;
