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

        await SyncTrigger.runSingleSync(
          newPhoto.uri?.replaceAll('file://', '') || '',
          parseInt(newPhoto.timestamp || '0'),
          newPhoto.type,
          uniqueId,
          newPhoto.width,
          newPhoto.height
        );

        try {
          invalidateLibrary('photos');
        } catch (err) {
          addError(queryClient, err, t('Failed to update library index'));
        }
      },
      onSuccess: () => {
        // Invalidate all the things...
        queryClient.invalidateQueries({ queryKey: ['photos', targetDrive.alias] });
      },
      onError: (error) => {
        console.log('error', error);
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
