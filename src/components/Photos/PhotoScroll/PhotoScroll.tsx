import React, { useMemo, useState } from 'react';
import usePhotoLibrary from '../../../hooks/photoLibrary/usePhotoLibrary';
import { PhotoConfig } from '../../../provider/photos/PhotoTypes';
import { mergeByteArrays, uint8ArrayToBase64 } from '@youfoundation/js-lib';
import { buildMetaStructure, sortRecents } from '../../../hooks/photoLibrary/usePhotoLibraryPart';

const createDateObject = (year: string, month: string, day?: string) => {
  const newDate = new Date();
  newDate.setFullYear(parseInt(year));
  newDate.setMonth(parseInt(month) - 1);

  if (day) newDate.setDate(parseInt(day));

  return newDate;
};

const convertTimeToGuid = (time: number) => {
  //Convert time number to guid string

  // One year is 3600*24*365.25*1000 = 31,557,600,000 milliseconds (35 bits)
  // Use 9 bits for the years, for a total of 44 bits (5½ bytes)
  // Thus able to hold 557 years since 1970-01-01
  // The counter is 12 bits, for a total of 4096, which gets us to ~1/4ns per guid before clash / wait()
  // Total bit usage of millisecond time+counter is thus 44+12=56 bits aka 7 bytes

  // Create 56 bits (7 bytes) {milliseconds (44 bits), _counter(12 bits)}
  // The counter is naught, since we're constructing this from the UNIX timestamp
  //
  const millisecondsCtr = (BigInt(time) << BigInt(12)) | BigInt(0);

  // I wonder if there is a neat way to not have to both create this and the GUID.
  const byte16 = new Uint8Array(16);
  byte16.fill(0);
  byte16[0] = Number((millisecondsCtr >> BigInt(48)) & BigInt(0xff));
  byte16[1] = Number((millisecondsCtr >> BigInt(40)) & BigInt(0xff));
  byte16[2] = Number((millisecondsCtr >> BigInt(32)) & BigInt(0xff));
  byte16[3] = Number((millisecondsCtr >> BigInt(24)) & BigInt(0xff));
  byte16[4] = Number((millisecondsCtr >> BigInt(16)) & BigInt(0xff));
  byte16[5] = Number((millisecondsCtr >> BigInt(8)) & BigInt(0xff));
  byte16[6] = Number((millisecondsCtr >> BigInt(0)) & BigInt(0xff));

  return byte16;
};

const int64ToBytes = (value: number) => {
  const byte8 = new Uint8Array(8);
  const bigValue = BigInt(value);

  byte8[0] = Number((bigValue >> BigInt(56)) & BigInt(0xff));
  byte8[1] = Number((bigValue >> BigInt(48)) & BigInt(0xff));
  byte8[2] = Number((bigValue >> BigInt(40)) & BigInt(0xff));
  byte8[3] = Number((bigValue >> BigInt(32)) & BigInt(0xff));
  byte8[4] = Number((bigValue >> BigInt(24)) & BigInt(0xff));
  byte8[5] = Number((bigValue >> BigInt(16)) & BigInt(0xff));
  byte8[6] = Number((bigValue >> BigInt(8)) & BigInt(0xff));
  byte8[7] = Number(bigValue & BigInt(0xff));

  return byte8;
};

const buildCursor = (unixTimeInMs: number) => {
  let bytes = mergeByteArrays([
    convertTimeToGuid(unixTimeInMs),
    new Uint8Array(new Array(16)),
    new Uint8Array(new Array(16)),
  ]);

  const nullBytes = mergeByteArrays([
    new Uint8Array([1]),
    new Uint8Array([0]),
    new Uint8Array([0]),
  ]);

  const bytes2 = mergeByteArrays([
    int64ToBytes(unixTimeInMs),
    new Uint8Array(new Array(8)),
    new Uint8Array(new Array(8)),
  ]);

  bytes = mergeByteArrays([bytes, nullBytes, bytes2]);

  return uint8ArrayToBase64(bytes);
};

const monthFormat: Intl.DateTimeFormatOptions = {
  month: 'short',
  year: 'numeric',
};

const PhotoScroll = ({
  albumKey,
  onJumpInTime,
}: {
  albumKey?: string;
  onJumpInTime: (cursor: string) => void;
}) => {
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

  const { data: photoLib } = usePhotoLibrary({
    targetDrive: PhotoConfig.PhotoDrive,
    album: albumKey && albumKey !== 'new' ? albumKey : undefined,
  }).fetchLibrary;

  if (!photoLib) return null;
  const { yearsWithMonths, photoWeight } = photoLib;

  const intoThePast = (time?: { year: string; month: string }) => {
    if (!time) return;

    const dateObject = createDateObject(time.year, time.month);
    const cursor = buildCursor(dateObject.getTime());
    console.log('jump to', { dateObject, cursor });
    onJumpInTime(cursor);
  };

  // if (yearsWithMonths.length === 1 && yearsWithMonths[0].months.length <= 2) return null;

  return (
    <div
      className="fixed bottom-0 right-0 top-[3.5rem] hidden cursor-row-resize select-none px-1 opacity-0 transition-opacity hover:opacity-100 sm:block"
      onMouseLeave={() => setOverlayData(undefined)}
      onMouseMove={(e) => {
        setOverlayTop(e.clientY);
      }}
      onMouseDown={() => setMouseDown(true)}
      onMouseUp={() => setMouseDown(false)}
      onMouseOver={() => mouseDown && intoThePast(overlayData)}
      onClick={() => intoThePast(overlayData)}
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
  photos: number;
  photoWeight: number;
  setOverlayData: (year: string, month: string) => void;
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
