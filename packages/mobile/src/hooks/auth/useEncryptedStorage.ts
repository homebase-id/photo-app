import { MMKVLoader, useMMKVStorage } from 'react-native-mmkv-storage';

export const APP_AUTH_TOKEN = 'bx0900';
export const APP_SHARED_SECRET = 'APSS';
const PRIVATE_KEY = 'ecc-pk';
export const IDENTITY = 'identity';
export const LAST_SYNC_TIME = 'lastSyncTimeAsNumber';
export const SYNC_FROM_CAMERA_ROLL = 'syncFromCameraRollAsBoolean';
export const FORCE_LOWER_QUALITY = 'forceLowerQualityAsBoolean';
export const MIN_CONNECTION_TYPE = 'minConnectionType';

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
  const [minConnectionType, setMinConnectionType] = useMMKVStorage<'METERED' | 'UNMETERED'>(
    MIN_CONNECTION_TYPE,
    storage,
    'METERED'
  );

  return {
    lastCameraRollSyncTime,
    setLastCameraRollSyncTime,

    syncFromCameraRoll,
    setSyncFromCameraRoll,

    forceLowerQuality,
    setForceLowerQuality,

    minConnectionType,
    setMinConnectionType,
  };
};
