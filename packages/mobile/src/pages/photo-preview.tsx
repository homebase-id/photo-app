import { HeaderBackButton, Header } from '@react-navigation/elements';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../app/App';
import {
  Dimensions,
  FlatList,
  FlatListComponent,
  ListRenderItemInfo,
  Pressable,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from '../components/ui/Text/Text';
import { PhotoWithLoader } from '../components/Photos/PhotoPreview/PhotoWithLoader';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { Colors } from '../app/Colors';
import PhotoInfo from '../components/Photo/PhotoInfo';
import { DEFAULT_PAYLOAD_KEY, DriveSearchResult } from '@youfoundation/js-lib/core';

import { VideoWithLoader } from '../components/Photos/PhotoPreview/VideoWithLoader';

import { useDarkMode } from '../hooks/useDarkMode';
import { InfoIcon } from '../components/ui/Icons/icons';
import { PhotoConfig, useAlbum, useFileHeader, usePhotosInfinte } from 'photo-app-common';

type PhotoProps = NativeStackScreenProps<RootStackParamList, 'PhotoPreview'>;
const targetDrive = PhotoConfig.PhotoDrive;

const Photo = ({ route, navigation }: PhotoProps) => {
  // console.log('rendering Photo');
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
  fileHeader: DriveSearchResult;
}

const PhotoPreview = memo(
  ({ currentDate, fileHeader, route, navigation }: PhotoLibPreviewProps) => {
    // console.log('rendering PhotoPreview');
    const { typeId, albumId } = route.params;
    const isAlbumView = albumId || typeId === 'favorites';

    const { data: album } = useAlbum(albumId).fetch;

    const {
      data: olderPhotos,
      fetchNextPage: fetchOlderPage,
      hasNextPage: hasOlderPage,
      isFetched: hasFetchedOlderPhotos,
    } = usePhotosInfinte({
      type: 'photos',
      targetDrive,
      album: albumId || (typeId === 'favorites' ? PhotoConfig.FavoriteTag : undefined),
      startFromDate: currentDate,
      disabled: !currentDate && !isAlbumView && !album,
      direction: 'older',
    }).fetchPhotos;

    const {
      data: newerPhotos,
      fetchNextPage: fetchNewerPage,
      hasNextPage: hasNewerPage,
      isFetched: hasFetchedNewerPhotos,
    } = usePhotosInfinte({
      targetDrive,
      album: albumId || (typeId === 'favorites' ? PhotoConfig.FavoriteTag : undefined),
      startFromDate: currentDate,
      disabled: !currentDate && !isAlbumView && !album,
      direction: 'newer',
      type: 'photos',
    }).fetchPhotos;

    const flatNewerPhotos = useMemo(
      () => newerPhotos?.pages.flatMap((page) => page.results) || [],
      [newerPhotos?.pages]
    );
    const flatOlderPhotos = useMemo(
      () => olderPhotos?.pages.flatMap((page) => page.results) || [],
      [olderPhotos?.pages]
    );

    const doGoBack = useCallback(() => {
      console.log('goBack');
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Home');
      }
    }, [navigation]);

    // The Flatlists need data before they can render, otherwise the intialOffset is set and only afterwards the data is rendered
    if (
      (isAlbumView && !album) ||
      !hasFetchedOlderPhotos ||
      !olderPhotos ||
      !hasFetchedNewerPhotos ||
      !newerPhotos
    ) {
      return null;
    }

    return (
      <InnerPhotoPreview
        backTitle={isAlbumView ? album?.name || '' : 'Library'}
        goBack={doGoBack}
        currentDate={currentDate}
        fileHeader={fileHeader}
        olderPhotos={flatOlderPhotos}
        newerPhotos={flatNewerPhotos}
        fetchOlderPage={fetchOlderPage}
        hasOlderPage={hasOlderPage}
        fetchNewerPage={fetchNewerPage}
        hasNewerPage={hasNewerPage}
      />
    );
  }
);

const InnerPhotoPreview = memo(
  ({
    backTitle,
    goBack,
    fileHeader,
    currentDate,
    ...props
  }: {
    backTitle: string;
    currentDate: Date;
    goBack: () => void;
    fileHeader: DriveSearchResult;

    olderPhotos: DriveSearchResult[];
    newerPhotos: DriveSearchResult[];
    hasOlderPage: boolean | undefined;
    fetchOlderPage: () => void;

    hasNewerPage: boolean | undefined;
    fetchNewerPage: () => void;
  }) => {
    // console.log('rendering InnerPhotoPreview');

    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [activeDate, setActiveDate] = useState(currentDate);
    const [showHeader, setShowHeader] = useState(true);

    const doToggleHeader = useCallback(() => setShowHeader((oldVal) => !oldVal), [setShowHeader]);

    return (
      <View style={{ backgroundColor: Colors.black }}>
        {showHeader ? (
          <PreviewHeader
            currentDate={activeDate || currentDate}
            goBack={goBack}
            backTitle={backTitle}
            setIsInfoOpen={setIsInfoOpen}
            showHeader={showHeader}
          />
        ) : null}

        <PreviewSlider {...props} doToggleHeader={doToggleHeader} setActiveDate={setActiveDate} />
        {isInfoOpen ? (
          <PhotoInfo current={fileHeader} onClose={() => setIsInfoOpen(false)} />
        ) : null}
      </View>
    );
  }
);

const PreviewSlider = memo(
  ({
    olderPhotos,
    newerPhotos,
    hasOlderPage,
    fetchOlderPage,

    hasNewerPage,
    fetchNewerPage,

    doToggleHeader,
    setActiveDate,
  }: {
    olderPhotos: DriveSearchResult[];
    newerPhotos: DriveSearchResult[];
    hasOlderPage: boolean | undefined;
    fetchOlderPage: () => void;

    hasNewerPage: boolean | undefined;
    fetchNewerPage: () => void;

    doToggleHeader: () => void;
    setActiveDate: (date: Date) => void;
  }) => {
    // console.log('rendering PreviewSlider');

    const [isGoingLeft, setIsGoingLeft] = useState(true);
    const windowSize = useMemo(() => Dimensions.get('window'), [Dimensions]);

    const newerFlatListRef = useRef<FlatListComponent<DriveSearchResult, any>>();
    const olderFlatListRef = useRef<FlatListComponent<DriveSearchResult, any>>();

    const baseFlatListProps = {
      onStartReachedThreshold: 0,
      showsHorizontalScrollIndicator: false,
      getItemLayout: (data: ArrayLike<DriveSearchResult> | null | undefined, index: number) => ({
        length: windowSize.width,
        offset: windowSize.width * index,
        index,
      }),
      horizontal: true,
      pagingEnabled: true,
      keyExtractor: (item: DriveSearchResult) => item.fileId,
      pinchGestureEnabled: true,
      mimimumZoomScale: 1,
      maximumZoomScale: 3,
      bouncesZoom: false,
      initialNumToRender: 2,
    } as const;

    const hasOlder = olderPhotos && olderPhotos.length >= 1;
    const hasNewer = newerPhotos && newerPhotos.length >= 1;

    const onViewableItemsChanged = useCallback(
      ({ viewableItems }: { viewableItems: { item: DriveSearchResult }[] }) => {
        const timestamp =
          viewableItems[0]?.item?.fileMetadata?.appData?.userDate ||
          viewableItems[0]?.item?.fileMetadata?.created;
        if (timestamp) setActiveDate(new Date(timestamp));
      },
      []
    );

    const renderItem = useCallback(
      (item: ListRenderItemInfo<DriveSearchResult>) => {
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
                onClick={doToggleHeader}
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
                enableZoom={false}
                onClick={doToggleHeader}
              />
            )}
          </Pressable>
        );
      },
      [windowSize.height, windowSize.width, doToggleHeader]
    );

    const dataForLeft = useMemo(() => {
      return [...(hasOlder ? [olderPhotos[0]] : []), ...newerPhotos];
    }, [hasOlder, olderPhotos, newerPhotos]);

    const dataForRight = useMemo(() => {
      return [...(hasNewer ? [newerPhotos[0]] : []), ...olderPhotos];
    }, [hasNewer, newerPhotos, olderPhotos]);

    // Both the FlatLists need data before they can render, otherwise the intialOffset is set and only afterwards the data is rendered
    if (!dataForLeft || !newerPhotos) return null;

    return (
      <View>
        <View
          key="left"
          style={{
            display: isGoingLeft && hasNewer ? 'flex' : 'none',
          }}
        >
          {newerPhotos && newerPhotos.length ? (
            <FlatList
              {...baseFlatListProps}
              renderItem={renderItem}
              initialScrollIndex={hasOlder ? 1 : 0}
              ref={newerFlatListRef as any}
              style={{
                // backgroundColor: 'blue',
                height: windowSize.height,
                width: windowSize.width,
              }}
              onStartReached={() => {
                hasOlder && isGoingLeft && setIsGoingLeft(false);
                // Reset this flatList to the first real item; Not the overlap
                setTimeout(() => {
                  newerFlatListRef.current?.scrollToIndex({
                    index: hasOlder ? 1 : 0,
                    animated: false,
                  });
                }, 100);
              }}
              data={dataForLeft}
              inverted={true}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={{
                itemVisiblePercentThreshold: 50,
              }}
              onEndReached={() => hasNewerPage && fetchNewerPage()}
            />
          ) : null}
        </View>
        <View
          key="right"
          style={{
            display: isGoingLeft && hasNewer ? 'none' : 'flex',
          }}
        >
          {olderPhotos && olderPhotos.length ? (
            <FlatList
              {...baseFlatListProps}
              renderItem={renderItem}
              initialScrollIndex={hasNewer ? 1 : 0}
              ref={olderFlatListRef as any}
              style={{
                // backgroundColor: 'red',
                height: windowSize.height,
                width: windowSize.width,
              }}
              onStartReached={() => {
                hasNewer && setIsGoingLeft(true);
                // Reset this flatList to the first real item; Not the overlap
                setTimeout(() => {
                  olderFlatListRef.current?.scrollToIndex({
                    index: hasNewer ? 1 : 0,
                    animated: false,
                  });
                }, 100);
              }}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={{
                itemVisiblePercentThreshold: 50,
              }}
              data={dataForRight}
              onEndReached={() => hasOlderPage && fetchOlderPage()}
            />
          ) : null}
        </View>
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
