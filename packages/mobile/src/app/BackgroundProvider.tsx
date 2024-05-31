import BackgroundFetch from 'react-native-background-fetch';
import headlessSync from './HeadlessSync';
import { useCallback, useEffect } from 'react';
import { Platform } from 'react-native';

export const BackgroundProvider = ({ children }: { children: React.ReactNode }) => {
  const initBackgroundFetch = useCallback(async () => {
    console.log('[BackgroundFetch] init');
    // BackgroundFetch event handler.
    const onEvent = async (taskId: string) => {
      console.log('[BackgroundFetch] task: ', taskId);

      await headlessSync();

      BackgroundFetch.finish(taskId);
    };

    // Timeout callback is executed when your Task has exceeded its allowed running-time.
    // You must stop what you're doing immediately BackgroundFetch.finish(taskId)
    const onTimeout = async (taskId: string) => {
      console.warn('[BackgroundFetch] TIMEOUT task: ', taskId);
      BackgroundFetch.finish(taskId);
    };

    // Initialize BackgroundFetch only once when component mounts.
    const status = await BackgroundFetch.configure(
      {
        minimumFetchInterval: 15,
        enableHeadless: true,
        requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
        requiresBatteryNotLow: true,
        startOnBoot: true,
        stopOnTerminate: false,
      },
      onEvent,
      onTimeout
    );

    console.log('[BackgroundFetch] configure status: ', status);
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      initBackgroundFetch();
    }
  }, [initBackgroundFetch]);

  return children;
};
