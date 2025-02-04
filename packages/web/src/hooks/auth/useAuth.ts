import { ApiType, DotYouClient } from '@homebase-id/js-lib/core';
import { base64ToUint8Array } from '@homebase-id/js-lib/helpers';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useVerifyToken from './useVerifyToken';
import {
  logout as logoutYouauth,
  finalizeAuthentication as finalizeAuthenticationYouAuth,
  getRegistrationParams,
  preAuth as preauthApps,
  retrieveIdentity,
  saveIdentity,
  createEccPair,
  YouAuthorizationParams,
  saveEccKey,
  retrieveEccKey,
  throwAwayTheECCKey,
} from '@homebase-id/js-lib/auth';
import { DrivePermissionType } from '@homebase-id/js-lib/core';
import { REACT_QUERY_CACHE_KEY } from '../../app/App';
import { clear } from 'idb-keyval';

export const drives = [
  {
    a: '6483b7b1f71bd43eb6896c86148668cc',
    t: '2af68fe72fb84896f39f97c59d60813a',
    n: 'Photo Library',
    d: 'Place for your memories',
    p: DrivePermissionType.Read + DrivePermissionType.Write,
  },
];
export const appName = `Homebase - Photos${import.meta.env.PROD ? '' : ' (Local Dev)'}`;
export const appId = import.meta.env.PROD
  ? '32f0bdbf-017f-4fc0-8004-2d4631182d1e'
  : '107d8520-9636-4f3d-af3f-c69629c9762b'; // Local appID for different CORS host

export const APP_SHARED_SECRET = 'APSS';
export const APP_AUTH_TOKEN = 'BX0900';

const hasSharedSecret = () => {
  const raw = window.localStorage.getItem(APP_SHARED_SECRET);
  return !!raw;
};

const useAuth = () => {
  const [authenticationState, setAuthenticationState] = useState<
    'unknown' | 'anonymous' | 'authenticated'
  >(hasSharedSecret() ? 'unknown' : 'anonymous');
  const navigate = useNavigate();

  const logout = async (): Promise<void> => {
    const dotYouClient = getDotYouClient();
    if (!dotYouClient) throw Error("Can't logout without a client");
    await logoutYouauth(dotYouClient);

    localStorage.removeItem(APP_SHARED_SECRET);
    localStorage.removeItem(APP_AUTH_TOKEN);
    localStorage.removeItem(REACT_QUERY_CACHE_KEY);

    clear();
    setAuthenticationState('anonymous');

    navigate('/');
    window.location.reload();
  };

  const preauth = async (): Promise<void> => {
    const dotYouClient = getDotYouClient();
    if (!dotYouClient) throw Error("Can't preauth without a client");
    await preauthApps(dotYouClient);
  };

  const getAppAuthToken = () => window.localStorage.getItem(APP_AUTH_TOKEN);

  const getSharedSecret = () => {
    const raw = window.localStorage.getItem(APP_SHARED_SECRET);
    if (raw) return base64ToUint8Array(raw);
  };

  const getDotYouClient = () => {
    const headers: Record<string, string> = {};
    const authToken = getAppAuthToken();
    if (authToken) {
      headers['bx0900'] = authToken;
    }

    const identity = retrieveIdentity();
    if (!identity) return null;

    return new DotYouClient({
      sharedSecret: getSharedSecret(),
      api: ApiType.App,
      hostIdentity: identity,
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
    logout,
    preauth,
    getDotYouClient,
    getSharedSecret,
    getIdentity: retrieveIdentity,
    isAuthenticated: authenticationState !== 'anonymous',
  };
};

export const useYouAuthAuthorization = () => {
  const getAuthorizationParameters = async (returnUrl: string): Promise<YouAuthorizationParams> => {
    const eccKey = await createEccPair();

    // Persist key for usage on finalize
    await saveEccKey(eccKey);

    const finalizeUrl = `${window.location.origin}/auth/finalize`;
    return getRegistrationParams(
      finalizeUrl,
      appName,
      appId,
      undefined,
      undefined,
      drives,
      undefined,
      undefined,
      eccKey.publicKey,
      window.location.host,
      undefined,
      returnUrl
    );
  };

  const finalizeAuthorization = async (identity: string, publicKey: string, salt: string) => {
    try {
      const privateKey = await retrieveEccKey();
      if (!privateKey) throw new Error('Failed to retrieve key');

      const { clientAuthToken, sharedSecret } = await finalizeAuthenticationYouAuth(
        identity,
        privateKey,
        publicKey,
        salt
      );

      if (identity) saveIdentity(identity);
      localStorage.setItem(APP_SHARED_SECRET, sharedSecret);
      localStorage.setItem(APP_AUTH_TOKEN, clientAuthToken);

      throwAwayTheECCKey();
    } catch (ex) {
      console.error(ex);
      return false;
    }

    return true;
  };

  return { getAuthorizationParameters, finalizeAuthorization };
};

export default useAuth;
