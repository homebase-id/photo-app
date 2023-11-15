import {
  DEFAULT_PAYLOAD_KEY,
  DriveSearchResult,
  TargetDrive,
} from '@youfoundation/js-lib/core';
import React, { useMemo } from 'react';
import { View, Dimensions, TouchableHighlight } from 'react-native';
import { Text } from '../../ui/Text/Text';
import { PhotoWithLoader } from '../PhotoPreview/PhotoWithLoader';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../../app/App';
import { Container } from '../../ui/Container/Container';
import { VideoWithLoader } from '../PhotoPreview/VideoWithLoader';
import { Colors } from '../../../app/Colors';
import { useDarkMode } from '../../../hooks/useDarkMode';

const mobileDateFormat: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  weekday: 'short',
};

const thisYearMobileDateFormat: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  weekday: 'short',
};

const PREFFERED_IMAGE_SIZE = 90;
export const PhotoDay = ({
  date,
  photos,

  targetDrive,
  type,
  toggleSelection,
  rangeSelection,
  isSelected,
  isSelecting,
}: {
  date: Date;
  photos?: DriveSearchResult[];

  targetDrive: TargetDrive;
  type?: 'bin' | 'archive' | 'apps' | 'favorites';
  toggleSelection: (fileId: string) => void;
  rangeSelection: (fileId: string) => void;
  isSelected: (fileId: string) => boolean;
  isSelecting?: boolean;
}) => {
  const title = useMemo(() => {
    return date.toLocaleDateString(
      undefined,
      date.getFullYear() === new Date().getFullYear()
        ? thisYearMobileDateFormat
        : mobileDateFormat,
    );
  }, [date]);

  const windowSize = Dimensions.get('window');
  const itemsPerRow = Math.round(windowSize.width / PREFFERED_IMAGE_SIZE);
  const size = Math.round(windowSize.width / itemsPerRow);
  return (
    <View style={{ paddingBottom: 15 }}>
      <Container>
        <Text fontSize={'sm'}>{title}</Text>
      </Container>
      <View
        style={{
          paddingTop: 8,
          margin: -1,
          flexDirection: 'row',
          flexWrap: 'wrap',
        }}>
        {photos
          ? photos?.map(photoDsr => {
              return (
                <View
                  key={photoDsr.fileId}
                  style={{
                    width: size,
                    padding: 1,
                  }}>
                  <PhotoItem
                    targetDrive={targetDrive}
                    photoDsr={photoDsr}
                    type={type}
                    toggleSelection={toggleSelection}
                    rangeSelection={rangeSelection}
                    isSelected={isSelected}
                    isSelecting={isSelecting}
                    size={size - 2} // -2 for the gap
                  />
                </View>
              );
            })
          : null}
      </View>
    </View>
  );
};

export const PhotoItem = ({
  targetDrive,
  photoDsr,
  album,
  type,
  toggleSelection,
  rangeSelection,
  isSelected,
  isSelecting,
  size,
}: {
  targetDrive: TargetDrive;
  photoDsr: DriveSearchResult;
  album?: string;
  type?: 'bin' | 'archive' | 'apps' | 'favorites';
  toggleSelection: (fileId: string) => void;
  rangeSelection: (fileId: string) => void;
  isSelected: (fileId: string) => boolean;
  isSelecting?: boolean;
  size: number;
}) => {
  const { isDarkMode } = useDarkMode();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  if (!photoDsr) return null;

  const isChecked = photoDsr?.fileId && isSelected(photoDsr?.fileId);

  const photoDate = new Date(
    photoDsr.fileMetadata.appData.userDate || photoDsr.fileMetadata.created,
  );

  return (
    <View
      style={{
        backgroundColor: isChecked
          ? isDarkMode
            ? Colors.indigo[900]
            : Colors.indigo[200]
          : undefined,
      }}>
      <View
        style={{
          transform: isChecked ? [{ scale: 0.9 }] : [{ scale: 1 }],
          aspectRatio: 1,
        }}
        data-date={`${photoDate.getFullYear()}-${
          photoDate.getMonth() + 1
        }-${photoDate.getDate()}`}
        data-unix={photoDate.getTime()}>
        <TouchableHighlight
          onPress={() => {
            if (!isSelecting)
              navigation.navigate('PhotoPreview', {
                photoId: photoDsr.fileId,
                typeId: type,
                albumId: album,
              });
            else toggleSelection(photoDsr.fileId);
          }}
          onLongPress={() => toggleSelection(photoDsr.fileId)}>
          <View>
            {photoDsr.fileMetadata.payloads
              .find(payload => payload.key === DEFAULT_PAYLOAD_KEY)
              ?.contentType.startsWith('video/') ? (
              <>
                <VideoWithLoader
                  fileId={photoDsr.fileId}
                  targetDrive={targetDrive}
                  previewThumbnail={
                    photoDsr?.fileMetadata.appData.previewThumbnail
                  }
                  imageSize={{
                    width: size,
                    height: size,
                  }}
                  fit="cover"
                  enableZoom={false}
                  preview={true}
                />
              </>
            ) : (
              <PhotoWithLoader
                fileId={photoDsr.fileId}
                targetDrive={targetDrive}
                previewThumbnail={
                  photoDsr?.fileMetadata.appData.previewThumbnail
                }
                fit="cover"
                imageSize={{
                  width: size,
                  height: size,
                }}
                enableZoom={false}
              />
            )}
          </View>
        </TouchableHighlight>
        {/* </Link> */}
      </View>
    </View>
  );
};
