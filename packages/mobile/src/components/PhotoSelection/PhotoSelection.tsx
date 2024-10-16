import { GestureResponderEvent, Platform, TouchableOpacity, View } from 'react-native';
import { Text } from '../ui/Text/Text';
import { RecycleBin, Archive, OpenHearth, Times, SolidHearth } from '../ui/Icons/icons';
import { ReactNode, useState } from 'react';
import { Colors } from '../../app/Colors';
import { useDarkMode } from '../../hooks/useDarkMode';
import { ActionSheet, ActionSheetItem } from '../ui/Modal/ActionSheet';
import { useAlbums, usePhoto, PhotoConfig, LibraryType } from 'photo-app-common';
import { addError } from '../../hooks/errors/useErrors';
import { useQueryClient } from '@tanstack/react-query';

const targetDrive = PhotoConfig.PhotoDrive;

const PhotoSelection = ({
  selection,
  clearSelection,
  isSelecting,
  albumKey,
  type,
}: {
  selection: string[];
  clearSelection: () => void;
  isSelecting: boolean;
  albumKey?: string;
  type: LibraryType;
}) => {
  const queryClient = useQueryClient();
  const [isAlbumSelectionOpen, setIsAlbumSelectionOpen] = useState(false);

  const {
    remove: { mutateAsync: removePhoto },
    deleteFile: { mutateAsync: deletePhoto },
    archive: { mutateAsync: archivePhoto },
    restore: { mutateAsync: restorePhoto },
    addTags: { mutateAsync: addTagsToPhoto },
    removeTags: { mutateAsync: removeTagsFromPhoto },
  } = usePhoto(targetDrive);
  const { data: albums } = useAlbums().fetch;

  if (!isSelecting) return null;

  const removeSelection = async () => {
    try {
      await Promise.all(
        selection.map(async (fileId) => {
          await removePhoto({ photoFileId: fileId });
        })
      );

      clearSelection();
    } catch (err) {
      addError(queryClient, err);
    }
  };

  const deleteSelection = async () => {
    try {
      await Promise.all(
        selection.map(async (fileId) => {
          await deletePhoto({ photoFileId: fileId });
        })
      );

      clearSelection();
    } catch (err) {
      addError(queryClient, err);
    }
  };

  const archiveSelection = async () => {
    try {
      await Promise.all(
        selection.map(async (fileId) => {
          await archivePhoto({ photoFileId: fileId });
        })
      );

      clearSelection();
    } catch (err) {
      addError(queryClient, err);
    }
  };

  const restoreSelection = async () => {
    try {
      await Promise.all(
        selection.map(async (fileId) => {
          await restorePhoto({ photoFileId: fileId });
        })
      );

      clearSelection();
    } catch (err) {
      addError(queryClient, err);
    }
  };

  const favoriteSelection = async () => {
    try {
      await Promise.all(
        selection.map(async (fileId) => {
          addTagsToPhoto({
            targetDrive: PhotoConfig.PhotoDrive,
            fileId: fileId,
            addTags: [PhotoConfig.FavoriteTag],
          });
        })
      );

      clearSelection();
    } catch (err) {
      addError(queryClient, err);
    }
  };

  const addSelectionToAlbum = async (albumTag: string) => {
    try {
      if (!albumTag) return;

      await Promise.all(
        selection.map(async (fileId) => {
          addTagsToPhoto({
            targetDrive: PhotoConfig.PhotoDrive,
            fileId: fileId,
            addTags: [albumTag],
          });
        })
      );

      clearSelection();
    } catch (err) {
      addError(queryClient, err);
    }
  };

  const removeSelectionFromAlbum = async (albumTag: string) => {
    try {
      if (!albumTag) return;

      await Promise.all(
        selection.map(async (fileId) => {
          removeTagsFromPhoto({
            targetDrive: PhotoConfig.PhotoDrive,
            fileId: fileId,
            removeTags: [albumTag],
          });
        })
      );

      clearSelection();
    } catch (err) {
      addError(queryClient, err);
    }
  };

  return (
    <>
      <SelectionBar>
        <SelectionBarButton onPress={clearSelection}>
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: 2,
              alignItems: 'center',
            }}
          >
            <Times />
            <Text>{selection.length}</Text>
          </View>
        </SelectionBarButton>

        {type !== 'bin' ? (
          <SelectionBarButton
            onPress={async () => {
              removeSelection();
            }}
          >
            <RecycleBin />
          </SelectionBarButton>
        ) : (
          <SelectionBarButton onPress={() => deleteSelection()}>
            <Text>{'Delete permanently'}</Text>
          </SelectionBarButton>
        )}
        {type !== 'archive' ? (
          <SelectionBarButton
            onPress={async () => {
              archiveSelection();
            }}
          >
            <Archive />
          </SelectionBarButton>
        ) : null}

        {type === 'archive' || type === 'bin' ? (
          <SelectionBarButton onPress={() => restoreSelection()}>
            <Text>{'Restore'}</Text>
          </SelectionBarButton>
        ) : (
          <>
            {albumKey && albumKey === PhotoConfig.FavoriteTag ? (
              <SelectionBarButton onPress={() => removeSelectionFromAlbum(albumKey)}>
                <SolidHearth />
              </SelectionBarButton>
            ) : (
              <SelectionBarButton onPress={() => favoriteSelection()}>
                <OpenHearth />
              </SelectionBarButton>
            )}
            {albumKey && albumKey !== PhotoConfig.FavoriteTag ? (
              <>
                <SelectionBarButton onPress={() => removeSelectionFromAlbum(albumKey)}>
                  <Text>{'Remove from album'}</Text>
                </SelectionBarButton>
              </>
            ) : null}
            {albums && !albumKey && Platform.OS !== 'ios' ? (
              <SelectionBarButton onPress={() => setIsAlbumSelectionOpen(true)}>
                <Text
                  style={{
                    flexWrap: 'wrap',
                    textAlign: 'center',
                    lineHeight: 16,
                  }}
                >
                  {'Add to album'}
                </Text>
              </SelectionBarButton>
            ) : null}
          </>
        )}
      </SelectionBar>
      <ActionSheet
        isOpen={isAlbumSelectionOpen}
        onClose={() => setIsAlbumSelectionOpen(false)}
        title="Add to album"
      >
        {albums?.map((album) => (
          <ActionSheetItem
            key={album.tag}
            onPress={() => {
              addSelectionToAlbum(album.tag);
              setIsAlbumSelectionOpen(false);
            }}
          >
            <Text>{album.name}</Text>
          </ActionSheetItem>
        ))}
      </ActionSheet>
    </>
  );
};

const SelectionBar = ({ children }: { children: ReactNode }) => {
  const { isDarkMode } = useDarkMode();

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        minHeight: 40,
        backgroundColor: isDarkMode ? Colors.indigo[900] : Colors.indigo[200],
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 5,
        paddingVertical: 5,
      }}
    >
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        {children}
      </View>
    </View>
  );
};

const SelectionBarButton = ({
  children,
  onPress,
}: {
  children: ReactNode | string;
  onPress?: ((event: GestureResponderEvent) => void) | undefined;
}) => {
  const { isDarkMode } = useDarkMode();

  return (
    <TouchableOpacity
      style={{
        borderRadius: 5,
        backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        width: 30,
        minHeight: '100%',
        flexGrow: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onPress={onPress}
    >
      {typeof children === 'string' ? (
        <Text style={{ flexWrap: 'wrap', textAlign: 'center', lineHeight: 16 }}>{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
};

export default PhotoSelection;
