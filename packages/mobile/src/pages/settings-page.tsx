import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Text } from '../components/ui/Text/Text';

import { SettingsStackParamList } from '../app/App';
import {
  Download,
  Profile,
  Sync,
  Times,
  Upload,
} from '../components/ui/Icons/icons';
import { Checkbox, VStack } from 'native-base';
import { SafeAreaView } from '../components/ui/SafeAreaView/SafeAreaView';
import { Container } from '../components/ui/Container/Container';
import useDbSync from '../hooks/db/useDbSync';
import codePush from 'react-native-code-push';
import useAuth from '../hooks/auth/useAuth';
import { useKeyValueStorage } from '../hooks/auth/useEncryptedStorage';

type SettingsProps = NativeStackScreenProps<SettingsStackParamList, 'Profile'>;

const SettingsPage = (_props: SettingsProps) => {
  const { logout, getIdentity } = useAuth();
  const { cleanup } = useDbSync();
  const {
    syncFromCameraRoll,
    setSyncFromCameraRoll,
    backupFromCameraRoll,
    setBackupFromCameraRoll,
  } = useKeyValueStorage();

  const doLogout = async () => {
    await cleanup();
    logout();
  };

  const doClearLocalData = async () => {
    await cleanup();
    console.log('Local data cleared');
  };

  const doCheckForUpdate = async () => {
    codePush.sync({
      updateDialog: {},
      installMode: codePush.InstallMode.IMMEDIATE,
    });
  };

  return (
    <SafeAreaView>
      <Container>
        <VStack>
          <Text
            style={{
              fontSize: 18,
              fontWeight: 'bold',
              marginBottom: 8,
              paddingTop: 4,
            }}>
            {getIdentity()}
          </Text>
          <TouchableOpacity
            onPress={() => doLogout()}
            style={{
              display: 'flex',
              flexDirection: 'row',
              paddingVertical: 12,
            }}>
            <Profile size={'lg'} />
            <Text
              style={{
                marginLeft: 16,
              }}>
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
            }}>
            <Sync size={'lg'} />
            <Text
              style={{
                marginLeft: 16,
              }}>
              Sync with your Camera roll
            </Text>
            <View style={{ marginLeft: 'auto' }}>
              <Checkbox
                value="one"
                ml={'auto'}
                style={{ marginLeft: 'auto' }}
                isChecked={syncFromCameraRoll}
                onChange={() => setSyncFromCameraRoll(!syncFromCameraRoll)}
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
            }}>
            <Upload size={'lg'} />
            <Text
              style={{
                marginLeft: 16,
              }}>
              Backup your Camera roll
            </Text>
            <View style={{ marginLeft: 'auto' }}>
              <Checkbox
                value="one"
                ml={'auto'}
                style={{ marginLeft: 'auto' }}
                isChecked={backupFromCameraRoll}
                onChange={() => setBackupFromCameraRoll(!backupFromCameraRoll)}
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
            }}>
            <Times size={'lg'} />
            <Text
              style={{
                marginLeft: 16,
              }}>
              Clear local data
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => doCheckForUpdate()}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              width: '100%',
            }}>
            <Download size={'lg'} />
            <Text
              style={{
                marginLeft: 16,
              }}>
              Check for app updates
            </Text>
          </TouchableOpacity>
        </VStack>
      </Container>
    </SafeAreaView>
  );
};

export default SettingsPage;