import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadNew } from '../../provider/photos/RNPhotoProvider';
import { PhotoIdentifier } from '@react-native-camera-roll/camera-roll';
import { PhotoConfig, useDotYouClientContext, usePhotoLibrary } from 'photo-app-common';

export const useUploadPhoto = () => {
  const targetDrive = PhotoConfig.PhotoDrive;
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const { mutateAsync: addDayToLibrary } = usePhotoLibrary({
    targetDrive: PhotoConfig.PhotoDrive,
    disabled: true,
    type: 'photos',
  }).addDay;

  return {
    upload: useMutation({
      mutationFn: async (newPhoto: PhotoIdentifier) => {
        const uploadResult = await uploadNew(dotYouClient, targetDrive, undefined, newPhoto);
        await addDayToLibrary({ date: uploadResult.userDate, type: 'photos' });

        return uploadResult;
      },
      onSettled: (data, error, _variables) => {
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
