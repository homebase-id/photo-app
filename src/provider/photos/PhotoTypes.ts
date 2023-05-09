import { toGuidId, TargetDrive } from '@youfoundation/js-lib';

export class PhotoConfig {
  static readonly DriveType: string = toGuidId('photos_drive');
  static readonly PhotoDrive: TargetDrive = {
    alias: toGuidId('standard_photos_drive'),
    type: PhotoConfig.DriveType,
  };
  static readonly FavoriteTag: string = toGuidId('favorite');
  static readonly MainTag: string = toGuidId('main-lib');
  static readonly AlbumDefinitionFileType: number = 400;
  static readonly PhotoLibraryMetadataFileType: number = 900;
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

export interface PhotoLibraryMetadata {
  fileId?: string;
  versionTag?: string;

  yearsWithMonths: {
    year: number;
    months: {
      month: number;
      days: {
        day: number;
        photosThisDay: number;
      }[];
      photosThisMonth: number;
    }[];
  }[];
  totalNumberOfPhotos: number;
}
