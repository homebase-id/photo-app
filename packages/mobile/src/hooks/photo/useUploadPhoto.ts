import { toGuidId } from '@homebase-id/js-lib/helpers';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PhotoConfig, t, useManagePhotoLibrary } from 'photo-app-common';
import { NativeModules } from 'react-native';
import { Asset } from 'react-native-image-picker';
import { addError } from '../errors/useErrors';
const { SyncTrigger } = NativeModules;

export const useUploadPhoto = () => {
  const targetDrive = PhotoConfig.PhotoDrive;
  const queryClient = useQueryClient();

  const invalidateLibrary = useManagePhotoLibrary({
    targetDrive: PhotoConfig.PhotoDrive,
  }).invalidateLibrary;

  return {
    upload: useMutation({
      mutationFn: async (newPhoto: Asset) => {
        const uniqueId = getUniqueId(newPhoto);
        try {
          await SyncTrigger.runSingleSync(
            newPhoto.uri?.replaceAll('file://', '') || '',
            parseInt(newPhoto.timestamp || '0'),
            newPhoto.type,
            uniqueId,
            newPhoto.width,
            newPhoto.height
          );
        } catch (err) {
          if (
            err &&
            typeof err === 'object' &&
            'message' in err &&
            err.message === 'File already exists'
          ) {
            return;
          }
          throw err;
        }
      },
      onSuccess: () => {
        // Invalidate all the things...
        invalidateLibrary('photos');

        queryClient.invalidateQueries({ queryKey: ['photos', targetDrive.alias] });
        queryClient.invalidateQueries({
          queryKey: ['photos-infinite', targetDrive.alias],
          exact: false,
        });
      },
      onError: (error) => {
        console.log(error.message === 'File already exists');
        addError(queryClient, error, t('Failed to upload photo'));
      },
    }),
  };
};

const getUniqueId = (item: Asset) => {
  return item.id
    ? toGuidId(item.id as string)
    : toGuidId(`${item.fileSize}_${item.width}x${item.height}`);
};
