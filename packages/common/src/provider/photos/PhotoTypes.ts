import { TargetDrive, ImageContentType } from '@youfoundation/js-lib/core';
import { toGuidId } from '@youfoundation/js-lib/helpers';
import { VideoContentType } from '@youfoundation/js-lib/media';

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
  versionTag?: string;
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
  // days: PhotoMetaDay[];
  photosThisMonth: number;
}

export interface PhotoMetaDay {
  day: number;
  photosThisDay: number;
}

export type LibraryType = 'bin' | 'archive' | 'apps' | 'favorites' | 'photos';

export interface PhotoLibraryMetadata {
  fileId?: string;
  versionTag?: string;
  lastUpdated?: number;
  lastCursor?: number;

  yearsWithMonths: PhotoMetaYear[];
  totalNumberOfPhotos: number;
}
