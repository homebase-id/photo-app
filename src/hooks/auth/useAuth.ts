import {
  ApiType,
  base64ToUint8Array,
  DotYouClient,
  uint8ArrayToBase64,
} from '@youfoundation/dotyoucore-js';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useVerifyToken from './useVerifyToken';
import {
  logout as logoutYouauth,
  authenticate as authenticateYouAuth,
} from '../../provider/AuthenticationProvider';
import { decryptWithKey } from '../../provider/KeyProvider';
import { retrieveIdentity } from '../../provider/IdentityProvider';

export const APP_SHARED_SECRET = 'APSS';
export const APP_AUTH_TOKEN = 'BX0900';

const hasSharedSecret = () => {
  const raw = window.localStorage.getItem(APP_SHARED_SECRET);
  return !!raw;
};

const splitDataString = (byteArray: Uint8Array) => {
  if (byteArray.length !== 49) {
    throw new Error("shared secret encrypted keyheader has an unexpected length, can't split");
  }

  const authToken = byteArray.slice(0, 33);
  const sharedSecret = byteArray.slice(33);

  return { authToken, sharedSecret };
};

const useAuth = () => {
  const [authenticationState, setAuthenticationState] = useState<
    'unknown' | 'anonymous' | 'authenticated'
  >(hasSharedSecret() ? 'unknown' : 'anonymous');
  const { data: hasValidToken, isFetchedAfterMount } = useVerifyToken();
  const navigate = useNavigate();

  const authenticate = (identity: string, returnUrl: string): void => {
    const strippedIdentity = identity.replace(new RegExp('^(http|https)://'), '').split('/')[0];

    authenticateYouAuth(strippedIdentity, returnUrl);
  };

  const finalizeAuthentication = async (
    registrationData: string | null,
    v: string | null,
    returnUrl: string | null
  ) => {
    if (!registrationData || !v || !returnUrl) {
      return;
    }

    if (v !== '1') {
      throw new Error('Failed to decrypt data, version unsupported');
    }

    const decryptedData = await decryptWithKey(registrationData);
    if (!decryptedData) {
      throw new Error('Failed to decrypt data');
    }
    const { authToken, sharedSecret } = splitDataString(decryptedData);

    // Store authToken and sharedSecret
    window.localStorage.setItem(APP_SHARED_SECRET, uint8ArrayToBase64(sharedSecret));
    window.localStorage.setItem(APP_AUTH_TOKEN, uint8ArrayToBase64(authToken));

    window.location.href = returnUrl;
  };

  const logout = async (): Promise<void> => {
    await logoutYouauth();

    window.localStorage.removeItem(APP_SHARED_SECRET);
    window.localStorage.removeItem(APP_AUTH_TOKEN);

    setAuthenticationState('anonymous');

    navigate('/');
    window.location.reload();
  };

  const getSharedSecret = () => {
    const raw = window.localStorage.getItem(APP_SHARED_SECRET);
    if (raw) {
      return base64ToUint8Array(raw);
    }
  };

  const getAuthToken = () => {
    const raw = window.localStorage.getItem(APP_AUTH_TOKEN);
    if (raw) {
      return base64ToUint8Array(raw);
    }
  };

  const getApiType = () => {
    return ApiType.App;
  };

  const getDotYouClient = () => {
    const headers: Record<string, string> = {};
    const authToken = window.localStorage.getItem(APP_AUTH_TOKEN);
    if (authToken) {
      headers['bx0900'] = authToken;
    }

    return new DotYouClient({
      sharedSecret: getSharedSecret(),
      api: getApiType(),
      root: retrieveIdentity(),
      headers: headers,
    });
  };

  useEffect(() => {
    if (isFetchedAfterMount && hasValidToken !== undefined) {
      setAuthenticationState(hasValidToken ? 'authenticated' : 'anonymous');

      if (!hasValidToken) {
        setAuthenticationState('anonymous');

        if (window.localStorage.getItem(APP_SHARED_SECRET)) {
          // Auth state was presumed logged in, but not allowed.. Will attempt reload page? (Browsers may ignore, as it's not a reload on user request)
          window.localStorage.removeItem(APP_SHARED_SECRET);
          window.localStorage.removeItem(APP_AUTH_TOKEN);

          window.location.reload();
        }
      }
    }
  }, [hasValidToken]);

  return {
    authenticate,
    finalizeAuthentication,
    logout,
    getDotYouClient,
    getSharedSecret,
    isAuthenticated: authenticationState !== 'anonymous',
  };
};

export default useAuth;
