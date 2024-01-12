import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, Button, View } from 'react-native';
import { Text } from '../components/ui/Text/Text';

import { SettingsStackParamList } from '../app/App';
import { SafeAreaView } from '../components/ui/SafeAreaView/SafeAreaView';
import { Container } from '../components/ui/Container/Container';
import { useKeyValueStorage } from '../hooks/auth/useEncryptedStorage';
import { useSyncFromCameraRoll } from '../hooks/cameraRoll/useSyncFromCameraRoll';

type SettingsProps = NativeStackScreenProps<SettingsStackParamList, 'Profile'>;

const dateFormat: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
};

const SyncDetailsPage = (_props: SettingsProps) => {
  const [syncNowState, setSyncNowState] = React.useState<'idle' | 'pending' | 'finished'>('idle');

  const { setSyncFromCameraRoll, syncFromCameraRoll, lastCameraRollSyncTime } =
    useKeyValueStorage();
  const { forceSync } = useSyncFromCameraRoll(false);

  const doSyncNow = async () => {
    setSyncNowState('pending');
    await forceSync();
    setSyncNowState('finished');
  };

  return (
    <SafeAreaView>
      <Container>
        <View style={{ display: 'flex', flexDirection: 'column' }}>
          {syncFromCameraRoll ? (
            <>
              <Text
                style={{
                  marginLeft: 16,
                  marginTop: 16,
                  opacity: 0.5,
                }}
              >
                {syncNowState === 'idle' ? (
                  <>
                    {lastCameraRollSyncTime ? (
                      <>
                        Last sync:{' '}
                        {new Date(parseInt(lastCameraRollSyncTime)).toLocaleString(
                          undefined,
                          dateFormat
                        )}
                      </>
                    ) : (
                      'Last sync: did not sync yet'
                    )}
                  </>
                ) : (
                  <>
                    {syncNowState === 'pending'
                      ? 'syncing'
                      : syncNowState === 'finished'
                      ? 'Last sync: Just now'
                      : null}
                  </>
                )}
              </Text>

              <Button title="Sync now" onPress={doSyncNow} />

              <View style={{ marginTop: 'auto' }}>
                <Button
                  title="Disable"
                  onPress={() =>
                    Alert.alert('Disable sync?', "You're existing photos will not be removed", [
                      {
                        text: 'Disable',
                        onPress: () => setSyncFromCameraRoll(false),
                      },
                      {
                        text: 'Cancel',
                        style: 'cancel',
                      },
                    ])
                  }
                />
              </View>
            </>
          ) : (
            <>
              <Text
                style={{
                  marginTop: 16,
                }}
              >
                Back-up all media from now forward into your identity. Your photos will remain
                secured and only acessible by you.
              </Text>
              <Button title="Enable" onPress={() => setSyncFromCameraRoll(true)} />
            </>
          )}
        </View>
      </Container>
    </SafeAreaView>
  );
};

export default SyncDetailsPage;
