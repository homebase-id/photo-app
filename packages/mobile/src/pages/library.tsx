import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Dimensions, ScrollView, TouchableOpacity, View } from 'react-native';
import { Text } from '../components/ui/Text/Text';
import { Colors } from '../app/Colors';
import { RootStackParamList, TabStackParamList } from '../app/App';
import { PhotoWithLoader } from '../components/Photos/PhotoPreview/PhotoWithLoader';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { Archive, Grid, Plus, RecycleBin, SolidHearth } from '../components/ui/Icons/icons';
import { SafeAreaView } from '../components/ui/SafeAreaView/SafeAreaView';
import { Container } from '../components/ui/Container/Container';
import NewAlbumDialog from '../components/PhotoAlbum/NewAlbumDialog';
import useAlbums from '../hooks/photoLibrary/useAlbums';
import { useAlbumThumbnail } from '../hooks/photoLibrary/useAlbum';
import { useDarkMode } from '../hooks/useDarkMode';
import { AlbumDefinition, PhotoConfig } from '../provider/photos/PhotoTypes';

type LibraryProps = NativeStackScreenProps<TabStackParamList, 'Library'>;

const LibraryPage = (_props: LibraryProps) => {
  const { data: albums } = useAlbums().fetch;

  return (
    <SafeAreaView>
      <View>
        <ScrollView contentInsetAdjustmentBehavior="automatic">
          <Container>
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                margin: -4,
                paddingVertical: 15,
              }}
            >
              <TypeLink target={'favorites'} icon={<SolidHearth />}>
                Favorites
              </TypeLink>
              <TypeLink target={'archive'} icon={<Archive />}>
                Archive
              </TypeLink>
              <TypeLink target={'apps'} icon={<Grid />}>
                Apps
              </TypeLink>
              <TypeLink target={'bin'} icon={<RecycleBin />}>
                Bin
              </TypeLink>
            </View>

            <Text style={{ fontSize: 18, marginBottom: 5 }}>Albums</Text>
            <View
              style={{
                margin: -5,
                paddingVertical: 4,
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
              }}
            >
              {albums?.map((album, index) => {
                return <AlbumItem album={album} key={album.fileId ?? index} />;
              })}
              <NewAlbumItem />
            </View>
          </Container>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const TypeLink = ({
  children,
  target,
  icon,
}: {
  children: string;
  target: 'archive' | 'apps' | 'bin' | 'favorites';
  icon?: React.ReactNode;
}) => {
  const { isDarkMode } = useDarkMode();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  return (
    <View
      style={{
        width: '50%',
        padding: 4,
      }}
    >
      <TouchableOpacity
        onPress={() => navigation.navigate('Type', { typeId: target })}
        style={{
          backgroundColor: isDarkMode ? Colors.black : Colors.white,
          width: '100%',
          borderWidth: 1,
          borderColor: isDarkMode ? Colors.slate[700] : Colors.slate[200],
          borderRadius: 5,
          paddingHorizontal: 9,
          paddingVertical: 7,
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        {icon ? icon : null}
        <Text
          style={{
            fontSize: 15,
            marginLeft: icon ? 8 : undefined,
          }}
        >
          {children}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const AlbumItem = ({ album }: { album: AlbumDefinition }) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { data: thumb } = useAlbumThumbnail(album.tag).fetch;

  const windowWidth = Dimensions.get('window').width;
  const itemsPerRow = windowWidth > 500 ? 4 : 2;
  const itemWidth = Math.round(windowWidth / itemsPerRow) - 10;

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Album', { albumId: album.tag })}
      style={{ width: '50%', padding: 5 }}
    >
      {thumb?.fileId ? (
        <PhotoWithLoader
          targetDrive={PhotoConfig.PhotoDrive}
          fileId={thumb?.fileId}
          fit="cover"
          imageSize={{
            width: itemWidth,
            height: itemWidth,
          }}
          enableZoom={false}
        />
      ) : (
        <View
          style={{
            aspectRatio: 1,
            width: itemWidth,
            height: itemWidth,
            backgroundColor: Colors.slate[200],
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 100,
              transform: [{ rotate: '45deg' }],
              color: '#f1f5f9',
            }}
          >
            +
          </Text>
        </View>
      )}
      <Text style={{ paddingVertical: 4, fontSize: 16 }}>{album.name}</Text>
    </TouchableOpacity>
  );
};

const NewAlbumItem = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isDarkMode } = useDarkMode();

  const windowWidth = Dimensions.get('window').width;
  const itemsPerRow = windowWidth > 500 ? 4 : 2;
  const itemWidth = Math.round(windowWidth / itemsPerRow);

  return (
    <>
      <TouchableOpacity
        style={{
          padding: 5,
          width: itemWidth,
          height: itemWidth,
        }}
        onPress={() => setIsOpen(!isOpen)}
      >
        <View
          style={{
            width: itemWidth - 10,
            height: itemWidth - 10,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDarkMode ? Colors.slate[800] : Colors.slate[200],
          }}
        >
          <Plus size={'6xl'} color={isDarkMode ? Colors.black : Colors.white} />
        </View>
      </TouchableOpacity>
      <NewAlbumDialog isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default LibraryPage;
