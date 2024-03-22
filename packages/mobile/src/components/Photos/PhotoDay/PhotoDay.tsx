import { DEFAULT_PAYLOAD_KEY, HomebaseFile, TargetDrive } from '@youfoundation/js-lib/core';
import { memo, useCallback, useMemo } from 'react';
import { View, Dimensions, TouchableHighlight } from 'react-native';
import { Text } from '../../ui/Text/Text';
import { PhotoWithLoader } from '../PhotoPreview/PhotoWithLoader';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../../app/App';
import { Container } from '../../ui/Container/Container';
import { VideoWithLoader } from '../PhotoPreview/VideoWithLoader';
import { Colors } from '../../../app/Colors';
import { useDarkMode } from '../../../hooks/useDarkMode';
import { LibraryType } from 'photo-app-common';

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
export const PhotoDay = memo(
  ({
    date,
    photos,

    targetDrive,
    type,
    toggleSelection,
    isSelected,
    isSelecting,
  }: {
    date: Date;
    photos?: HomebaseFile[];

    targetDrive: TargetDrive;
    type: LibraryType;
    toggleSelection: (fileId: string) => void;
    isSelected: (fileId: string) => boolean;
    isSelecting?: boolean;
  }) => {
    const title = useMemo(() => {
      return date.toLocaleDateString(
        undefined,
        date.getFullYear() === new Date().getFullYear()
          ? thisYearMobileDateFormat
          : mobileDateFormat
      );
    }, [date]);

    const windowSize = Dimensions.get('window');
    const itemsPerRow = Math.round(windowSize.width / PREFFERED_IMAGE_SIZE);
    const size = Math.round(windowSize.width / itemsPerRow);
    return (
      <View style={{ paddingBottom: 15 }}>
        <Container>
          <Text>{title}</Text>
        </Container>
        <View
          style={{
            paddingTop: 8,
            margin: -1,
            flexDirection: 'row',
            flexWrap: 'wrap',
          }}
        >
          {photos
            ? photos?.map((photoDsr) => {
                return (
                  <View
                    key={photoDsr.fileId}
                    style={{
                      width: size,
                      padding: 1,
                    }}
                  >
                    <PhotoItem
                      targetDrive={targetDrive}
                      photoDsr={photoDsr}
                      type={type}
                      toggleSelection={toggleSelection}
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
  }
);

export const PhotoItem = memo(
  ({
    targetDrive,
    photoDsr,
    album,
    type,
    toggleSelection,
    isSelected,
    isSelecting,
    size,
  }: {
    targetDrive: TargetDrive;
    photoDsr: HomebaseFile;
    album?: string;
    type: LibraryType;
    toggleSelection: (fileId: string) => void;
    isSelected: (fileId: string) => boolean;
    isSelecting?: boolean;
    size: number;
  }) => {
    const { isDarkMode } = useDarkMode();
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();
    const isChecked = photoDsr?.fileId && isSelected(photoDsr?.fileId);

    const doPress = useCallback(() => {
      if (!isSelecting) {
        navigation.navigate('PhotoPreview', {
          photoId: photoDsr.fileId,
          typeId: type,
          albumId: album,
        });
      } else toggleSelection(photoDsr.fileId);
    }, [album, isSelecting, navigation, photoDsr.fileId, toggleSelection, type]);

    const doLongPress = useCallback(
      () => toggleSelection(photoDsr.fileId),
      [toggleSelection, photoDsr]
    );

    if (!photoDsr) return null;

    return (
      <View
        style={{
          backgroundColor: isChecked
            ? isDarkMode
              ? Colors.indigo[900]
              : Colors.indigo[200]
            : undefined,
        }}
      >
        <View
          style={{
            transform: isChecked ? [{ scale: 0.9 }] : [{ scale: 1 }],
            aspectRatio: 1,
          }}
        >
          <TouchableHighlight onPress={doPress} onLongPress={doLongPress}>
            <View>
              {photoDsr.fileMetadata.payloads
                .find((payload) => payload.key === DEFAULT_PAYLOAD_KEY)
                ?.contentType.startsWith('video/') ? (
                <VideoWithLoader
                  fileId={photoDsr.fileId}
                  targetDrive={targetDrive}
                  previewThumbnail={photoDsr?.fileMetadata.appData.previewThumbnail}
                  imageSize={{
                    width: size,
                    height: size,
                  }}
                  fit="cover"
                  preview={true}
                />
              ) : (
                <PhotoWithLoader
                  fileId={photoDsr.fileId}
                  targetDrive={targetDrive}
                  previewThumbnail={photoDsr?.fileMetadata.appData.previewThumbnail}
                  fit="cover"
                  imageSize={{
                    width: size,
                    height: size,
                  }}
                />
              )}
            </View>
          </TouchableHighlight>
          {/* </Link> */}
        </View>
      </View>
    );
  }
);
