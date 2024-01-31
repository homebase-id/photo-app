import { createDateObject, usePhotoLibrary, PhotoConfig, LibraryType } from 'photo-app-common';
import React, { useEffect, useMemo, useRef, useState } from 'react';

const monthFormat: Intl.DateTimeFormatOptions = {
  month: 'short',
  year: 'numeric',
};

const PhotoScroll = ({
  type,
  onJumpInTime,
  onScroll,
}: {
  type: LibraryType;
  onJumpInTime: (time: { year: number; month: number }) => void;
  onScroll?: (scrollPercentage: number) => void;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollBarSize, setScrollBarSize] = useState(0);
  const [overlayData, setOverlayData] = useState<{ year: number; month: number } | undefined>(
    undefined
  );
  const overlayText = useMemo(() => {
    if (!overlayData) return null;
    return createDateObject(overlayData.year, overlayData.month).toLocaleDateString(
      undefined,
      monthFormat
    );
  }, [overlayData]);

  const [overlayTop, setOverlayTop] = useState<number>(0);

  const [mouseDown, setMouseDown] = useState(false);

  const { data: photoLib } = usePhotoLibrary({
    targetDrive: PhotoConfig.PhotoDrive,
    type: type,
  }).fetchLibrary;

  if (!photoLib) return null;
  const { yearsWithMonths, totalNumberOfPhotos } = photoLib;
  const photoWeight = 100 / totalNumberOfPhotos;

  const jumpIntoThePast = (time?: { year: number; month: number }) => {
    if (!time) return;

    onJumpInTime(time);
  };

  const doScrollThroughTime = (scrollPercentage: number) => {
    onScroll && onScroll(scrollPercentage);
  };

  useEffect(() => {
    setScrollBarSize(scrollRef?.current?.clientHeight || 0);
  }, [scrollRef?.current]);

  return (
    <div
      className="fixed bottom-0 right-0 top-[3.5rem] hidden cursor-row-resize select-none px-1 opacity-0 transition-opacity hover:opacity-100 sm:block"
      onMouseLeave={() => {
        setOverlayData(undefined);
        setMouseDown(false);
      }}
      onMouseMove={(e) => {
        setOverlayTop(e.clientY);
        if (mouseDown) {
          doScrollThroughTime(e.clientY / scrollBarSize);
        }
      }}
      onMouseDown={() => setMouseDown(true)}
      onMouseUp={() => setMouseDown(false)}
      onMouseOver={() => mouseDown && jumpIntoThePast(overlayData)}
      onClick={() => jumpIntoThePast(overlayData)}
      ref={scrollRef}
    >
      <ol className="flex h-[calc(100vh-3.5rem)] flex-col items-center justify-between">
        {yearsWithMonths.map((year) => (
          <React.Fragment key={year.year}>
            {year.months.map((month) => (
              <MonthItem
                year={year.year}
                month={month.month}
                photos={month.photosThisMonth}
                photoWeight={photoWeight}
                key={`${year.year}+${month.month}`}
                setOverlayData={(year, month) => setOverlayData({ year, month })}
              />
            ))}
            <li className="bold text-sm">{year.year}</li>
          </React.Fragment>
        ))}
      </ol>
      {overlayData ? (
        <span
          className="pointer-events-none fixed right-0 top-0 z-20 border-b bg-white dark:bg-black"
          style={{ transform: `translateY(${overlayTop}px)` }}
        >
          {overlayText}
        </span>
      ) : null}
    </div>
  );
};

const MonthItem = ({
  year,
  month,
  photos,
  photoWeight,
  setOverlayData,
}: {
  year: number;
  month: number;
  photos: number;
  photoWeight: number;
  setOverlayData: (year: number, month: number) => void;
}) => {
  return (
    <li
      className="flex w-full flex-col-reverse items-end pr-2"
      key={month}
      style={{ flexBasis: `${photos * photoWeight}vh` }}
      data-month={month}
      onMouseEnter={() => setOverlayData(year, month)}
    >
      <span className="h-1 w-1 rounded-full bg-slate-400"></span>
    </li>
  );
};

export default PhotoScroll;
