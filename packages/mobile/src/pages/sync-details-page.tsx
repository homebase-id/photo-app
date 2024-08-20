import { HeaderBackButton, Header } from '@react-navigation/elements';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Dimensions,
  FlatList,
  Image,
  ListRenderItemInfo,
  Platform,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from '../components/ui/Text/Text';

import { SettingsStackParamList } from '../app/App';
import { SafeAreaView } from '../components/ui/SafeAreaView/SafeAreaView';
import { Container } from '../components/ui/Container/Container';
import { useKeyValueStorage } from '../hooks/auth/useEncryptedStorage';
import { useSyncFrom } from '../hooks/cameraRoll/useSyncFromCameraRoll';
import { hasAndroidPermission } from '../hooks/cameraRoll/permissionHelper';
import { useCameraRoll } from '../hooks/cameraRoll/useCameraRoll';
import { PhotoIdentifier } from '@react-native-camera-roll/camera-roll';
import { PhotoConfig, t, useFileHeaderByUniqueId } from 'photo-app-common';
import { getUniqueId } from '../provider/photos/RNPhotoProvider';
import { Colors } from '../app/Colors';
import { CloudIcon, Cog } from '../components/ui/Icons/icons';
import { useDarkMode } from '../hooks/useDarkMode';
import { Modal } from '../components/ui/Modal/Modal';
import { NativeModules } from 'react-native';
const { SyncTrigger } = NativeModules;

type SettingsProps = NativeStackScreenProps<SettingsStackParamList, 'SyncDetails'>;

const PREFFERED_IMAGE_SIZE = 90;
const dateFormat: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
};

const SyncDetailsPage = (_props: SettingsProps) => {
  const navigation = _props.navigation;
  const { isDarkMode } = useDarkMode();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { setSyncFromCameraRoll, syncFromCameraRoll, lastCameraRollSyncTime } =
    useKeyValueStorage();

  const doSyncNow = async () => SyncTrigger.runSync();

  // On open, directly check for permissions
  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') hasAndroidPermission();
    })();
  }, []);

  const headerLeft = () => (
    <HeaderBackButton
      style={{ position: 'absolute', left: 0 }}
      canGoBack={true}
      onPress={() => navigation.goBack()}
      label={'Settings'}
      labelVisible={true}
      tintColor={isDarkMode ? Colors.white : Colors.black}
    />
  );

  const headerRight = () => (
    <TouchableOpacity onPress={() => setIsSettingsOpen(true)} style={{ padding: 5 }}>
      <Cog color={isDarkMode ? Colors.white : Colors.black} size={'md'} />
    </TouchableOpacity>
  );

  return (
    <>
      <Header
        headerStyle={{
          backgroundColor: isDarkMode ? Colors.gray[900] : Colors.slate[50],
        }}
        headerShadowVisible={false}
        title={'Backup'}
        headerTintColor={isDarkMode ? Colors.white : Colors.black}
        headerTitleAlign="center"
        headerLeft={headerLeft}
        headerRight={headerRight}
      />
      <SafeAreaView>
        <GalleryView>
          {syncFromCameraRoll ? (
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
                    <>
                      {lastCameraRollSyncTime ? (
                        <>
                          {t('Last sync')}
                          {': '}
                          {new Date(lastCameraRollSyncTime).toLocaleString(undefined, dateFormat)}
                        </>
                      ) : (
                        t('Last sync: did not sync yet')
                      )}
                    </>
                  </Text>
                </View>

                {Platform.OS === 'android' ? (
                  <View style={Platform.OS === 'android' ? { paddingVertical: 16 } : undefined}>
                    <Button title="Sync now" onPress={doSyncNow} />
                  </View>
                ) : null}
              </View>
            </Container>
          ) : (
            <Container>
              <Text
                style={{
                  marginVertical: 16,
                }}
              >
                Back-up your cameraroll into your identity. Your photos will remain secure and only
                acessible by you.
              </Text>
              <Text style={{ opacity: 0.4 }}>
                During alpha, we only support auto synchronizing recent media
              </Text>
              <View style={Platform.OS === 'android' ? { paddingVertical: 16 } : undefined}>
                <Button title="Enable" onPress={() => setSyncFromCameraRoll(true)} />
              </View>
            </Container>
          )}
        </GalleryView>
      </SafeAreaView>
      {isSettingsOpen ? <SettingsModal onClose={() => setIsSettingsOpen(false)} /> : null}
    </>
  );
};

const GalleryView = memo(({ children }: { children: ReactElement }) => {
  const fromTime = useSyncFrom();

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

  // Upload queue
  const [uploadIndex, setUploadIndex] = useState(0);
  // const [uploadQueue, setUploadQueue] = useState<PhotoIdentifier[]>([]);

  // const {
  //   mutate: uploadPhoto,
  //   status: uploadStatus,
  //   reset: resetUpload,
  //   error: uploadError,
  // } = useUploadPhoto().upload;

  // const currentFile = uploadQueue[uploadIndex];
  // useEffect(() => {
  //   if (!currentFile) return;
  //   uploadPhoto(currentFile);
  // }, [currentFile, uploadPhoto]);

  // useEffect(() => {
  //   if (uploadStatus === 'success' || uploadStatus === 'error') {
  //     resetUpload();
  //     setUploadIndex((currentIndex) => currentIndex + 1);
  //   }
  // }, [uploadStatus, resetUpload, setUploadIndex]);

  const renderItem = useCallback(({ item }: ListRenderItemInfo<PhotoIdentifier>) => {
    return (
      <GalleryItem
        size={size}
        item={item}
        key={item.node.id}
        // addToUpload={(item: PhotoIdentifier) =>
        //   setUploadQueue((currentUploadQueue) => [...currentUploadQueue, item])
        // }
        fromTime={fromTime}
      />
    );
  }, []);

  return (
    <View
      style={{
        margin: -1,
      }}
    >
      {/* <ErrorNotification error={uploadError} /> */}
      <FlatList
        data={flatPhotos}
        key={numColums}
        style={{
          minHeight: '100%',
        }}
        ListHeaderComponent={children}
        renderItem={renderItem}
        ListEmptyComponent={
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
        }
        numColumns={numColums}
        onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
        ListFooterComponent={<View style={{ height: 90 }} />}
      />
    </View>
  );
});

const GalleryItem = memo(
  ({
    item,
    size,
    // addToUpload,
    fromTime,
  }: {
    item: PhotoIdentifier;
    size: number;
    // addToUpload: (photo: PhotoIdentifier) => void;
    fromTime: number;
  }) => {
    const uniqueId = getUniqueId(item);
    const { data, isFetched } = useFileHeaderByUniqueId({
      targetDrive: PhotoConfig.PhotoDrive,
      photoUniqueId: uniqueId,
    });

    // const [forceUpload, setForceUpload] = useState(false);
    const alreadyUploaded = isFetched && data !== null;
    const pendingUploadInSync = item.node.timestamp * 1000 > fromTime;

    // const onRequestSync = () => {
    //   if (alreadyUploaded || pendingUploadInSync || forceUpload) return;
    //   setForceUpload(true);

    //   console.log('uploading', uniqueId, item.node.id);
    //   addToUpload(item);
    // };

    return (
      <View
        style={{
          width: size,
          height: size,
          padding: 1,
          position: 'relative',
          opacity: alreadyUploaded ? 0.5 : 1,
        }}
        // onPress={onRequestSync}
      >
        {alreadyUploaded ? (
          <View style={{ position: 'absolute', bottom: 7, right: 7, zIndex: 10 }}>
            <CloudIcon color={Colors.white} size={'sm'} />
          </View>
        ) : pendingUploadInSync ? (
          <View
            style={{
              position: 'absolute',
              top: 7,
              left: 7,
              backgroundColor: pendingUploadInSync ? Colors.indigo[500] : undefined,
              width: 15,
              height: 15,
              borderRadius: 50,
              zIndex: 10,
              opacity: 1,
              borderColor: Colors.slate[200],
              borderWidth: 1,
            }}
          />
        ) : null}
        <Image
          key={item.node.id}
          style={{
            width: size - 2,
            height: size - 2,
          }}
          source={{ uri: item.node.image.uri }}
        />
      </View>
    );
  }
);

const SettingsModal = memo(({ onClose }: { onClose: () => void }) => {
  const {
    syncFromCameraRoll,
    setSyncFromCameraRoll,
    setForceLowerQuality,
    forceLowerQuality,
    setLastCameraRollSyncTime,
  } = useKeyValueStorage();

  return (
    <Modal onClose={onClose} title="Sync settings">
      <View
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              'Backup quality',
              `(currently: ${forceLowerQuality ? 'High quality' : 'Original quality'})`,
              [
                {
                  text: 'Original quality',
                  onPress: () => setForceLowerQuality(false),
                  style: 'default',
                },
                {
                  text: 'High quality (storage saver)',
                  onPress: () => setForceLowerQuality(true),
                  style: 'default',
                },
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
              ]
            );
          }}
        >
          <Text>Backup quality</Text>
          <Text style={{ color: Colors.slate[400], marginTop: 3 }}>
            {forceLowerQuality ? 'High quality' : 'Original quality'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              'Sync all',
              `This will include all your media since the year 2000, it may take a while (hours/days/weeks) before everything it synced.`,
              [
                {
                  text: 'Continue',
                  onPress: () => setLastCameraRollSyncTime(946684800000), // 1 Jan 2000 GMT
                  style: 'default',
                },
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
              ]
            );
          }}
        >
          <Text>Sync all</Text>
          <Text style={{ color: Colors.slate[400], marginTop: 3 }}>
            Reset the sync from time to include all your media
          </Text>
        </TouchableOpacity>

        {syncFromCameraRoll ? (
          <TouchableOpacity
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
          >
            <Text>Disable sync</Text>
            <Text style={{ color: Colors.slate[400], marginTop: 3 }}>
              Don&apos;t sync new media from my camera roll
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setSyncFromCameraRoll(true)}>
            <Text>Enable sync</Text>
            <Text style={{ color: Colors.slate[400], marginTop: 3 }}>
              Sync new media from my camera roll
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
});

export default SyncDetailsPage;
