import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadNew } from '../../provider/photos/RNPhotoProvider';
import { PhotoIdentifier } from '@react-native-camera-roll/camera-roll';
import { PhotoConfig, t, useDotYouClientContext, usePhotoLibrary } from 'photo-app-common';
import { useKeyValueStorage } from '../auth/useEncryptedStorage';
import { useErrors } from '../errors/useErrors';

export const useUploadPhoto = () => {
  const targetDrive = PhotoConfig.PhotoDrive;
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const { mutateAsync: addDayToLibrary } = usePhotoLibrary({
    targetDrive: PhotoConfig.PhotoDrive,
    type: 'photos',
  }).addDay;

  const { forceLowerQuality } = useKeyValueStorage();

  return {
    upload: useMutation({
      mutationFn: async (newPhoto: PhotoIdentifier) => {
        const uploadResult = await uploadNew(
          dotYouClient,
          targetDrive,
          undefined,
          newPhoto,
          forceLowerQuality
        );
        try {
          await addDayToLibrary({ date: uploadResult.userDate, type: 'photos' });
        } catch (err) {
          useErrors().add(err, t('Failed to update library index'));
        }

        return uploadResult;
      },
      onSuccess: (data) => {
        // Invalidate all the things...
        queryClient.invalidateQueries({ queryKey: ['photos', targetDrive.alias] });
        queryClient.invalidateQueries({
          queryKey: ['photo-header', targetDrive.alias, data?.imageUniqueId],
        });
      },
      onError: (error) => {
        console.log('error', error);
      },
    }),
  };
};
