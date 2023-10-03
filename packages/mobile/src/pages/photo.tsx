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
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Colors } from '../app/Colors';
import PhotoInfo from '../components/Photo/PhotoInfo';
import { InfoIcon } from 'native-base';
import { SafeAreaView } from '../components/ui/SafeAreaView/SafeAreaView';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { useFileHeader } from '../hooks/photoLibrary/usePhotoHeader';
import { useFlatPhotosFromDate } from '../hooks/photoLibrary/usePhotos';
import { VideoWithLoader } from '../components/Photos/PhotoPreview/VideoWithLoader';
import { useAlbum } from '../hooks/photoLibrary/useAlbum';
import { useDarkMode } from '../hooks/useDarkMode';
import { PhotoConfig } from '../provider/photos/PhotoTypes';

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
        ? new Date(
            fileHeader?.fileMetadata.appData.userDate ||
              fileHeader?.fileMetadata.created,
          )
        : undefined,
    [fileHeader],
  );

  if (!currentDate || !fileHeader) return null;

  return (
    <PhotoPreview
      route={route}
      navigation={navigation}
      currentDate={currentDate}
      fileHeader={fileHeader}
    />
  );
};

interface PhotoLibPreviewProps extends PhotoProps {
  currentDate: Date;
  fileHeader: DriveSearchResult;
}

const PhotoPreview = ({
  currentDate,
  fileHeader,
  route,
  navigation,
}: PhotoLibPreviewProps) => {
  const { typeId, albumId } = route.params;
  const isAlbumView = albumId || typeId === 'favorites';

  const { data: album } = useAlbum(albumId).fetch;

  const {
    data: olderPhotos,
    fetchNextPage: fetchOlderPage,
    hasNextPage: hasOlderPage,
    isFetched: hasFetchedOlderPhotos,
  } = useFlatPhotosFromDate({
    album:
      albumId || (typeId === 'favorites' ? PhotoConfig.FavoriteTag : undefined),
    date: currentDate,
    disabled: !currentDate && !isAlbumView && !album,
    ordering: 'newer',
  }).fetchPhotos;

  const {
    data: newerPhotos,
    fetchNextPage: fetchNewerPage,
    hasNextPage: hasNewerPage,
    isFetched: hasFetchedNewerPhotos,
  } = useFlatPhotosFromDate({
    album:
      albumId || (typeId === 'favorites' ? PhotoConfig.FavoriteTag : undefined),
    date: currentDate,
    disabled: !currentDate && !isAlbumView && !album,
    ordering: 'older',
  }).fetchPhotos;

  const flatNewerPhotos =
    newerPhotos?.pages.flatMap(page => page.results) || [];
  const flatOlderPhotos =
    olderPhotos?.pages.flatMap(page => page.results) || [];

  // The Flatlists need data before they can render, otherwise the intialOffset is set and only afterwards the data is rendered
  if (
    !hasFetchedOlderPhotos ||
    !olderPhotos ||
    !hasFetchedNewerPhotos ||
    !newerPhotos
  )
    return null;

  return (
    <InnerPhotoPreview
      backTitle={isAlbumView ? album?.name || '' : 'Library'}
      goBack={() => navigation.goBack()}
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
};

const InnerPhotoPreview = ({
  backTitle,
  currentDate,
  goBack,
  fileHeader,

  olderPhotos,
  newerPhotos,
  hasOlderPage,
  fetchOlderPage,

  hasNewerPage,
  fetchNewerPage,
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
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isGoingLeft, setIsGoingLeft] = useState(false);
  const [activeDate, setActiveDate] = useState(currentDate);

  const windowSize = Dimensions.get('window');
  const [showHeader, setShowHeader] = useState(true);

  const newerFlatListRef = useRef<FlatListComponent<DriveSearchResult, any>>();
  const olderFlatListRef = useRef<FlatListComponent<DriveSearchResult, any>>();

  const baseFlatListProps = {
    onStartReachedThreshold: 0,
    getItemLayout: (
      data: ArrayLike<DriveSearchResult> | null | undefined,
      index: number,
    ) => ({
      length: windowSize.width,
      offset: windowSize.width * index,
      index,
    }),
    horizontal: true,
    snapToInterval: windowSize.width,
    snapToAlignment: 'start',
    decelerationRate: 'fast',
    keyExtractor: (item: DriveSearchResult) => item.fileId,
    initialNumToRender: 1,
    maxToRenderPerBatch: 2,
  } as const;

  const hasOlder = olderPhotos && olderPhotos.length >= 1;
  const hasNewer = newerPhotos && newerPhotos.length >= 1;

  const onViewableItemsChanged = useCallback(
    ({
      viewableItems,
    }: // changed,
    {
      viewableItems: { item: DriveSearchResult }[];
      // changed: any;
    }) => {
      const timestamp =
        viewableItems[0]?.item?.fileMetadata?.appData?.userDate ||
        viewableItems[0]?.item?.fileMetadata?.created;
      if (timestamp) setActiveDate(new Date(timestamp));
    },
    [],
  );

  const renderItem = useCallback(
    (item: ListRenderItemInfo<DriveSearchResult>) => (
      <Pressable
        onPress={() => setShowHeader(!showHeader)}
        key={item.item.fileId}
        style={{
          width: windowSize.width,
          height: windowSize.height,
        }}>
        {item.item.fileMetadata.contentType.startsWith('video/') ? (
          <VideoWithLoader
            fileId={item.item.fileId}
            targetDrive={targetDrive}
            fit="contain"
            imageSize={{
              width: windowSize.width,
              height: windowSize.height,
            }}
            enableZoom={true}
            onClick={() => setShowHeader(!showHeader)}
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
            enableZoom={true}
            onClick={() => setShowHeader(!showHeader)}
          />
        )}
      </Pressable>
    ),
    [showHeader, windowSize.height, windowSize.width],
  );

  // Both the FlatLists need data before they can render, otherwise the intialOffset is set and only afterwards the data is rendered
  if (!olderPhotos || !newerPhotos) return null;

  return (
    <SafeAreaView style={{ backgroundColor: Colors.black }}>
      <PreviewHeader
        currentDate={activeDate || currentDate}
        goBack={goBack}
        backTitle={backTitle}
        setIsInfoOpen={setIsInfoOpen}
        showHeader={showHeader}
      />
      <View>
        <View
          key="left"
          style={{
            display: isGoingLeft && hasNewer ? 'flex' : 'none',
          }}>
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
                setIsGoingLeft(false);
                newerFlatListRef.current?.scrollToIndex({
                  index: hasOlder ? 1 : 0,
                  animated: false,
                });
              }}
              data={[...(hasOlder ? [olderPhotos[0]] : []), ...newerPhotos]}
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
          }}>
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
                console.log('start reached');
                setIsGoingLeft(true);
                olderFlatListRef.current?.scrollToIndex({
                  index: hasNewer ? 1 : 0,
                  animated: false,
                });
              }}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={{
                itemVisiblePercentThreshold: 50,
              }}
              data={[...(hasNewer ? [newerPhotos[0]] : []), ...olderPhotos]}
              onEndReached={() => hasOlderPage && fetchOlderPage()}
            />
          ) : null}
        </View>
      </View>

      {isInfoOpen ? (
        <PhotoInfo
          current={fileHeader}
          isOpen={isInfoOpen}
          onClose={() => setIsInfoOpen(false)}
        />
      ) : null}
    </SafeAreaView>
  );
};

const PreviewHeader = ({
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
      }}>
      <Text
        style={{
          fontWeight: '500',
        }}>
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
      onPress={() => goBack()}
      label={backTitle}
      labelVisible={false}
    />
  );
  const headerRight = () => (
    <TouchableOpacity
      onPress={() => setIsInfoOpen(true)}
      style={{ padding: 5 }}>
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
        zIndex: 10,
      }}>
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
};

export default Photo;
