import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useEffect, useMemo } from 'react';
import {
  Alert,
  Button,
  Dimensions,
  FlatList,
  Image,
  Platform,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from '../components/ui/Text/Text';

import { SettingsStackParamList } from '../app/App';
import { SafeAreaView } from '../components/ui/SafeAreaView/SafeAreaView';
import { Container } from '../components/ui/Container/Container';
import { useKeyValueStorage } from '../hooks/auth/useEncryptedStorage';
import { useSyncFrom, useSyncFromCameraRoll } from '../hooks/cameraRoll/useSyncFromCameraRoll';
import { hasAndroidPermission } from '../hooks/cameraRoll/permissionHelper';
import { useCameraRoll } from '../hooks/cameraRoll/useCameraRoll';
import { PhotoIdentifier } from '@react-native-camera-roll/camera-roll';
import { PhotoConfig, useFileHeaderByUniqueId } from 'photo-app-common';
import { getUniqueId } from '../provider/photos/RNPhotoProvider';
import { Colors } from '../app/Colors';
import { CloudIcon } from '../components/ui/Icons/icons';
import { useUploadPhoto } from '../hooks/photo/useUploadPhoto';

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

  // On open, directly check for permissions
  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') hasAndroidPermission();
    })();
  }, []);

  return (
    <SafeAreaView>
      {syncFromCameraRoll ? (
        <GalleryView>
          <Container>
            <View style={{ display: 'flex', flexDirection: 'column' }}>
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
                          Last sync: {new Date(lastSyncAsInt).toLocaleString(undefined, dateFormat)}
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
            </View>
          </Container>
        </GalleryView>
      ) : (
        <Container>
          <Text
            style={{
              marginVertical: 16,
            }}
          >
            Back-up your cameraroll into your identity. Your photos will remain secured and only
            acessible by you.
          </Text>
          <Text style={{ opacity: 0.4 }}>
            During alpha, we only support auto synchronizing recent media
          </Text>
          <Button title="Enable" onPress={() => setSyncFromCameraRoll(true)} />
        </Container>
      )}
    </SafeAreaView>
  );
};

const GalleryView = ({ children }: { children: ReactElement }) => {
  const {
    data: cameraRoll,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCameraRoll().fetch;

  const flatPhotos = useMemo(
    () => cameraRoll?.pages.flatMap((page) => page.edges) || [],
    [cameraRoll]
  );

  const windowSize = Dimensions.get('window');
  const numColums = Math.round(windowSize.width / PREFFERED_IMAGE_SIZE);
  const size = Math.round(windowSize.width / numColums);

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
        ListHeaderComponent={children}
        renderItem={(item) => <GalleryItem size={size} item={item.item} key={item.item.node.id} />}
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
              No available media
            </Text>
          </>
        }
        numColumns={numColums}
        onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
      />
    </View>
  );
};

const GalleryItem = ({ item, size }: { item: PhotoIdentifier; size: number }) => {
  const uniqueId = getUniqueId(item);
  const { data, isFetched } = useFileHeaderByUniqueId({
    targetDrive: PhotoConfig.PhotoDrive,
    photoUniqueId: uniqueId,
  });

  const { mutate: uploadPhoto, status: uploadStatus } = useUploadPhoto().upload;

  const alreadyUploaded = (isFetched && data !== null) || uploadStatus === 'success';

  const fromTime = useSyncFrom();
  const pendingUploadInSync = item.node.timestamp * 1000 > fromTime;

  const onRequestSync = () => {
    if (alreadyUploaded || pendingUploadInSync) return;
    console.log('uploading', uniqueId, item.node.id);
    uploadPhoto(item);
  };

  return (
    <TouchableOpacity
      style={{
        width: size,
        height: size,
        padding: 1,
        position: 'relative',
        opacity: alreadyUploaded ? 0.5 : 1,
      }}
      onPress={onRequestSync}
    >
      {alreadyUploaded ? (
        <View style={{ position: 'absolute', bottom: 7, right: 7, zIndex: 10 }}>
          <CloudIcon color={Colors.white} size={'sm'} />
        </View>
      ) : (
        <View
          style={{
            position: 'absolute',
            top: 7,
            left: 7,
            backgroundColor:
              uploadStatus !== 'idle' || pendingUploadInSync ? Colors.indigo[500] : undefined,
            width: 15,
            height: 15,
            borderRadius: 50,
            zIndex: 10,
            opacity: 1,
            borderColor: Colors.slate[200],
            borderWidth: 1,
          }}
        />
      )}
      <Image
        key={item.node.id}
        style={{
          width: size - 2,
          height: size - 2,
        }}
        source={{ uri: item.node.image.uri }}
      />
    </TouchableOpacity>
  );
};

export default SyncDetailsPage;
