import { ThumbSize, TargetDrive, DriveSearchResult } from '@youfoundation/js-lib';
import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useIntersection } from '../../../hooks/intersection/useIntersection';
import { SubtleCheck } from '../../ui/Icons/Check/Check';
import { VideoWithLoader } from '../PhotoPreview/VideoWithLoader';
import { PhotoWithLoader } from '../PhotoPreview/PhotoWithLoader';
import Triangle from '../../ui/Icons/Triangle/Triangle';

// Input on the "scaled" layout: https://github.com/xieranmaya/blog/issues/6
const gridClasses = `grid grid-cols-4 gap-1 md:grid-cols-6 lg:flex lg:flex-row lg:flex-wrap`;
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

export const PhotoSection = ({
  title,
  targetDrive,
  photos,
  toggleSelection,
  rangeSelection,
  isSelected,
  isSelecting,
}: {
  title: string;
  targetDrive: TargetDrive;
  photos: DriveSearchResult[];
  toggleSelection: (fileId: string) => void;
  rangeSelection: (fileId: string) => void;
  isSelected: (fileId: string) => boolean;
  isSelecting?: boolean;
}) => {
  const sortedPhotos = photos.sort(
    (dsrA, dsrB) =>
      (dsrB.fileMetadata.appData.userDate || dsrB.fileMetadata.created || 0) -
      (dsrA.fileMetadata.appData.userDate || dsrA.fileMetadata.created || 0)
  );

  return (
    <section className="mb-5">
      <h2 className="text-md mb-2 text-slate-600 dark:text-slate-400">{title}</h2>
      <div className={gridClasses}>
        {sortedPhotos.map((photoDsr) => {
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

  if (!photoDsr) {
    return null;
  }

  // Always square previews for video's
  const aspect = photoDsr.fileMetadata.appData.additionalThumbnails
    ? getAspectRatioFromThumbnails(photoDsr.fileMetadata.appData.additionalThumbnails)
    : 1;
  const isChecked = photoDsr?.fileId && isSelected(photoDsr?.fileId);

  const doSelection = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement, MouseEvent>) => {
    if (e.shiftKey) rangeSelection(photoDsr.fileId);
    else toggleSelection(photoDsr.fileId);
  };

  return (
    <div className={`${divClasses} relative ${isChecked ? 'bg-indigo-200' : ''}`}>
      <Link
        // relative path so we can keep the albumkey intact
        to={`photo/${photoDsr.fileId}`}
        className="cursor-pointer"
        onClick={(e) => {
          if (!isSelecting) return;
          e.preventDefault();
          doSelection(e);
        }}
      >
        <div
          className={`${imgWrapperClasses} transition-transform ${
            isChecked ? 'scale-90' : 'scale-100'
          }`}
          style={{ height: '200px', width: `${Math.round(aspect * 200)}px` }}
          ref={wrapperRef}
        >
          {isInView ? (
            photoDsr.fileMetadata.contentType.startsWith('video/') ? (
              <>
                <VideoWithLoader
                  fileId={photoDsr.fileId}
                  targetDrive={targetDrive}
                  fit="cover"
                  hideControls={true}
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
        <div className="group absolute inset-0 hover:bg-opacity-50 hover:bg-gradient-to-b hover:from-[#00000080]">
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
                className={`h-5 w-5 text-white opacity-0 transition-opacity ${
                  isChecked ? 'opacity-100' : 'group-hover:opacity-100'
                }`}
              />
            </div>
          </button>
        </div>
      </Link>
    </div>
  );
};
