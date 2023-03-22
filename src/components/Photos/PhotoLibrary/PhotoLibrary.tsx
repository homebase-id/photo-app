import {
  DriveSearchResult,
  PhotoConfig,
  TargetDrive,
  ThumbSize,
} from '@youfoundation/dotyoucore-js';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { Link } from 'react-router-dom';
import { useIntersection } from '../../../hooks/intersection/useIntersection';
import usePhotoLibraryPart from '../../../hooks/photoLibrary/usePhotoLibraryPart';
import { t } from '../../../helpers/i18n/dictionary';
import { SubtleCheck } from '../../ui/Icons/Check/Check';
import { PhotoWithLoader } from '../PhotoPreview/PhotoPreview';

// Input on the "scaled" layout: https://github.com/xieranmaya/blog/issues/6
const gridClasses = `grid grid-cols-4 gap-1 md:grid-cols-6 lg:flex lg:flex-row lg:flex-wrap`;
const divClasses = `relative aspect-square lg:aspect-auto lg:h-[200px] lg:flex-grow overflow-hidden`;
const imgWrapperClasses = `h-full w-full object-cover lg:h-[200px] lg:min-w-full lg:max-w-xs lg:align-bottom`;

const monthFormat: Intl.DateTimeFormatOptions = {
  month: 'long',
  year: 'numeric',
};

const dateFormat: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  weekday: 'short',
};

const createDateObject = (year: string, month: string, day?: string) => {
  const newDate = new Date();
  newDate.setFullYear(parseInt(year));
  newDate.setMonth(parseInt(month) - 1);

  if (day) newDate.setDate(parseInt(day));

  return newDate;
};

const getAspectRatioFromThumbnails = (thumbnails: ThumbSize[]): number => {
  if (!thumbnails?.length) return 0;

  const biggestThumb: ThumbSize = thumbnails.reduce((bigThumb, curThumb) => {
    if (!bigThumb || bigThumb.pixelWidth < curThumb.pixelWidth) return curThumb;
    return bigThumb;
  });

  return biggestThumb.pixelWidth / biggestThumb.pixelHeight;
};

export const buildMetaStructure = (headers: DriveSearchResult[]) => {
  return headers.reduce((curVal, head) => {
    const currDate = new Date(head.fileMetadata.appData.userDate || head.fileMetadata.created);
    const year = currDate.getFullYear();
    const month = currDate.getMonth() + 1;
    const day = currDate.getDate();

    const returnObj = { ...curVal };
    returnObj[year] = {
      ...returnObj[year],
    };
    returnObj[year][month] = {
      ...returnObj[year][month],
    };

    returnObj[year][month][day] = returnObj[year][month][day]
      ? [...returnObj[year][month][day], head]
      : [head];

    return returnObj;
  }, {} as Record<string, Record<string, Record<string, DriveSearchResult[]>>>);
};

const PhotoLibrary = ({
  toggleSelection,
  isSelected,
  isSelecting,
}: {
  toggleSelection: (fileId: string) => void;
  isSelected: (fileId: string) => boolean;
  isSelecting?: boolean;
}) => {
  const {
    data: photoLibraryPart,
    hasNextPage: hasMorePhotos,
    fetchNextPage,
    isFetchingNextPage,
  } = usePhotoLibraryPart({
    targetDrive: PhotoConfig.PhotoDrive,
    pageSize: 50,
  }).fetchLibraryPart;

  const photoLibrary = photoLibraryPart
    ? buildMetaStructure(photoLibraryPart.pages.flatMap((page) => page.results))
    : undefined;
  const years = photoLibrary ? Object.keys(photoLibrary).reverse() : undefined;

  const monthsToShow = photoLibrary
    ? years?.flatMap((year) =>
        Object.keys(photoLibrary[year])
          .map((month) => {
            return { monthDate: { year, month }, days: photoLibrary[year][month] };
          })
          .reverse()
      )
    : undefined;

  /// Virtual scrolling
  const parentRef = useRef<HTMLDivElement>(null);
  const parentOffsetRef = useRef(0);

  useLayoutEffect(() => {
    parentOffsetRef.current = parentRef.current?.offsetTop ?? 0;
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: (monthsToShow?.length || 0) + 1, // Add 1 so we have an index for the 'loaderRow'
    estimateSize: () => 300, // Rough size of a photoSection
    scrollMargin: parentOffsetRef.current,
    overscan: 1, // Amount of items to load before and after (improved performance especially with images)
  });

  useEffect(() => {
    const [lastItem] = [...virtualizer.getVirtualItems()].reverse();

    if (!lastItem || !monthsToShow?.length) {
      return;
    }

    if (lastItem.index >= monthsToShow?.length - 1 && hasMorePhotos && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [
    hasMorePhotos,
    fetchNextPage,
    monthsToShow?.length,
    isFetchingNextPage,
    virtualizer.getVirtualItems(),
  ]);

  const items = virtualizer.getVirtualItems();

  if (!photoLibraryPart || !photoLibrary || !monthsToShow) {
    return null;
  }

  return (
    <div ref={parentRef}>
      <div
        className="relative w-full"
        style={{
          height: virtualizer.getTotalSize(),
        }}
      >
        <div
          className="absolute top-0 left-0 w-full"
          style={{
            transform: `translateY(${items[0].start - virtualizer.options.scrollMargin}px)`,
          }}
        >
          {items.map((virtualRow) => {
            const isLoaderRow = virtualRow.index > monthsToShow.length - 1;
            if (isLoaderRow) {
              return hasMorePhotos || isFetchingNextPage ? (
                <div className="mt-5 animate-pulse" key={'loading'}>
                  {t('Loading...')}
                </div>
              ) : (
                <div className="mt-5 italic opacity-50" key={'no-more'}>
                  {t('No more photos')}
                </div>
              );
            }

            const monthMeta = monthsToShow[virtualRow.index];

            const year = monthMeta.monthDate.year;
            const month = monthMeta.monthDate.month;
            const days = Object.keys(monthMeta.days).reverse();

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
              >
                <h1 className="text-2xl">
                  {createDateObject(year, month).toLocaleDateString(undefined, monthFormat)}
                </h1>
                {days.map((day) => {
                  return (
                    <PhotoSection
                      title={createDateObject(year, month, day).toLocaleDateString(
                        undefined,
                        dateFormat
                      )}
                      targetDrive={PhotoConfig.PhotoDrive}
                      photos={photoLibrary[year][month][day]}
                      key={`${year}-${month}-${day}`}
                      toggleSelection={toggleSelection}
                      isSelected={isSelected}
                      isSelecting={isSelecting}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const PhotoSection = ({
  title,
  targetDrive,
  photos,
  toggleSelection,
  isSelected,
  isSelecting,
}: {
  title: string;
  targetDrive: TargetDrive;
  photos: DriveSearchResult[];
  toggleSelection: (fileId: string) => void;
  isSelected: (fileId: string) => boolean;
  isSelecting?: boolean;
}) => {
  return (
    <section className="mb-5">
      <h2 className="text-md mb-2 text-slate-600 dark:text-slate-400">{title}</h2>
      <div className={gridClasses}>
        {photos.map((photoDsr) => {
          return (
            <PhotoItem
              targetDrive={targetDrive}
              photoDsr={photoDsr}
              key={photoDsr.fileId}
              toggleSelection={toggleSelection}
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

const PhotoItem = ({
  targetDrive,
  photoDsr,
  toggleSelection,
  isSelected,
  isSelecting,
}: {
  targetDrive: TargetDrive;
  photoDsr: DriveSearchResult;
  toggleSelection: (fileId: string) => void;
  isSelected: (fileId: string) => boolean;
  isSelecting?: boolean;
}) => {
  const [isInView, setIsInView] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  useIntersection(wrapperRef, () => {
    setIsInView(true);
  });

  if (!photoDsr || !photoDsr.fileMetadata.appData.additionalThumbnails) {
    return null;
  }

  const aspect = getAspectRatioFromThumbnails(photoDsr.fileMetadata.appData.additionalThumbnails);
  const isChecked = photoDsr?.fileId && isSelected(photoDsr?.fileId);

  return (
    <div className={`${divClasses} relative ${isChecked ? 'bg-indigo-200' : ''}`}>
      <Link
        to={`/photo/${photoDsr.fileId}`}
        className="cursor-pointer"
        onClick={(e) => {
          if (isSelecting) {
            e.preventDefault();
            toggleSelection(photoDsr.fileId);
          }
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
            <PhotoWithLoader
              fileId={photoDsr.fileId}
              targetDrive={targetDrive}
              previewThumbnail={photoDsr?.fileMetadata.appData.previewThumbnail}
              size={{ pixelWidth: 200, pixelHeight: 200 }}
              fit="cover"
            />
          ) : null}
        </div>
        <div className="group absolute inset-0 hover:bg-opacity-50 hover:bg-gradient-to-b hover:from-[#00000080]">
          <button
            className={`pl-2 pt-2 group-hover:block ${isChecked ? 'block' : 'hidden'}`}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              toggleSelection(photoDsr.fileId);
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

export default PhotoLibrary;
