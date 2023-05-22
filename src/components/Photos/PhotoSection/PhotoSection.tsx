import { ThumbSize, TargetDrive, DriveSearchResult } from '@youfoundation/js-lib';
import { useState, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useIntersection } from '../../../hooks/intersection/useIntersection';
import { SubtleCheck } from '../../ui/Icons/Check/Check';
import { VideoWithLoader } from '../PhotoPreview/VideoWithLoader';
import { PhotoWithLoader } from '../PhotoPreview/PhotoWithLoader';
import Triangle from '../../ui/Icons/Triangle/Triangle';
import { useLongPress } from '../../../hooks/longPress/useLongPress';

// Input on the "scaled" layout: https://github.com/xieranmaya/blog/issues/6
const gridClasses = `grid grid-cols-4 gap-[0.1rem] md:gap-1 md:grid-cols-6 lg:flex lg:flex-row lg:flex-wrap`;
const divClasses = `relative aspect-square lg:aspect-auto lg:h-[200px] lg:flex-grow overflow-hidden`;
const imgWrapperClasses = `h-full w-full object-cover lg:h-[200px] lg:min-w-full lg:max-w-xs lg:align-bottom`;

const getAspectRatioFromThumbnails = (thumbnails: ThumbSize[]): number => {
  if (!thumbnails?.length) return 0;

  const biggestThumb: ThumbSize = thumbnails.reduce((bigThumb, curThumb) => {
    if (!bigThumb || bigThumb.pixelWidth < curThumb.pixelWidth) return curThumb;
    return bigThumb;
  });

  return biggestThumb.pixelWidth / biggestThumb.pixelHeight;
};

const dateFormat: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  weekday: 'short',
};

const mobileDateFormat: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  weekday: 'short',
};

export const PhotoDay = ({
  date,
  photosCount,
  photos,
  setIsInView,

  targetDrive,
  toggleSelection,
  rangeSelection,
  isSelected,
  isSelecting,
}: {
  date: Date;
  photosCount?: number;
  photos?: DriveSearchResult[];
  setIsInView?: () => void;

  targetDrive: TargetDrive;
  toggleSelection: (fileId: string) => void;
  rangeSelection: (fileId: string) => void;
  isSelected: (fileId: string) => boolean;
  isSelecting?: boolean;
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  useIntersection(wrapperRef, () => setIsInView && setIsInView());

  const title = useMemo(() => {
    const isDesktop = document.documentElement.clientWidth >= 1024;
    return date.toLocaleDateString(undefined, isDesktop ? dateFormat : mobileDateFormat);
  }, [date]);

  const photoLoaders = useMemo(() => {
    const aspect = 1;

    return new Array(photosCount).fill(0).map((_, index) => (
      <div className={`${divClasses} relative`} key={index}>
        <div
          className={`${imgWrapperClasses} bg-white dark:bg-slate-700`}
          style={{ height: '200px', width: `${Math.round(aspect * 200)}px` }}
        ></div>
      </div>
    ));
  }, [photosCount]);

  return (
    <section className="mb-5" ref={wrapperRef}>
      <h2 className="text-md mb-2 text-slate-600 dark:text-slate-400">{title}</h2>
      <div className={gridClasses}>
        {!photos && photosCount ? (
          photoLoaders
        ) : (
          <>
            {photos?.map((photoDsr) => {
              return (
                <PhotoItem
                  targetDrive={targetDrive}
                  photoDsr={photoDsr}
                  key={photoDsr.fileId}
                  toggleSelection={toggleSelection}
                  rangeSelection={rangeSelection}
                  isSelected={isSelected}
                  isSelecting={isSelecting}
                />
              );
            })}
          </>
        )}
        {/* This div fills up the space of the last row */}
        <div className="hidden flex-grow-[999] lg:block"></div>
      </div>
    </section>
  );
};

export const PhotoItem = ({
  targetDrive,
  photoDsr,
  toggleSelection,
  rangeSelection,
  isSelected,
  isSelecting,
}: {
  targetDrive: TargetDrive;
  photoDsr: DriveSearchResult;
  toggleSelection: (fileId: string) => void;
  rangeSelection: (fileId: string) => void;
  isSelected: (fileId: string) => boolean;
  isSelecting?: boolean;
}) => {
  const [isInView, setIsInView] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  useIntersection(wrapperRef, () => {
    setIsInView(true);
  });

  const isDesktop = document.documentElement.clientWidth >= 1024;

  if (!photoDsr) {
    return null;
  }

  // Always square previews for video's
  const aspect = photoDsr.fileMetadata.appData.additionalThumbnails
    ? getAspectRatioFromThumbnails(photoDsr.fileMetadata.appData.additionalThumbnails)
    : 1;
  const isChecked = photoDsr?.fileId && isSelected(photoDsr?.fileId);

  const doSelection = (
    e: React.MouseEvent<HTMLElement, MouseEvent> | React.TouchEvent<HTMLElement>
  ) => {
    if (e.shiftKey) rangeSelection(photoDsr.fileId);
    else toggleSelection(photoDsr.fileId);
  };

  const photoDate = new Date(
    photoDsr.fileMetadata.appData.userDate || photoDsr.fileMetadata.created
  );

  const longPress = useLongPress(
    (e) => {
      if (!e) return;
      doSelection(e);
    },
    (e) => {
      console.log(isSelecting, e);
      if (!isSelecting || !e) return;
      e.preventDefault();
      doSelection(e);
    }
  );

  return (
    <div
      className={`${divClasses} relative ${isChecked ? 'bg-indigo-200' : ''}`}
      data-date={`${photoDate.getFullYear()}-${photoDate.getMonth() + 1}-${photoDate.getDate()}`}
      data-unix={photoDate.getTime()}
    >
      <Link
        // relative path so we can keep the albumkey intact
        to={`photo/${photoDsr.fileId}`}
        className="cursor-pointer"
        {...longPress}
      >
        <div
          className={`${imgWrapperClasses} transition-transform ${
            isChecked ? 'scale-90' : 'scale-100'
          }`}
          style={isDesktop ? { height: `${200}px`, width: `${Math.round(aspect * 200)}px` } : {}}
          ref={wrapperRef}
        >
          {isInView ? (
            photoDsr.fileMetadata.contentType.startsWith('video/') ? (
              <>
                <VideoWithLoader
                  fileId={photoDsr.fileId}
                  targetDrive={targetDrive}
                  fit="cover"
                  preview={true}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Triangle className="h-8 w-8 text-white " />
                </div>
              </>
            ) : (
              <PhotoWithLoader
                fileId={photoDsr.fileId}
                targetDrive={targetDrive}
                previewThumbnail={photoDsr?.fileMetadata.appData.previewThumbnail}
                size={{ pixelWidth: 200, pixelHeight: 200 }}
                fit="cover"
              />
            )
          ) : null}
        </div>
        {isDesktop ? (
          <div className="group absolute inset-0 hidden hover:bg-opacity-50 hover:bg-gradient-to-b hover:from-[#00000080] md:block">
            <button
              className={`pl-2 pt-2 group-hover:block ${isChecked ? 'block' : 'hidden'}`}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                doSelection(e);
              }}
            >
              <div
                className={`rounded-full border ${
                  isChecked ? 'border-black bg-black' : 'border-white border-opacity-20'
                } p-1`}
              >
                <SubtleCheck
                  className={`h-2 w-2 text-white opacity-0 transition-opacity md:h-5 md:w-5 ${
                    isChecked ? 'opacity-100' : 'group-hover:opacity-100'
                  }`}
                />
              </div>
            </button>
          </div>
        ) : null}
      </Link>
    </div>
  );
};
