// import { ImageMetadata } from '@homebase-id/js-lib/media';
import { toGuidId } from '@homebase-id/js-lib/helpers';

// import Exif from 'react-native-exif';
import { PhotoIdentifier } from '@react-native-camera-roll/camera-roll';

// const elaborateDateParser = (dateString: string) => {
//   try {
//     if (!isNaN(Date.parse(dateString))) return new Date(dateString);

//     const dateParts = dateString.split(' ');
//     const timeParts = dateParts[1].split(':');

//     const alteredDate = dateParts[0].replaceAll(':', '-');
//     if (!isNaN(Date.parse(alteredDate))) {
//       const returnDate = new Date(alteredDate);
//       returnDate.setHours(parseInt(timeParts[0]));
//       returnDate.setMinutes(parseInt(timeParts[1]));
//       returnDate.setSeconds(parseInt(timeParts[2]));

//       return returnDate;
//     }
//   } catch {
//     return undefined;
//   }
// };

// const getPhotoExifMeta = async (
//   photo: PhotoIdentifier
// ): Promise<{
//   imageMetadata: ImageMetadata | undefined;
//   dateTimeOriginal: undefined | Date;
// }> => {
//   if (!photo.node.image.filepath && !photo.node.image.uri) {
//     return {
//       imageMetadata: undefined,
//       dateTimeOriginal: undefined,
//     };
//   }

//   return (
//     Exif.getExif(photo.node.image.filepath || photo.node.image.uri)
//       // eslint-disable-next-line @typescript-eslint/no-explicit-any
//       .then((metadata: { exif: any }) => {
//         const exifData = metadata.exif;
//         if (!exifData) {
//           return {
//             imageMetadata: undefined,
//             dateTimeOriginal: undefined,
//           };
//         }

//         const dateTimeOriginal = elaborateDateParser(
//           exifData['{Exif}']?.DateTimeOriginal || exifData.DateTimeDigitized || exifData.DateTime
//         );
//         const imageMetadata: ImageMetadata | undefined = metadata
//           ? {
//               camera: {
//                 make: exifData['{TIFF}']?.Make || exifData.Make,
//                 model: exifData['{TIFF}']?.Model || exifData.Model,
//                 lens: exifData['{ExifAux}']?.LensModel || exifData.LensModel,
//               },
//               captureDetails: {
//                 exposureTime: exifData['{Exif}']?.ExposureTime || exifData.ExposureTime,
//                 fNumber: exifData['{Exif}']?.FNumber || exifData.FNumber,
//                 iso: (exifData['{Exif}']?.ISOSpeedRatings || [exifData.ISOSpeedRatings] || [
//                     undefined,
//                   ])[0],
//                 focalLength: exifData['{Exif}']?.FocalLength || exifData.FocalLength,
//                 geolocation:
//                   exifData['{GPS}']?.latitude && exifData['{GPS}']?.longitude
//                     ? {
//                         latitude: exifData['{GPS}'].latitude,
//                         longitude: exifData['{GPS}'].longitude,
//                         altitude: exifData['{GPS}'].altitude,
//                       }
//                     : exifData?.GPSLatitude && exifData?.GPSLongitude
//                       ? {
//                           latitude: exifData.GPSLatitude,
//                           longitude: exifData.GPSLongitude,
//                           altitude: exifData.GPSAltitude,
//                         }
//                       : photo.node.location?.latitude && photo.node.location?.longitude
//                         ? {
//                             ...photo.node.location,
//                             latitude: photo.node.location.latitude as number,
//                             longitude: photo.node.location.longitude as number,
//                           }
//                         : undefined,
//               },
//             }
//           : undefined;

//         return { imageMetadata, dateTimeOriginal } as const;
//       })
//       .catch((ex: Error) => {
//         console.warn('Error getting exif data:', ex);
//         return {
//           imageMetadata: undefined,
//           dateTimeOriginal: undefined,
//         };
//       })
//   );
// };

// const mimeTypes = [
//   { ext: 'jpg', mime: 'image/jpeg' },
//   { ext: 'jpeg', mime: 'image/jpeg' },
//   { ext: 'png', mime: 'image/png' },
//   { ext: 'gif', mime: 'image/gif' },
//   { ext: 'webp', mime: 'image/webp' },
//   { ext: 'mp4', mime: 'video/mp4' },
//   { ext: 'avi', mime: 'video/avi' },
//   { ext: 'mp3', mime: 'video/mp3' },
//   { ext: 'mov', mime: 'video/mov' },
//   { ext: 'mpg', mime: 'video/mpg' },
//   { ext: 'mpeg', mime: 'video/mpeg' },
//   { ext: 'bmp', mime: 'image/bmp' },
//   { ext: 'raw', mime: 'image/raw' },
// ];

// const getMimeType = (fileName?: string) => {
//   if (!fileName) return 'application/octet-stream'; // default to binary (unknown)

//   const fileExt = fileName.split('.').pop()?.toLowerCase();
//   return mimeTypes.find((m) => m.ext === fileExt)?.mime || 'application/octet-stream';
// };

export const getUniqueId = (item: PhotoIdentifier) => {
  return item.node.id
    ? toGuidId(item.node.id as string)
    : toGuidId(`${item.node.image.filename}_${item.node.image.width}x${item.node.image.height}`);
};

export type PageParam = {
  skip?: number;
  take: number;
};
