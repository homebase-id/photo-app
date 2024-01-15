import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { Alert, Button, View } from 'react-native';
import { Text } from '../components/ui/Text/Text';

import { SettingsStackParamList } from '../app/App';
import { SafeAreaView } from '../components/ui/SafeAreaView/SafeAreaView';
import { Container } from '../components/ui/Container/Container';
import { useKeyValueStorage } from '../hooks/auth/useEncryptedStorage';
import { useSyncFromCameraRoll } from '../hooks/cameraRoll/useSyncFromCameraRoll';
import { hasAndroidPermission } from '../hooks/cameraRoll/permissionHelper';

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
  const [pendingCount, setPendingCount] = React.useState<number | null>(null);

  const { setSyncFromCameraRoll, syncFromCameraRoll, lastCameraRollSyncTime } =
    useKeyValueStorage();
  const { forceSync, getWhatsPending } = useSyncFromCameraRoll(false);

  const doSyncNow = async () => {
    setSyncNowState('pending');
    await forceSync();
    setSyncNowState('finished');
  };
  const lastSyncAsInt = lastCameraRollSyncTime ? parseInt(lastCameraRollSyncTime || '') : null;

  useEffect(() => {
    (async () => setPendingCount(await getWhatsPending()))();
  }, [getWhatsPending]);

  useEffect(() => {
    (async () => {
      hasAndroidPermission();
    })();
  }, []);

  return (
    <SafeAreaView>
      <Container>
        <View style={{ display: 'flex', flexDirection: 'column' }}>
          {syncFromCameraRoll ? (
            <>
              <View
                style={{
                  marginLeft: 16,
                  marginTop: 16,
                  opacity: 0.5,
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <Text>
                  {syncNowState === 'idle' ? (
                    <>
                      {lastSyncAsInt ? (
                        <>
                          Last sync: {new Date(lastSyncAsInt).toLocaleString(undefined, dateFormat)}
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
                <Text>
                  {pendingCount === 0
                    ? 'All your photos are safe and secure on your identity'
                    : `Pending: ${pendingCount}`}
                </Text>
              </View>

              <View
                style={{
                  marginTop: 'auto',
                  paddingTop: 50,
                  flexDirection: 'row-reverse',
                  justifyContent: 'space-between',
                }}
              >
                <Button title="Sync now" onPress={doSyncNow} />
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
