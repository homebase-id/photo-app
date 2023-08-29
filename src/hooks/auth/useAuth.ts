import { ApiType, DotYouClient } from '@youfoundation/js-lib/core';
import { base64ToUint8Array } from '@youfoundation/js-lib/helpers';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useVerifyToken from './useVerifyToken';
import {
  logout as logoutYouauth,
  finalizeAuthentication as finalizeAuthenticationYouAuth,
  APP_AUTH_TOKEN,
  APP_SHARED_SECRET,
  getRegistrationParams,
  preAuth as preauthApps,
  retrieveIdentity,
  retrieveKey,
  createPair,
  saveKey,
  throwAwayTheKey,
} from '@youfoundation/js-lib/auth';

export const drives = [
  {
    a: '6483b7b1f71bd43eb6896c86148668cc',
    t: '2af68fe72fb84896f39f97c59d60813a',
    n: 'Photo Library',
    d: 'Place for your memories',
    p: 3,
  },
];
export const appName = 'Odin - Photos';
export const appId = '32f0bdbf-017f-4fc0-8004-2d4631182d1e';

const hasSharedSecret = () => {
  const raw = window.localStorage.getItem(APP_SHARED_SECRET);
  return !!raw;
};

const useAuth = () => {
  const [authenticationState, setAuthenticationState] = useState<
    'unknown' | 'anonymous' | 'authenticated'
  >(hasSharedSecret() ? 'unknown' : 'anonymous');
  const navigate = useNavigate();

  const finalizeAuthentication = async (
    registrationData: string | null,
    v: string | null,
    identity: string | null
  ) => {
    if (!registrationData || !v) {
      console.error('Missing data');
      return false;
    }
    const privateKey = await retrieveKey();
    if (!privateKey) {
      console.error('Missing key');
      return false;
    }

    try {
      await finalizeAuthenticationYouAuth(registrationData, v, identity, privateKey);

      // Remove key
      throwAwayTheKey();
    } catch (ex) {
      console.error(ex);
      return false;
    }

    return true;
  };

  const logout = async (): Promise<void> => {
    await logoutYouauth(getDotYouClient());

    setAuthenticationState('anonymous');

    navigate('/');
    window.location.reload();
  };

  const preauth = async (): Promise<void> => {
    await preauthApps();
  };

  const getSharedSecret = () => {
    const raw = window.localStorage.getItem(APP_SHARED_SECRET);
    if (raw) {
      return base64ToUint8Array(raw);
    }
  };

  const getDotYouClient = () => {
    const headers: Record<string, string> = {};
    const authToken = window.localStorage.getItem(APP_AUTH_TOKEN);
    if (authToken) {
      headers['bx0900'] = authToken;
    }

    return new DotYouClient({
      sharedSecret: getSharedSecret(),
      api: ApiType.App,
      identity: retrieveIdentity(),
      headers: headers,
    });
  };

  const { data: hasValidToken, isFetchedAfterMount } = useVerifyToken(getDotYouClient());

  useEffect(() => {
    if (isFetchedAfterMount && hasValidToken !== undefined) {
      setAuthenticationState(hasValidToken ? 'authenticated' : 'anonymous');

      if (!hasValidToken) {
        setAuthenticationState('anonymous');
        if (window.localStorage.getItem(APP_SHARED_SECRET)) {
          console.log('Token is invalid, logging out..');
          // Auth state was presumed logged in, but not allowed.. Will attempt reload page?
          //  (Browsers may ignore, as it's not a reload on user request)
          logout();
        }
      }
    }
  }, [hasValidToken]);

  return {
    getRegistrationParams: async (returnUrl: string) => {
      const key = await createPair();
      if (!key) throw new Error('Failed to retrieve key');

      // Persist key for usage on finalize
      await saveKey(key);

      // Get params with publicKey embedded
      return await getRegistrationParams(
        `${window.location.origin}/auth/finalize?returnUrl=${encodeURIComponent(returnUrl)}`,
        appName,
        appId,
        drives,
        key.publicKey,
        window.location.host
      );
    },
    finalizeAuthentication,
    logout,
    preauth,
    getDotYouClient,
    getSharedSecret,
    getIdentity: retrieveIdentity,
    isAuthenticated: authenticationState !== 'anonymous',
  };
};

export default useAuth;
