import { toGuidId, TargetDrive } from '@youfoundation/js-lib';

export class PhotoConfig {
  static readonly DriveType: string = toGuidId('photos_drive');
  static readonly PhotoDrive: TargetDrive = {
    alias: toGuidId('standard_photos_drive'),
    type: PhotoConfig.DriveType,
  };
  static readonly FavoriteTag: string = toGuidId('favorite');
  static readonly AlbumDefinitionFileType: number = 400;
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
