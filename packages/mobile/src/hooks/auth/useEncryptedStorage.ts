import { useFocusEffect } from '@react-navigation/native';
import { useRef } from 'react';
import { MMKVLoader, useMMKVStorage } from 'react-native-mmkv-storage';

export const APP_AUTH_TOKEN = 'bx0900';
export const APP_SHARED_SECRET = 'APSS';
const PRIVATE_KEY = 'ecc-pk';
export const IDENTITY = 'identity';
export const LAST_SYNC_TIME = 'lastSyncTimeAsNumber';
export const SYNC_FROM_CAMERA_ROLL = 'syncFromCameraRollAsBoolean';
export const FORCE_LOWER_QUALITY = 'forceLowerQualityAsBoolean';
export const MIN_CONNECTION_TYPE = 'minConnectionType';
export const HEADLESS_SYNC_LOG = 'headlessSyncLog';
const LAST_LOGGED_OUT_IDENTITY = 'lastLoggedOutIdentity';

const storage = new MMKVLoader().initialize();

export const useEncrtypedStorage = () => {
  const [privateKey, setPrivateKey] = useMMKVStorage(PRIVATE_KEY, storage, '');
  const [authToken, setAuthToken] = useMMKVStorage(
    APP_AUTH_TOKEN,
    storage,
    '' //'3oYQrbm/PUGypaFr01PFuVhcfKSU56klPGr+X+u5oT4D',
  );
  const [sharedSecret, setSharedSecret] = useMMKVStorage(
    APP_SHARED_SECRET,
    storage,
    '' //'OMuqKgQgcbB8uQHzuGORmA==',
  );
  const [identity, setIdentity] = useMMKVStorage(
    IDENTITY,
    storage,
    '' //'samwisegamgee.me',
  );

  const [lastLoggedOutIdentity, setLastLoggedOutIdentity] = useMMKVStorage(
    LAST_LOGGED_OUT_IDENTITY,
    storage,
    ''
  );

  return {
    privateKey: privateKey.length ? privateKey : null,
    setPrivateKey,
    authToken: authToken.length ? authToken : null,
    setAuthToken,
    sharedSecret: sharedSecret.length ? sharedSecret : null,
    setSharedSecret,
    identity: identity.length ? identity : null,
    setIdentity,
    lastLoggedOutIdentity: lastLoggedOutIdentity.length ? lastLoggedOutIdentity : null,
    setLastLoggedOutIdentity,
  };
};

export const useKeyValueStorage = () => {
  const lastMemoryClear = useRef<number>();
  useFocusEffect(() => {
    const now = new Date().getTime();
    if (now - (lastMemoryClear.current || 0) < 1000 * 60 * 1) return;

    lastMemoryClear.current = now;
    storage.clearMemoryCache();
  });

  // Sync
  const [lastCameraRollSyncTime, setLastCameraRollSyncTime] = useMMKVStorage<number>(
    LAST_SYNC_TIME,
    storage,
    undefined
  );

  const [syncFromCameraRoll, setSyncFromCameraRoll] = useMMKVStorage<boolean>(
    SYNC_FROM_CAMERA_ROLL,
    storage,
    false
  );

  const [forceLowerQuality, setForceLowerQuality] = useMMKVStorage<boolean>(
    FORCE_LOWER_QUALITY,
    storage,
    false
  );

  const [headlessSyncLog] = useMMKVStorage<string>('headlessSyncLog', storage, '');

  return {
    lastCameraRollSyncTime,
    setLastCameraRollSyncTime,

    syncFromCameraRoll,
    setSyncFromCameraRoll,

    forceLowerQuality,
    setForceLowerQuality,

    headlessSyncLog,
  };
};
