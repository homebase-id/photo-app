import { useCallback, useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';
import {
  cleanupLocalDb,
  syncHeaderFile,
  syncLocalDb,
} from '../../provider/drive/LocalDbProvider';
import {
  ClientFileNotification,
  Disconnect,
  MediaConfig,
  Subscribe,
  TypedConnectionNotification,
} from '@youfoundation/js-lib/core';
import { useQueryClient } from '@tanstack/react-query';
import {
  useFlatPhotosFromDate,
  usePhotosByMonth,
} from '../photoLibrary/usePhotos';
import { PhotoConfig } from '../../provider/photos/PhotoTypes';
import useAuth from '../auth/useAuth';
import { useKeyValueStorage } from '../auth/useEncryptedStorage';

const targetDrive = PhotoConfig.PhotoDrive;

const useDbSync = () => {
  const {
    lastQueryBatchCursor,
    setLastQueryBatchCursor,
    mostRecentQueryModifiedTime,
    setMostRecentQueryModifiedTime,
  } = useKeyValueStorage();
  const isConnected = useRef<boolean>(false);
  const { getDotYouClient, authToken } = useAuth();
  const dotYouClient = getDotYouClient();
  const queryClient = useQueryClient();

  const isFetching = useRef<boolean>(false);
  const isFinished = useRef<boolean>(false);

  const invalidatePhotos = usePhotosByMonth({}).invalidateQueries;
  const invalidateFlatPhotos = useFlatPhotosFromDate({}).invalidateFlatPhotos;

  const localHandler = useCallback(
    async (notification: TypedConnectionNotification) => {
      if (
        ['fileAdded', 'fileDeleted', 'fileModified'].includes(
          notification.notificationType,
        )
      ) {
        const fileNotification = notification as ClientFileNotification;
        if (
          fileNotification.header.fileMetadata.appData.fileType ===
          MediaConfig.MediaFileType
        ) {
          await syncHeaderFile(
            dotYouClient,
            targetDrive,
            fileNotification.header.fileId,
          );
          await invalidatePhotos();
          await invalidateFlatPhotos();
          queryClient.invalidateQueries({
            queryKey: [
              'photo-meta',
              targetDrive?.alias,
              fileNotification.header.fileId,
            ],
          });
        } else if (
          fileNotification.header.fileMetadata.appData.fileType ===
          PhotoConfig.PhotoLibraryMetadataFileType
        )
          queryClient.invalidateQueries({ queryKey: ['photo-library'] });
      }
    },
    [dotYouClient, queryClient, invalidatePhotos, invalidateFlatPhotos],
  );

  useEffect(() => {
    (async () => {
      if (!isConnected.current) {
        isConnected.current = true;
        Subscribe(dotYouClient, [PhotoConfig.PhotoDrive], localHandler, {
          headers: { Cookie: `BX0900=${authToken}` },
        });
      }
    })();

    return () => {
      try {
        // console.log('Disconnecting...');
        Disconnect(localHandler);
        if (isConnected.current) isConnected.current = false;
      } catch (e) {
        // Client might not be connected; Checking local ref isn't enough
        // console.error(e);
      }
    };
  }, [dotYouClient, localHandler, authToken]);

  InteractionManager.runAfterInteractions(async () => {
    setTimeout(async () => {
      // Only one to start/run per startup;
      if (isFetching.current || isFinished.current) return;

      isFetching.current = true;

      console.log('Syncing photo drive...');
      const { cursor, queryTime } = await syncLocalDb(
        dotYouClient,
        targetDrive,
        {
          fileType: [MediaConfig.MediaFileType],
        },
        {
          // lastQueryBatchCursor: undefined,
          // mostRecentQueryModifiedTime: undefined,
          lastQueryBatchCursor: lastQueryBatchCursor || undefined,
          mostRecentQueryModifiedTime: mostRecentQueryModifiedTime
            ? parseInt(mostRecentQueryModifiedTime)
            : undefined,
        },
      );

      setLastQueryBatchCursor(cursor);
      setMostRecentQueryModifiedTime(queryTime.toString());

      console.log('Synced photo drive!', { cursor, queryTime });

      // When syncing is done, invalidate the queries to refetch their data
      invalidatePhotos();
      invalidateFlatPhotos();

      isFetching.current = false;
      isFinished.current = true;
    }, 1000);
  });

  return {
    // We can assume we have data, if we have a cursor or we are finished
    haveData: !!lastQueryBatchCursor || isFinished.current,
    cleanup: () => {
      setLastQueryBatchCursor('');
      setMostRecentQueryModifiedTime('');
      cleanupLocalDb();
    },
  };
};

export default useDbSync;
