import { useState } from 'react';
import { ImageStyle, Image, View, Platform, StyleSheet } from 'react-native';
import { SvgUri } from 'react-native-svg';

export const PublicAvatar = (props: {
  odinId: string;
  style?: ImageStyle;
  imageSize?: { width: number; height: number };
}) => {
  const [isSvg, setIsSvg] = useState(false);
  if (!isSvg) {
    return (
      <Image
        style={{
          ...styles.tinyLogo,
          ...props.style,
        }}
        onError={(e) => {
          console.error('Error loading image', e.nativeEvent.error);
          setIsSvg(true);
        }}
        source={{ uri: `https://${props.odinId}/pub/image` }}
      />
    );
  } else {
    return (
      <View
        style={[
          {
            ...styles.tinyLogo,
            ...props.imageSize,
            ...props.style,
          },
          // SVGs styling are not supported on Android
          Platform.OS === 'android' ? props.style : undefined,
        ]}
      >
        <SvgUri
          width={props.imageSize?.width}
          height={props.imageSize?.height}
          uri={`https://${props.odinId}/pub/image`}
          style={{ overflow: 'hidden', ...props.style }}
        />
      </View>
    );
  }
};

const styles = StyleSheet.create({
  tinyLogo: {
    objectFit: 'cover',
    marginLeft: 0,
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
});
