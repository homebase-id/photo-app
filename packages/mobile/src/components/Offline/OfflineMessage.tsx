import { useNetInfo } from '@react-native-community/netinfo';
import { Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../app/Colors';
import { useState } from 'react';
import { Times } from '../ui/Icons/icons';

const OfflineMessage = () => {
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  const netInfo = useNetInfo();
  if (isDismissed || !netInfo || netInfo.isConnected === null || netInfo.isConnected) return null;

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.red[200],
        paddingVertical: 5,
        paddingHorizontal: 2,
        flexDirection: 'row',
        zIndex: 100,
      }}
    >
      <Text style={{ fontWeight: '600' }}>You're offline</Text>
      <Text>, experience will be limited</Text>
      <TouchableOpacity
        onPress={() => setIsDismissed(true)}
        style={{
          marginLeft: 'auto',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Times />
        <Text style={{ fontWeight: '600', marginLeft: 5 }}>Dismiss</Text>
      </TouchableOpacity>
    </View>
  );
};

export default OfflineMessage;
