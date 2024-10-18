import { HeaderBackButton, Header } from '@react-navigation/elements';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../app/App';
import {
  Dimensions,
  FlatList,
  ListRenderItemInfo,
  Platform,
  Pressable,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from '../components/ui/Text/Text';
import { PhotoWithLoader } from '../components/Photos/PhotoPreview/PhotoWithLoader';
import { memo, useCallback, useMemo, useState } from 'react';
import { Colors } from '../app/Colors';
import PhotoInfo from '../components/Photo/PhotoInfo';
import { DEFAULT_PAYLOAD_KEY, HomebaseFile } from '@homebase-id/js-lib/core';

import { VideoWithLoader } from '../components/Photos/PhotoPreview/VideoWithLoader';

import { useDarkMode } from '../hooks/useDarkMode';
import { InfoIcon } from '../components/ui/Icons/icons';
import { PhotoConfig, useAlbum, useFileHeader, usePhotosInfinte } from 'photo-app-common';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';

type PhotoProps = NativeStackScreenProps<RootStackParamList, 'PhotoPreview'>;
const targetDrive = PhotoConfig.PhotoDrive;

const Photo = ({ route, navigation }: PhotoProps) => {
  const { photoId: fileId } = route.params;

  const { data: fileHeader } = useFileHeader({
    targetDrive,
    photoFileId: fileId,
  });
  const currentDate = useMemo(
    () =>
      fileHeader
        ? new Date(fileHeader?.fileMetadata.appData.userDate || fileHeader?.fileMetadata.created)
        : undefined,
    [fileHeader]
  );

  const { isDarkMode } = useDarkMode();
  if (!currentDate || !fileHeader) return null;

  return (
    <View style={{ flex: 1, backgroundColor: isDarkMode ? Colors.gray[900] : Colors.slate[50] }}>
      <PhotoPreview
        route={route}
        navigation={navigation}
        currentDate={currentDate}
        fileHeader={fileHeader}
      />
    </View>
  );
};

interface PhotoLibPreviewProps extends PhotoProps {
  currentDate: Date;
  fileHeader: HomebaseFile;
}

const PhotoPreview = memo(
  ({ currentDate, fileHeader, route, navigation }: PhotoLibPreviewProps) => {
    const { typeId, albumId } = route.params;
    const isAlbumView = albumId || typeId === 'favorites';

    const { data: album } = useAlbum(albumId).fetch;

    const {
      data: photos,
      fetchNextPage: fetchPage,
      hasNextPage: hasPage,
      isFetched: hasFetchedPhotos,
    } = usePhotosInfinte({
      type: 'photos',
      targetDrive,
      album: albumId || (typeId === 'favorites' ? PhotoConfig.FavoriteTag : undefined),
      disabled: !!isAlbumView && !album,
    }).fetchPhotos;

    const flatPhotos = useMemo(
      () => photos?.pages.flatMap((page) => page.results) || [],
      [photos?.pages]
    );

    const initialIndex = useMemo(() => {
      return flatPhotos.findIndex((photo) => stringGuidsEqual(fileHeader.fileId, photo.fileId));
    }, [fileHeader, flatPhotos]);

    const doGoBack = useCallback(() => {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Home');
      }
    }, [navigation]);

    // The Flatlist need data before they can render, otherwise the intialOffset is set and only afterwards the data is rendered
    if ((!!isAlbumView && !album) || !hasFetchedPhotos || !flatPhotos) {
      return null;
    }

    return (
      <InnerPhotoPreview
        backTitle={isAlbumView ? album?.name || '' : 'Library'}
        goBack={doGoBack}
        fileHeader={fileHeader}
        photos={flatPhotos}
        fetchNextPage={fetchPage}
        hasNextPage={hasPage}
        initialDate={currentDate}
        initialIndex={initialIndex}
      />
    );
  }
);

const InnerPhotoPreview = memo(
  ({
    backTitle,
    goBack,
    fileHeader,
    initialDate,

    ...props
  }: {
    backTitle: string;
    goBack: () => void;
    fileHeader: HomebaseFile;

    photos: HomebaseFile[];

    hasNextPage: boolean | undefined;
    fetchNextPage: () => void;
    initialDate: Date;
    initialIndex: number;
  }) => {
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [activeDate, setActiveDate] = useState(initialDate);
    const [showHeader, setShowHeader] = useState(true);

    const doToggleHeader = useCallback(() => setShowHeader((oldVal) => !oldVal), [setShowHeader]);

    return (
      <View style={{ backgroundColor: Colors.black }}>
        {showHeader ? (
          <PreviewHeader
            currentDate={activeDate || initialDate}
            goBack={goBack}
            backTitle={backTitle}
            setIsInfoOpen={setIsInfoOpen}
            showHeader={showHeader}
          />
        ) : null}

        <InnerFlatListSlider
          {...props}
          doToggleHeader={doToggleHeader}
          setActiveDate={setActiveDate}
        />
        {isInfoOpen ? (
          <PhotoInfo current={fileHeader} onClose={() => setIsInfoOpen(false)} />
        ) : null}
      </View>
    );
  }
);

const InnerFlatListSlider = memo(
  ({
    photos,
    hasNextPage,
    fetchNextPage,

    doToggleHeader,
    setActiveDate,
    initialIndex,
  }: {
    photos: HomebaseFile[];
    hasNextPage: boolean | undefined;
    fetchNextPage: () => void;

    doToggleHeader: () => void;
    setActiveDate: (date: Date) => void;
    initialIndex: number;
  }) => {
    const windowSize = useMemo(() => Dimensions.get('window'), []);

    const onViewableItemsChanged = useCallback(
      ({ viewableItems }: { viewableItems: { item: HomebaseFile }[] }) => {
        const timestamp =
          viewableItems[0]?.item?.fileMetadata?.appData?.userDate ||
          viewableItems[0]?.item?.fileMetadata?.created;
        if (timestamp) setActiveDate(new Date(timestamp));
      },
      [setActiveDate]
    );

    const renderItem = useCallback(
      (item: ListRenderItemInfo<HomebaseFile>) => {
        return (
          <Pressable
            onPress={doToggleHeader}
            key={item.item.fileId}
            style={{
              width: windowSize.width,
              height: windowSize.height,
            }}
          >
            {item.item.fileMetadata.payloads
              .find((payload) => payload.key === DEFAULT_PAYLOAD_KEY)
              ?.contentType.startsWith('video/') ? (
              <VideoWithLoader
                fileId={item.item.fileId}
                targetDrive={targetDrive}
                fit="contain"
                imageSize={{
                  width: windowSize.width,
                  height: windowSize.height,
                }}
                onPress={doToggleHeader}
                previewThumbnail={item.item.fileMetadata.appData.previewThumbnail}
              />
            ) : (
              <PhotoWithLoader
                fileId={item.item.fileId}
                targetDrive={targetDrive}
                fit="contain"
                imageSize={{
                  width: windowSize.width,
                  height: windowSize.height,
                }}
                enableZoom={Platform.OS === 'android'}
                onPress={doToggleHeader}
                previewThumbnail={item.item.fileMetadata.appData.previewThumbnail}
              />
            )}
          </Pressable>
        );
      },
      [windowSize.height, windowSize.width, doToggleHeader]
    );

    // Both the FlatLists need data before they can render, otherwise the intialOffset is set and only afterwards the data is rendered
    if (!photos) return null;

    return (
      <View>
        {photos && photos.length ? (
          <FlatList
            showsHorizontalScrollIndicator={false}
            getItemLayout={(_data, index) => ({
              length: windowSize.width,
              offset: windowSize.width * index,
              index,
            })}
            horizontal={true}
            pagingEnabled={true}
            keyExtractor={(item) => item.fileId}
            pinchGestureEnabled={true}
            minimumZoomScale={1}
            maximumZoomScale={3}
            bouncesZoom={false}
            initialNumToRender={2}
            maxToRenderPerBatch={1}
            windowSize={3}
            initialScrollIndex={initialIndex}
            renderItem={renderItem}
            style={{
              height: windowSize.height,
              width: windowSize.width,
            }}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{
              itemVisiblePercentThreshold: 50,
            }}
            data={photos}
            onEndReached={() => hasNextPage && fetchNextPage()}
            onEndReachedThreshold={0.5}
          />
        ) : null}
      </View>
    );
  }
);

const PreviewHeader = memo(
  ({
    currentDate,
    goBack,
    setIsInfoOpen,
    backTitle,
    showHeader,
  }: {
    currentDate: Date;
    goBack: () => void;
    setIsInfoOpen: (isOpen: boolean) => void;
    backTitle: string;
    showHeader: boolean;
  }) => {
    const { isDarkMode } = useDarkMode();

    // TODO, override currentdate, after any scrolling
    const headerTitle = () => (
      <View
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontWeight: '500',
          }}
        >
          {currentDate?.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
        <Text>
          {currentDate?.toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: 'numeric',
          })}
        </Text>
      </View>
    );

    const headerLeft = () => (
      <HeaderBackButton
        style={{ position: 'absolute', left: 0 }}
        canGoBack={true}
        onPress={goBack}
        label={backTitle}
        labelVisible={false}
        tintColor={isDarkMode ? Colors.white : Colors.black}
      />
    );
    const headerRight = () => (
      <TouchableOpacity onPress={() => setIsInfoOpen(true)} style={{ padding: 5 }}>
        <InfoIcon color={'blue.400'} />
      </TouchableOpacity>
    );

    return (
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          opacity: showHeader ? 1 : 0,
          paddingVertical: 3,
          zIndex: 10,
        }}
      >
        <Header
          headerStyle={{
            backgroundColor: isDarkMode ? Colors.gray[900] : Colors.slate[50],
          }}
          headerShadowVisible={false}
          title={'Photo'}
          headerTitleAlign="center"
          headerTitle={headerTitle}
          headerLeft={headerLeft}
          headerRight={headerRight}
        />
      </View>
    );
  }
);

export default Photo;
