import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactNode, useEffect, useMemo } from 'react';
import { Alert, Button, Dimensions, FlatList, Image, Platform, View } from 'react-native';
import { Text } from '../components/ui/Text/Text';

import { SettingsStackParamList } from '../app/App';
import { SafeAreaView } from '../components/ui/SafeAreaView/SafeAreaView';
import { Container } from '../components/ui/Container/Container';
import { useKeyValueStorage } from '../hooks/auth/useEncryptedStorage';
import { useSyncFromCameraRoll } from '../hooks/cameraRoll/useSyncFromCameraRoll';
import { hasAndroidPermission } from '../hooks/cameraRoll/permissionHelper';
import { useCameraRoll } from '../hooks/cameraRoll/useCameraRoll';

type SettingsProps = NativeStackScreenProps<SettingsStackParamList, 'Profile'>;

const PREFFERED_IMAGE_SIZE = 90;
const dateFormat: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
};

const SyncDetailsPage = (_props: SettingsProps) => {
  const [syncNowState, setSyncNowState] = React.useState<'idle' | 'pending' | 'finished'>('idle');

  const { setSyncFromCameraRoll, syncFromCameraRoll, lastCameraRollSyncTime } =
    useKeyValueStorage();
  const { forceSync } = useSyncFromCameraRoll(false);

  const doSyncNow = async () => {
    setSyncNowState('pending');
    await forceSync();
    setSyncNowState('finished');
  };
  const lastSyncAsInt = lastCameraRollSyncTime ? parseInt(lastCameraRollSyncTime || '') : null;

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') hasAndroidPermission();
    })();
  }, []);

  return (
    <SafeAreaView>
      <GalleryView>
        <Container>
          <View style={{ display: 'flex', flexDirection: 'column' }}>
            {syncFromCameraRoll ? (
              <>
                <View
                  style={{
                    marginLeft: 8,
                    marginTop: 8,
                    opacity: 0.5,
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <Text>
                    {syncNowState === 'idle' ? (
                      <>
                        {lastSyncAsInt ? (
                          <>
                            Last sync:{' '}
                            {new Date(lastSyncAsInt).toLocaleString(undefined, dateFormat)}
                          </>
                        ) : (
                          'Last sync: did not sync yet'
                        )}
                      </>
                    ) : (
                      <>
                        {syncNowState === 'pending'
                          ? 'Syncing...'
                          : syncNowState === 'finished'
                          ? 'Last sync: Just now'
                          : null}
                      </>
                    )}
                  </Text>
                </View>

                <View
                  style={{
                    marginTop: 'auto',
                    paddingTop: 8,
                    flexDirection: 'row-reverse',
                    justifyContent: 'space-between',
                  }}
                >
                  <Button title="Sync now" onPress={doSyncNow} />
                  <Button
                    title="Disable"
                    onPress={() =>
                      Alert.alert('Disable sync?', 'Your existing photos will not be removed', [
                        {
                          text: 'Disable',
                          onPress: () => setSyncFromCameraRoll(false),
                        },
                        {
                          text: 'Cancel',
                          style: 'cancel',
                        },
                      ])
                    }
                  />
                </View>
              </>
            ) : (
              <>
                <Text
                  style={{
                    marginTop: 16,
                  }}
                >
                  Back-up all media from now forward into your identity. Your photos will remain
                  secured and only acessible by you.
                </Text>
                <Button title="Enable" onPress={() => setSyncFromCameraRoll(true)} />
              </>
            )}
          </View>
        </Container>
      </GalleryView>
    </SafeAreaView>
  );
};

const GalleryView = ({ children }: { children: ReactNode }) => {
  const { lastCameraRollSyncTime } = useKeyValueStorage();
  const lastCameraRollSyncTimeAsInt = lastCameraRollSyncTime
    ? parseInt(lastCameraRollSyncTime)
    : new Date().getTime();

  const lastWeek = new Date().getTime() - 1000 * 60 * 60 * 24 * 7;
  const fromTime = Math.min(lastCameraRollSyncTimeAsInt, lastWeek);

  const {
    data: cameraRoll,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCameraRoll(fromTime).fetch;

  const flatPhotos = useMemo(
    () => cameraRoll?.pages.flatMap((page) => page.edges).map((edge) => edge.node) || [],
    [cameraRoll]
  );

  const windowSize = Dimensions.get('window');
  const numColums = Math.round(windowSize.width / PREFFERED_IMAGE_SIZE);
  const size = Math.round(windowSize.width / numColums);

  const anyPending = flatPhotos.length > 0;

  return (
    <View
      style={{
        margin: -1,
      }}
    >
      <FlatList
        data={flatPhotos}
        key={numColums}
        style={{
          minHeight: '100%',
        }}
        ListHeaderComponent={
          <>
            {children}
            {anyPending ? (
              <Text
                style={{ paddingHorizontal: Platform.OS === 'ios' ? 15 : 5, paddingBottom: 5 }}
              >{`${flatPhotos.length} pending upload`}</Text>
            ) : null}
          </>
        }
        renderItem={(item) => (
          <View
            key={item.item.id}
            style={{
              width: size,
              height: size,
              padding: 1,
              position: 'relative',
            }}
          >
            <Image
              key={item.item.id}
              style={{
                width: size - 2,
                height: size - 2,
              }}
              source={{ uri: item.item.image.uri }}
            />
          </View>
        )}
        ListEmptyComponent={
          <>
            <Text
              style={{
                paddingHorizontal: 5,
                paddingBottom: 5,
                textAlign: 'center',
                opacity: 0.5,
              }}
            >
              No recent media
            </Text>
            <Text
              style={{
                paddingHorizontal: 5,
                paddingBottom: 5,
                textAlign: 'center',
                opacity: 0.5,
              }}
            >
              During alpha, we only support synchronizing recent media
            </Text>
          </>
        }
        numColumns={numColums}
        onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
      />
    </View>
  );
};

export default SyncDetailsPage;
