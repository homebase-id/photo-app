import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, TouchableOpacity, View } from 'react-native';
import { Text } from '../components/ui/Text/Text';
import { version } from '../../package.json';

import { SettingsStackParamList } from '../app/App';
import { CloudIcon, Logout, RecycleBin, Times } from '../components/ui/Icons/icons';
import CheckBox from '@react-native-community/checkbox';
import { SafeAreaView } from '../components/ui/SafeAreaView/SafeAreaView';
import { Container } from '../components/ui/Container/Container';
import { useAuth } from '../hooks/auth/useAuth';
import { useKeyValueStorage } from '../hooks/auth/useEncryptedStorage';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { useQueryClient } from '@tanstack/react-query';

type SettingsProps = NativeStackScreenProps<SettingsStackParamList, 'Profile'>;

const dateFormat: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
};

const SettingsPage = (_props: SettingsProps) => {
  const navigate = _props.navigation.navigate;
  const [logoutPending, setLogoutPending] = useState(false);
  const { logout, getIdentity } = useAuth();
  const queryClient = useQueryClient();

  const { syncFromCameraRoll, lastCameraRollSyncTime } = useKeyValueStorage();

  const doLogout = async () => {
    setLogoutPending(true);
    logout();
  };

  const doClearLocalData = async () => {
    queryClient.clear();
    console.log('Local data cleared');
  };

  return (
    <SafeAreaView>
      <Container>
        <View
          style={{ display: 'flex', height: '100%', flexDirection: 'column', paddingBottom: 12 }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: 'bold',
              marginBottom: 8,
              paddingTop: 4,
            }}
          >
            {getIdentity()}
          </Text>

          <TouchableOpacity
            onPress={() => navigate('SyncDetails')}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              width: '100%',
            }}
          >
            <CloudIcon size={'lg'} />
            <View style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Text
                style={{
                  marginLeft: 16,
                }}
              >
                Backup
              </Text>
              {syncFromCameraRoll ? (
                <Text
                  style={{
                    marginLeft: 16,
                    opacity: 0.5,
                  }}
                >
                  {lastCameraRollSyncTime ? (
                    <>
                      Last sync:{' '}
                      {new Date(lastCameraRollSyncTime).toLocaleString(undefined, dateFormat)}
                    </>
                  ) : (
                    'Last sync: not synced yet'
                  )}
                </Text>
              ) : null}
            </View>
            {syncFromCameraRoll ? (
              <View style={{ marginLeft: 'auto' }}>
                <CheckBox
                  value={syncFromCameraRoll}
                  style={{ marginLeft: 'auto' }}
                  aria-label="Sync with your camera roll"
                  disabled={syncFromCameraRoll}
                />
              </View>
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => doClearLocalData()}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              width: '100%',
            }}
          >
            <Times size={'lg'} />
            <Text
              style={{
                marginLeft: 16,
              }}
            >
              Clear local data
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => doLogout()}
            style={{
              display: 'flex',
              flexDirection: 'row',
              paddingVertical: 12,
              marginTop: 'auto',
            }}
          >
            <Logout size={'lg'} />
            <Text
              style={{
                marginLeft: 16,
              }}
            >
              Logout
            </Text>
            {logoutPending ? <ActivityIndicator style={{ marginLeft: 'auto' }} /> : null}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                'Delete your account?',
                'Your account is much more than only this app. If you want to remove your account, you can do so by going to your owner console, and requesting account deletion from there.',
                [
                  {
                    text: 'Open owner console',
                    onPress: async () => {
                      if (await InAppBrowser.isAvailable()) {
                        await InAppBrowser.open(`https://${getIdentity()}/owner/settings/delete`, {
                          enableUrlBarHiding: false,
                          enableDefaultShare: false,
                        });
                      } else Linking.openURL(`https://${getIdentity()}/owner/settings/delete`);
                    },
                  },
                  {
                    text: 'Cancel',
                    style: 'cancel',
                  },
                ]
              );
            }}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              width: '100%',
            }}
          >
            <RecycleBin size={'lg'} />
            <Text
              style={{
                marginLeft: 16,
              }}
            >
              Delete my account
            </Text>
          </TouchableOpacity>

          <VersionInfo />
        </View>
      </Container>
    </SafeAreaView>
  );
};

export const VersionInfo = () => {
  return <Text style={{ paddingTop: 10 }}>{version}</Text>;
};
export default SettingsPage;
