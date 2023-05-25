import {
  ApiType,
  Disconnect,
  NotificationType,
  Subscribe,
  TypedConnectionNotification,
} from '@youfoundation/js-lib';
import { useRef, useEffect } from 'react';
import useAuth from '../auth/useAuth';
import { PhotoConfig } from '../../provider/photos/PhotoTypes';

// Wrapper for the notification subscriber within DotYouCore-js to add client side filtering of the notifications
export const useSocket = (
  subscriber: ((notification: TypedConnectionNotification) => void) | undefined,
  types: NotificationType[]
) => {
  const isConnected = useRef<boolean>(false);
  const { getDotYouClient, preauth } = useAuth();
  const dotYouClient = getDotYouClient();

  const localHandler = (notification: TypedConnectionNotification) => {
    console.log(notification);

    if (types?.length >= 1 && !types.includes(notification.notificationType)) return;
    subscriber && subscriber(notification);
  };

  useEffect(() => {
    (async () => {
      // TODO: Make sure this only runs once per user session
      await preauth();

      if (dotYouClient.getType() !== ApiType.App || !dotYouClient.getSharedSecret()) return;

      if (!isConnected.current) {
        isConnected.current = true;
        Subscribe(dotYouClient, [PhotoConfig.PhotoDrive], localHandler);
      }
    })();

    return () => {
      if (isConnected.current) {
        isConnected.current = false;
        try {
          Disconnect(localHandler);
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, []);

  return;
};
