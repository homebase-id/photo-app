import { ApiType, DotYouClient } from '@youfoundation/js-lib/core';
import {
  base64ToUint8Array,
  byteArrayToString,
  stringToUint8Array,
  uint8ArrayToBase64,
} from '@youfoundation/js-lib/helpers';
import { useCallback, useEffect, useMemo, useState } from 'react';
import useVerifyToken from './useVerifyToken';
import {
  createEccPair,
  getRegistrationParams as getRegistrationParamsYouAuth,
  finalizeAuthentication as finalizeAuthenticationYouAuth,
} from '../../provider/auth/RNAuthenticationProvider';
import { logout as logoutYouauth } from '@youfoundation/js-lib/auth';
import { useEncrtypedStorage } from './useEncryptedStorage';
import { Platform } from 'react-native';
import { DrivePermissionType } from '@youfoundation/js-lib/core';
import { useQueryClient } from '@tanstack/react-query';

export const drives = [
  {
    a: '6483b7b1f71bd43eb6896c86148668cc',
    t: '2af68fe72fb84896f39f97c59d60813a',
    n: 'Photo Library',
    d: 'Place for your memories',
    p: DrivePermissionType.Read + DrivePermissionType.Write,
  },
];
export const permissionKeys = undefined;
export const appName = 'Homebase - Photos';
export const appId = '32f0bdbf-017f-4fc0-8004-2d4631182d1e';
export const corsHost = 'photos.homebase.id';

// Split up, just checks if the token is valid, and logs out if not
export const useValidTokenCheck = () => {
  const { getDotYouClient, logout } = useAuth();
  const dotYouClient = getDotYouClient();
  const { data: hasValidToken, isFetchedAfterMount } = useVerifyToken(dotYouClient);

  useEffect(() => {
    if (isFetchedAfterMount && hasValidToken === false) {
      console.log('Token is invalid, logging out..');
      logout();
    }
  }, [hasValidToken, isFetchedAfterMount, logout]);
};

export const useAuth = () => {
  const {
    setPrivateKey,
    sharedSecret,
    setSharedSecret,
    authToken,
    setAuthToken,
    identity,
    setIdentity,
    setLastLoggedOutIdentity,
    lastLoggedOutIdentity,
  } = useEncrtypedStorage();

  const [authenticationState, setAuthenticationState] = useState<'anonymous' | 'authenticated'>(
    sharedSecret && identity ? 'authenticated' : 'anonymous'
  );

  // In react-native, if there's a sharedSecret and identity, we assume logged in state;
  //   It's the responsibility of the `usevalidTokenCheck` to logout if it's not valid
  useEffect(
    () => setAuthenticationState(sharedSecret && identity ? 'authenticated' : 'anonymous'),
    [sharedSecret, identity]
  );

  const getDotYouClient = useCallback(() => {
    if (!sharedSecret || !identity || !authToken) {
      return new DotYouClient({
        api: ApiType.App,
      });
    }

    const headers: Record<string, string> = {};
    headers.bx0900 = authToken;

    return new DotYouClient({
      sharedSecret: base64ToUint8Array(sharedSecret),
      api: ApiType.App,
      identity: identity,
      headers: headers,
    });
  }, [authToken, identity, sharedSecret]);

  const queryClient = useQueryClient();
  const logout = useCallback(async (): Promise<void> => {
    await logoutYouauth(getDotYouClient());

    // Store last logged out identity
    if (identity) {
      setLastLoggedOutIdentity(identity);
    }

    setAuthenticationState('anonymous');

    setPrivateKey('');
    setSharedSecret('');
    setAuthToken('');
    setIdentity('');

    queryClient.removeQueries();
  }, [getDotYouClient, queryClient, setAuthToken, setIdentity, setPrivateKey, setSharedSecret]);

  return {
    logout,
    getDotYouClient,
    authToken,
    getSharedSecret: useCallback(
      () => sharedSecret && base64ToUint8Array(sharedSecret),
      [sharedSecret]
    ),
    getLastIdentity: useCallback(() => lastLoggedOutIdentity, [lastLoggedOutIdentity]),
    getIdentity: useCallback(() => identity, [identity]),
    isAuthenticated: useMemo(() => authenticationState !== 'anonymous', [authenticationState]),
  };
};

export const useYouAuthAuthorization = () => {
  const { privateKey, setPrivateKey, setSharedSecret, setAuthToken, setIdentity } =
    useEncrtypedStorage();

  const getRegistrationParams = useCallback(async () => {
    const { privateKeyHex, publicKeyJwk } = await createEccPair();
    // Persist key for usage on finalize
    setPrivateKey(JSON.stringify(privateKeyHex) + '');

    // Get params with publicKey embedded
    return await getRegistrationParamsYouAuth(
      'homebase-photos://auth/finalize/',
      appName,
      appId,
      permissionKeys,
      undefined,
      drives,
      undefined,
      uint8ArrayToBase64(stringToUint8Array(JSON.stringify(publicKeyJwk))),
      corsHost,
      `${Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : Platform.OS} | ${
        Platform.Version
      }`
    );
  }, [setPrivateKey]);

  const finalizeAuthentication = useCallback(
    async (identity: string, publicKey: string, salt: string) => {
      if (!identity || !publicKey || !salt || !privateKey) {
        console.error('Missing data');
        return false;
      }
      try {
        const privateKeyHex = JSON.parse(privateKey || '');
        if (!privateKey || !privateKeyHex) {
          console.error('Missing key');
          return false;
        }
        const publicKeyJwk = JSON.parse(byteArrayToString(base64ToUint8Array(publicKey)));

        const { clientAuthToken, sharedSecret } = await finalizeAuthenticationYouAuth(
          identity,
          privateKeyHex,
          publicKeyJwk,
          salt
        );

        // Store all data in storage
        setAuthToken(uint8ArrayToBase64(clientAuthToken));
        setSharedSecret(uint8ArrayToBase64(sharedSecret));
        setIdentity(identity);
      } catch (ex) {
        console.error(ex);
        return false;
      }

      return true;
    },
    [privateKey, setAuthToken, setIdentity, setSharedSecret]
  );

  return { getRegistrationParams, finalizeAuthentication };
};
