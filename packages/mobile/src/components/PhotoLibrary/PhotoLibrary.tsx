import { memo, useCallback, useMemo, useState } from 'react';
import { Dimensions, FlatList, ListRenderItemInfo, RefreshControl, View } from 'react-native';
import { Text } from '../ui/Text/Text';
import { PhotoItem } from '../Photos/PhotoDay/PhotoDay';
import { usePhotosByMonth, PhotoConfig, LibraryType, usePhotosInfinte } from 'photo-app-common';
import { useQueryClient } from '@tanstack/react-query';
import { HomebaseFile } from '@homebase-id/js-lib/core';

const PREFFERED_IMAGE_SIZE = 90;
const targetDrive = PhotoConfig.PhotoDrive;

const RENDERED_PAGE_SIZE = 32;
export const PhotoLibrary = memo(
  (props: {
    type: LibraryType;
    toggleSelection: (fileId: string) => Promise<boolean>;
    selectRange: (fileIds: string[]) => void;
    isSelecting?: boolean;
    clearingSelection?: number;
  }) => {
    const { type } = props;

    const queryClient = useQueryClient();

    const {
      data: rawPhotos,
      hasNextPage: hasMorePhotosOnServer,
      fetchNextPage: fetchMorePhotosFromServer,
      isFetchingNextPage,
      refetch: refetchPhotos,
    } = usePhotosInfinte({
      targetDrive: PhotoConfig.PhotoDrive,
      type: 'photos',
    }).fetchPhotos;

    const flatPhotos = useMemo(
      () => rawPhotos?.pages.flatMap((page) => page.results) ?? [],
      [rawPhotos]
    );

    const invalidatePhotos = usePhotosByMonth({
      type: 'photos',
    }).invalidateQueries;

    const [refreshing, setRefreshing] = useState(false);
    const doRefresh = useCallback(async () => {
      setRefreshing(true);
      queryClient.invalidateQueries();
      await refetchPhotos();
      await invalidatePhotos(type);
      setRefreshing(false);
    }, [invalidatePhotos, queryClient, refetchPhotos, type]);

    if (!flatPhotos?.length) {
      return (
        <Text style={{ padding: 5 }}>{'Mmh, this looks empty... Time to add some photos?'}</Text>
      );
    }

    return (
      <InnerList
        {...props}
        flatPhotos={flatPhotos}
        refreshing={refreshing}
        doRefresh={doRefresh}
        hasMorePhotos={hasMorePhotosOnServer}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchMorePhotosFromServer}
      />
    );
  }
);

const InnerList = memo(
  (props: {
    flatPhotos: HomebaseFile<string>[];
    refreshing: boolean;
    doRefresh: () => void;
    hasMorePhotos: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => void;
    toggleSelection: (fileId: string) => Promise<boolean>;
    selectRange: (fileIds: string[]) => void;
    isSelecting?: boolean;
    clearingSelection?: number;
  }) => {
    const {
      flatPhotos,
      refreshing,
      doRefresh,
      hasMorePhotos,
      isFetchingNextPage,
      fetchNextPage,
      toggleSelection,
      isSelecting,
      clearingSelection,
    } = props;

    const windowSize = Dimensions.get('window');
    const numColums = Math.round(windowSize.width / PREFFERED_IMAGE_SIZE);
    const size = Math.round(windowSize.width / numColums);

    const renderItem = useCallback(
      ({ item }: ListRenderItemInfo<HomebaseFile<string>>) => (
        <View
          key={item.fileId}
          style={{
            width: size,
            height: size,
            padding: 1,
          }}
        >
          <PhotoItem
            type="photos"
            targetDrive={targetDrive}
            photoDsr={item}
            key={item.fileId}
            toggleSelection={toggleSelection}
            isSelecting={isSelecting}
            clearingSelection={clearingSelection}
            size={size - 2} // -2 for the gap
          />
        </View>
      ),
      [size, toggleSelection, isSelecting, clearingSelection]
    );

    return (
      <View
        style={{
          margin: -1,
        }}
      >
        <FlatList
          data={flatPhotos}
          keyExtractor={(item) => item.fileId}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={doRefresh} />}
          renderItem={renderItem}
          numColumns={numColums}
          onEndReached={() => hasMorePhotos && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.9}
          initialNumToRender={RENDERED_PAGE_SIZE}
          maxToRenderPerBatch={RENDERED_PAGE_SIZE}
          getItemLayout={(_data, index) => ({
            length: size,
            offset: size * index,
            index,
          })}
          windowSize={2}
        />
      </View>
    );
  }
);
