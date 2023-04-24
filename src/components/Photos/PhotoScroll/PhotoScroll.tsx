import React, { useMemo, useState } from 'react';
import usePhotoLibrary from '../../../hooks/photoLibrary/usePhotoLibrary';
import { PhotoConfig } from '../../../provider/photos/PhotoTypes';
import { buildMetaStructure, sortRecents } from '../PhotoLibrary/PhotoLibrary';

const createDateObject = (year: string, month: string, day?: string) => {
  const newDate = new Date();
  newDate.setFullYear(parseInt(year));
  newDate.setMonth(parseInt(month) - 1);

  if (day) newDate.setDate(parseInt(day));

  return newDate;
};

const monthFormat: Intl.DateTimeFormatOptions = {
  month: 'short',
  year: 'numeric',
};

const PhotoScroll = ({ albumKey }: { albumKey?: string }) => {
  const [overlayData, setOverlayData] = useState<{ year: string; month: string } | undefined>(
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

  const { data: library } = usePhotoLibrary({
    targetDrive: PhotoConfig.PhotoDrive,
    album: albumKey && albumKey !== 'new' ? albumKey : undefined,
  }).fetchLibrary;

  if (!library) return null;
  const libStruc = buildMetaStructure(library);
  if (!libStruc) return null;

  const totalPhotos = library.length;
  const photoWeight = 100 / totalPhotos;

  const years = sortRecents(Object.keys(libStruc));
  const yearsWithMonths = years.map((year) => {
    const months = Object.keys(libStruc[year]);
    return {
      year: year,
      months: sortRecents(months).map((month) => {
        const days = Object.keys(libStruc[year][month]);

        return {
          month,
          photos: days.flatMap((day) => {
            return libStruc[year][month][day];
          }),
        };
      }),
    };
  });

  if (yearsWithMonths.length === 1 && yearsWithMonths[0].months.length <= 2) return null;

  return (
    <div
      className="fixed bottom-0 right-0 top-[3.5rem] hidden cursor-row-resize select-none px-1 opacity-0 transition-opacity hover:opacity-100 sm:block"
      onMouseLeave={() => setOverlayData(undefined)}
      onMouseMove={(e) => {
        setOverlayTop(e.clientY);
      }}
      onMouseDown={() => setMouseDown(true)}
      onMouseUp={() => setMouseDown(false)}
      onMouseOver={() => mouseDown && console.log(overlayData)}
      onClick={() => console.log(overlayData)}
    >
      <ol className="flex h-[calc(100vh-3.5rem)] flex-col items-center justify-between">
        {yearsWithMonths.map((year) => (
          <React.Fragment key={year.year}>
            {year.months.map((month) => (
              <MonthItem
                year={year.year}
                month={month.month}
                photos={month.photos}
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
          className="pointer-events-none fixed right-0 top-0 z-20 border-b bg-white"
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
  year: string;
  month: string;
  photos: unknown[];
  photoWeight: number;
  setOverlayData: (year: string, month: string) => void;
}) => {
  return (
    <li
      className="flex w-full flex-col-reverse items-end pr-2"
      key={month}
      style={{ flexBasis: `${photos.length * photoWeight}vh` }}
      data-month={month}
      onMouseEnter={() => setOverlayData(year, month)}
    >
      <span className="h-1 w-1 rounded-full bg-slate-400"></span>
    </li>
  );
};

export default PhotoScroll;
