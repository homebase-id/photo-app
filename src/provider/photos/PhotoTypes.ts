import { toGuidId, TargetDrive, ImageContentType, VideoContentType } from '@youfoundation/js-lib';

export class PhotoConfig {
  static readonly DriveType: string = toGuidId('photos_drive');
  static readonly PhotoDrive: TargetDrive = {
    alias: toGuidId('standard_photos_drive'),
    type: PhotoConfig.DriveType,
  };
  static readonly FavoriteTag: string = toGuidId('favorite');
  static readonly MainTag: string = toGuidId('main-lib');
  static readonly PinTag: string = toGuidId('pinned-from-apps');
  static readonly AlbumDefinitionFileType: number = 400;
  static readonly PhotoLibraryMetadataFileType: number = 900;
}

export interface FileLike {
  name: string;
  bytes: Uint8Array;
  size: number;
  type: ImageContentType | VideoContentType;
  lastModified?: number;
}

export interface PhotoFile {
  fileId: string;
  url: string;
}

export interface AlbumDefinition {
  fileId?: string;
  name: string;
  description?: string;
  tag: string;
}

export interface PhotoMetaYear {
  year: number;
  months: PhotoMetaMonth[];
}

interface PhotoMetaMonth {
  month: number;
  days: PhotoMetaDay[];
  photosThisMonth: number;
}

interface PhotoMetaDay {
  day: number;
  photosThisDay: number;
}

export interface PhotoLibraryMetadata {
  fileId?: string;
  versionTag?: string;
  lastUpdated?: number;

  yearsWithMonths: PhotoMetaYear[];
  totalNumberOfPhotos: number;
}
