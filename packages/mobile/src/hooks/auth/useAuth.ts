import { ApiType, DotYouClient } from '@youfoundation/js-lib/core';
import {
  base64ToUint8Array,
  byteArrayToString,
  stringToUint8Array,
  uint8ArrayToBase64,
} from '@youfoundation/js-lib/helpers';
import { useCallback, useEffect, useState } from 'react';
import useVerifyToken from './useVerifyToken';
import {
  createEccPair,
  getRegistrationParams as getRegistrationParamsYouAuth,
  finalizeAuthentication as finalizeAuthenticationYouAuth,
} from '../../provider/auth/AuthenticationProvider';
import { logout as logoutYouauth } from '@youfoundation/js-lib/auth';
import { useEncrtypedStorage } from './useEncryptedStorage';
import { Platform } from 'react-native';
import { DrivePermissionType } from '@youfoundation/js-lib/core';

export const drives = [
  {
    a: '6483b7b1f71bd43eb6896c86148668cc',
    t: '2af68fe72fb84896f39f97c59d60813a',
    n: 'Photo Library',
    d: 'Place for your memories',
    p: DrivePermissionType.Read + DrivePermissionType.Write,
  },
];
export const appName = 'Odin - Photos (Mobile App)';
// export const appId = '32f0bdbf-017f-4fc0-8004-2d4631182d1e';
export const appId = '32f0bdbf-017f-4fc0-8004-2d4431182d1e'; // Different appId to avoid clash in Host with the web version; However should this be different?

// Adapted to work in react-native; With no fallbacks to web support; If we someday merge this with the web version, we should add the fallbacks
const useAuth = () => {
  const {
    privateKey: privateKeyFromLocalStorage,
    setPrivateKey,
    sharedSecret,
    setSharedSecret,
    authToken,
    setAuthToken,
    identity,
    setIdentity,
  } = useEncrtypedStorage();

  const throwAwayTheKey = async () => await setPrivateKey('');

  const [authenticationState, setAuthenticationState] = useState<
    'unknown' | 'anonymous' | 'authenticated'
  >(sharedSecret ? 'unknown' : 'anonymous');

  const getRegistrationParams = async () => {
    const { privateKeyHex, publicKeyJwk } = await createEccPair();
    // Persist key for usage on finalize
    await setPrivateKey(JSON.stringify(privateKeyHex) + '');

    // Get params with publicKey embedded
    return await getRegistrationParamsYouAuth(
      'homebase-photos://auth/finalize/',
      appName,
      appId,
      undefined,
      undefined,
      drives,
      undefined,
      uint8ArrayToBase64(stringToUint8Array(JSON.stringify(publicKeyJwk))),
      'photos.odin.earth',
      `${
        Platform.OS === 'ios'
          ? 'iOS'
          : Platform.OS === 'android'
          ? 'Android'
          : Platform.OS
      } | ${Platform.Version}`,
    );
  };

  const finalizeAuthentication = async (
    identity: string,
    publicKey: string,
    salt: string,
  ) => {
    if (!identity || !publicKey || !salt) {
      console.error('Missing data');
      return false;
    }
    try {
      const privateKeyHex = JSON.parse(privateKeyFromLocalStorage || '');
      if (!privateKeyFromLocalStorage || !privateKeyHex) {
        console.error('Missing key');
        return false;
      }
      const publicKeyJwk = JSON.parse(
        byteArrayToString(base64ToUint8Array(publicKey)),
      );

      const { clientAuthToken, sharedSecret } =
        await finalizeAuthenticationYouAuth(
          identity,
          privateKeyHex,
          publicKeyJwk,
          salt,
        );

      await throwAwayTheKey();

      // Store all data in secure storage
      await setAuthToken(uint8ArrayToBase64(clientAuthToken));
      await setSharedSecret(uint8ArrayToBase64(sharedSecret));
      await setIdentity(identity);
    } catch (ex) {
      console.error(ex);
      return false;
    }

    return true;
  };

  const logout = useCallback(async (): Promise<void> => {
    await logoutYouauth(getDotYouClient());

    setAuthenticationState('anonymous');

    setPrivateKey('');
    setSharedSecret('');
    setAuthToken('');
    setIdentity('');
  }, []);

  const getDotYouClient = () => {
    if (!sharedSecret || !identity)
      return new DotYouClient({
        api: ApiType.App,
      });

    const headers: Record<string, string> = {};
    if (authToken) headers.bx0900 = authToken;

    return new DotYouClient({
      sharedSecret: base64ToUint8Array(sharedSecret),
      api: ApiType.App,
      identity: identity,
      headers: headers,
    });
  };

  const { data: hasValidToken, isFetchedAfterMount } = useVerifyToken(
    getDotYouClient(),
  );

  useEffect(() => {
    if (
      !!identity &&
      !!sharedSecret &&
      isFetchedAfterMount &&
      hasValidToken !== undefined
    ) {
      setAuthenticationState(hasValidToken ? 'authenticated' : 'anonymous');

      if (!hasValidToken) {
        setAuthenticationState('anonymous');
        if (sharedSecret) {
          console.log('Token is invalid, logging out..');
          logout();
        }
      }
    }
  }, [identity, sharedSecret, hasValidToken, isFetchedAfterMount, logout]);

  useEffect(() => {
    if (authenticationState === 'authenticated' && !sharedSecret)
      setAuthenticationState('anonymous');
  }, [sharedSecret, authenticationState]);

  return {
    getRegistrationParams,
    canFinzalizeAuthentication: !!privateKeyFromLocalStorage,
    finalizeAuthentication,
    logout,
    getDotYouClient,
    getSharedSecret: () => sharedSecret && base64ToUint8Array(sharedSecret),
    authToken,
    getIdentity: () => identity,
    isAuthenticated: authenticationState !== 'anonymous',
  };
};

export default useAuth;
