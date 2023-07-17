import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { useRef, useEffect } from 'react';
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

  flatPhotos: DriveSearchResult[];
  original?: boolean;
}) => {
  const scrollContainer = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fileIndex = flatPhotos.findIndex((photo) => stringGuidsEqual(photo.fileId, fileId));
  const slideWidth = scrollContainer.current?.parentElement?.clientWidth || window.innerWidth; // Not widow.clientWidth as the scrollbar is removed by disabled scrolling on the body

  // Get the current, next and previous photos;
  // TODO: Check if we need to preload more than 1 photo
  const currentPhoto = flatPhotos[fileIndex];
  const nextPhoto = flatPhotos[fileIndex + 1];
  const prevPhoto = flatPhotos[fileIndex - 1];

  const photosToShow = [prevPhoto, currentPhoto, nextPhoto].filter((photo) => photo);
  const currentPhotoIndex = photosToShow.findIndex((photo) =>
    stringGuidsEqual(photo.fileId, fileId)
  );

  // Fetch older/newer pages when reaching the end of the current page
  const isFetching = isFetchingOlderPage || isFetchingNewerPage;
  useEffect(() => {
    if (isFetching) return;
    if (fileIndex >= flatPhotos.length - 1 && hasOlderPage) fetchOlderPage();
    if (fileIndex <= 1 && hasNewerPage && fetchNewerPage) fetchNewerPage();
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
  useEffect(() => {
    if (!scrollContainer.current) return;
    scrollContainer.current.scrollLeft = currentPhotoIndex * slideWidth;
  }, [photosToShow, currentPhotoIndex]);

  return (
    <div
      className="no-scrollbar flex h-full snap-x snap-mandatory flex-row overflow-y-hidden overflow-x-scroll"
      ref={scrollContainer}
    >
      {photosToShow.map((photo) => {
        return (
          <div className="h-full w-screen" key={photo.fileId}>
            <div className="flex h-screen w-screen snap-start">
              <MediaWithLoader
                media={photo}
                fileId={photo.fileId}
                className={`relative m-auto h-auto max-h-[100vh] w-auto max-w-full object-contain`}
                original={original}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PhotoPreviewSlider;
