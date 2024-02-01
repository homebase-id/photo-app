import { MMKVLoader, useMMKVStorage } from 'react-native-mmkv-storage';

const APP_AUTH_TOKEN = 'bx0900';
const APP_SHARED_SECRET = 'APSS';
const PRIVATE_KEY = 'ecc-pk';
const IDENTITY = 'identity';
const LAST_SYNC_TIME = 'lastSyncTime';
const SYNC_FROM_CAMERA_ROLL = 'syncFromCameraRoll';

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

  return {
    privateKey: privateKey.length ? privateKey : null,
    setPrivateKey,
    authToken: authToken.length ? authToken : null,
    setAuthToken,
    sharedSecret: sharedSecret.length ? sharedSecret : null,
    setSharedSecret,
    identity: identity.length ? identity : null,
    setIdentity,
  };
};

export const useKeyValueStorage = () => {
  // Sync
  const [lastCameraRollSyncTime, setLastCameraRollSyncTime] = useMMKVStorage(
    LAST_SYNC_TIME,
    storage,
    ''
  );

  const [syncFromCameraRoll, setSyncFromCameraRoll] = useMMKVStorage(
    SYNC_FROM_CAMERA_ROLL,
    storage,
    ''
  );

  return {
    lastCameraRollSyncTime: lastCameraRollSyncTime.length ? lastCameraRollSyncTime : null,
    setLastCameraRollSyncTime,

    syncFromCameraRoll: syncFromCameraRoll === '1',
    setSyncFromCameraRoll: (value: boolean) => setSyncFromCameraRoll(value ? '1' : '0'),
  };
};
