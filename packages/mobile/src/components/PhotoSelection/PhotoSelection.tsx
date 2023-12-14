import { GestureResponderEvent, TouchableOpacity, View } from 'react-native';
import { Text } from '../ui/Text/Text';
import { Actionsheet } from 'native-base';
import { RecycleBin, Archive, OpenHearth, Times, SolidHearth } from '../ui/Icons/icons';
import { ReactNode, useState } from 'react';
import { Colors } from '../../app/Colors';
import usePhoto from '../../hooks/photoLibrary/usePhoto';
import useAlbums from '../../hooks/photoLibrary/useAlbums';
import { useDarkMode } from '../../hooks/useDarkMode';
import { PhotoConfig } from '../../provider/photos/PhotoTypes';

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
  type?: 'bin' | 'archive' | 'apps';
}) => {
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
    await Promise.all(
      selection.map(async (fileId) => {
        await removePhoto({ photoFileId: fileId });
      })
    );

    clearSelection();
  };

  const deleteSelection = async () => {
    await Promise.all(
      selection.map(async (fileId) => {
        await deletePhoto({ photoFileId: fileId });
      })
    );

    clearSelection();
  };

  const archiveSelection = async () => {
    await Promise.all(
      selection.map(async (fileId) => {
        await archivePhoto({ photoFileId: fileId });
      })
    );

    clearSelection();
  };

  const restoreSelection = async () => {
    await Promise.all(
      selection.map(async (fileId) => {
        await restorePhoto({ photoFileId: fileId });
      })
    );

    clearSelection();
  };

  const favoriteSelection = async () => {
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
  };

  const addSelectionToAlbum = async (albumTag: string) => {
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
  };

  const removeSelectionFromAlbum = async (albumTag: string) => {
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
            {albums && !albumKey ? (
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
      <Actionsheet isOpen={isAlbumSelectionOpen} onClose={() => setIsAlbumSelectionOpen(false)}>
        <Actionsheet.Content>
          {albums?.map((album) => (
            <Actionsheet.Item
              key={album.tag}
              onPress={() => {
                addSelectionToAlbum(album.tag);
                setIsAlbumSelectionOpen(false);
              }}
            >
              <Text>{album.name}</Text>
            </Actionsheet.Item>
          ))}
        </Actionsheet.Content>
      </Actionsheet>
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
