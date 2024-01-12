import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleProp,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Text } from '../components/ui/Text/Text';

import { version as appVersion } from '../../package.json';

import { SettingsStackParamList } from '../app/App';
import { Download, Profile, RecycleBin, Sync, Times, Upload } from '../components/ui/Icons/icons';
import CheckBox from '@react-native-community/checkbox';
import { SafeAreaView } from '../components/ui/SafeAreaView/SafeAreaView';
import { Container } from '../components/ui/Container/Container';
import codePush from 'react-native-code-push';
import useAuth from '../hooks/auth/useAuth';
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
  const { logout, getIdentity } = useAuth();
  const queryClient = useQueryClient();

  const {
    syncFromCameraRoll,
    setSyncFromCameraRoll,
    backupFromCameraRoll,
    setBackupFromCameraRoll,
    lastCameraRollSyncTime,
  } = useKeyValueStorage();

  const doLogout = async () => {
    logout();
  };

  const doClearLocalData = async () => {
    queryClient.removeQueries();
    console.log('Local data cleared');
  };

  return (
    <SafeAreaView>
      <Container>
        <View style={{ display: 'flex', flexDirection: 'column' }}>
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
            onPress={() => doLogout()}
            style={{
              display: 'flex',
              flexDirection: 'row',
              paddingVertical: 12,
            }}
          >
            <Profile size={'lg'} />
            <Text
              style={{
                marginLeft: 16,
              }}
            >
              Logout
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSyncFromCameraRoll(!syncFromCameraRoll)}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              width: '100%',
            }}
          >
            <Sync size={'lg'} />
            <View style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Text
                style={{
                  marginLeft: 16,
                }}
              >
                Sync with your Camera roll
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
                      {new Date(parseInt(lastCameraRollSyncTime)).toLocaleString(
                        undefined,
                        dateFormat
                      )}
                    </>
                  ) : (
                    'Last sync: not synced yet'
                  )}
                </Text>
              ) : null}
            </View>
            <View style={{ marginLeft: 'auto' }}>
              <CheckBox
                value={syncFromCameraRoll}
                style={{ marginLeft: 'auto' }}
                aria-label="Sync with your camera roll"
              />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setBackupFromCameraRoll(!backupFromCameraRoll)}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              width: '100%',
            }}
          >
            <Upload size={'lg'} />
            <Text
              style={{
                marginLeft: 16,
              }}
            >
              Backup your Camera roll
            </Text>
            <View style={{ marginLeft: 'auto' }}>
              <CheckBox
                value={backupFromCameraRoll}
                style={{ marginLeft: 'auto' }}
                aria-label="Backup your camera roll"
              />
            </View>
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
            onPress={() => {
              Alert.alert(
                'Delete your account?',
                'Your account is much more than only this app. If you want to remove your account, you can do so by going to your owner console, and requesting account deletion from there.',
                [
                  {
                    text: 'Open owner console',
                    onPress: async () => {
                      if (await InAppBrowser.isAvailable())
                        await InAppBrowser.open(`https://${getIdentity()}/owner/settings/delete`, {
                          enableUrlBarHiding: false,
                          enableDefaultShare: false,
                        });
                      else Linking.openURL(`https://${getIdentity()}/owner/settings/delete`);
                    },
                  },
                  {
                    text: 'Cancel',
                    onPress: () => console.log('Cancel Pressed'),
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
          <CheckForUpdates
            style={{
              alignItems: 'center',
              paddingVertical: 12,
              width: '100%',
            }}
          />
          <VersionInfo />
        </View>
      </Container>
    </SafeAreaView>
  );
};

const getVersionInfo = async () => {
  const update = await codePush.getUpdateMetadata();

  if (!update) return `v${appVersion}`;

  const label = update.label.substring(1);
  return `v${appVersion} rev.${label}`;
};

export const VersionInfo = () => {
  const [version, setVersion] = useState<string>('');

  useEffect(() => {
    getVersionInfo().then((v) => setVersion(v));
  }, []);

  return <Text style={{ paddingTop: 10 }}>{version}</Text>;
};

export const CheckForUpdates = ({
  style,
  hideIcon,
}: {
  style: StyleProp<ViewStyle>;
  hideIcon?: boolean;
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [codePushResult, setCodePushResult] = useState<codePush.SyncStatus>();
  const doCheckForUpdate = async () => {
    setIsSyncing(true);
    const state = await codePush.sync({
      updateDialog: {
        title: 'You have an update',
        optionalUpdateMessage: 'There is an update available. Do you want to install?',
        optionalIgnoreButtonLabel: 'No',
        optionalInstallButtonLabel: 'Yes',
      },
      installMode: codePush.InstallMode.IMMEDIATE,
    });
    setCodePushResult(state);
    setIsSyncing(false);
  };

  return (
    <TouchableOpacity
      onPress={() => doCheckForUpdate()}
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap: 5,
        ...(style as any),
      }}
    >
      {hideIcon ? null : <Download size={'lg'} />}
      <Text
        style={{
          marginLeft: hideIcon ? 0 : 11,
        }}
      >
        Check for app updates
      </Text>
      {isSyncing ? (
        <ActivityIndicator size="small" color="#000" style={{ marginLeft: 'auto' }} />
      ) : codePushResult !== undefined ? (
        <Text style={{ marginLeft: 'auto', fontStyle: 'italic' }}>
          {codePushResult === codePush.SyncStatus.UP_TO_DATE
            ? 'Up to date'
            : codePushResult === codePush.SyncStatus.UPDATE_INSTALLED
            ? 'Installed'
            : codePushResult === codePush.SyncStatus.SYNC_IN_PROGRESS
            ? 'Unknown'
            : null}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
};

export default SettingsPage;
